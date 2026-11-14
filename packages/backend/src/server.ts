import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createOxySocketCors, startEcosystemTraffic } from '@oxy.so/core/server';
import { createAwsWorkloadCredentialProvider } from '@oxy.so/core/server/aws';
import { config } from './config';
import { connectPostgres } from './db/postgres';
import { createApp, createOxyClient } from './app';
import { createHomesNamespace } from './realtime/homesNamespace';
import { createTunnelNamespace } from './realtime/tunnelNamespace';
import { WILLO_APP_ORIGINS } from './origins';

async function main(): Promise<void> {
  await connectPostgres();

  // Started at bootstrap, never while constructing an app in a test. Publishes where
  // an AWS region is configured (ECS sets one), or as `OXY_ECOSYSTEM_ACTIVITY_ENABLED`
  // says; a misconfiguration throws and fails the start. The heartbeat reports
  // `online` once listening.
  let isReady = false;
  const traffic = startEcosystemTraffic({
    service: 'willo',
    baseURL: config.oxyApiUrl,
    workloadCredentials: createAwsWorkloadCredentialProvider(),
    ready: () => isReady,
  });

  const oxy = createOxyClient();
  const app = createApp(oxy, traffic);
  const server = http.createServer(app);

  // The same origin rule as `createOxyCors` in `createApp`, from the same list,
  // on polling AND on the WebSocket handshake (which CORS alone never checks).
  // A client with no Origin (the Home Assistant integration, a native frame)
  // is admitted, as it is over HTTP.
  const io = new SocketIOServer(
    server,
    createOxySocketCors({ appOrigins: [...WILLO_APP_ORIGINS] }),
  );
  createHomesNamespace(io, oxy, traffic);
  createTunnelNamespace(io, traffic);

  server.listen(config.port, () => {
    isReady = true;
    console.log(`Willo backend listening on port ${config.port}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    // The heartbeat stops claiming `online` the moment the task starts draining.
    isReady = false;
    console.log(`Received ${signal}. Starting graceful shutdown...`);

    // Force-exit if close hangs (a stuck connection, a publisher that never
    // resolves `stop()`) rather than leaving the ECS task to be killed cold.
    const forceExit = setTimeout(() => {
      console.error('Force exit after 30s grace period');
      process.exit(1);
    }, 30_000);
    forceExit.unref();

    server.close(() => {
      io.close(() => {
        traffic
          .stop()
          .then(() => {
            clearTimeout(forceExit);
            console.log('Graceful shutdown complete');
            process.exit(0);
          })
          .catch((error: unknown) => {
            console.error('Error during shutdown:', error);
            process.exit(1);
          });
      });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  console.error('Willo backend failed to start:', error);
  process.exitCode = 1;
});
