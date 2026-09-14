import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { connectPostgres } from './db/postgres';
import { createApp, createOxyClient } from './app';
import { createHomesNamespace } from './realtime/homesNamespace';
import { startEcosystemActivity, stopEcosystemActivity } from './ecosystemActivity';

async function main(): Promise<void> {
  await connectPostgres();

  // Started before `createApp` so the readiness flag exists ahead of time;
  // `ecosystemActivityMiddleware` (mounted inside createApp) reads the
  // module-level publisher lazily on each request, so the ORDER of these two
  // calls has no effect on correctness either way.
  let isReady = false;
  startEcosystemActivity(() => isReady);

  const oxy = createOxyClient();
  const app = createApp(oxy);
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: { origin: config.corsOrigins, credentials: true },
  });
  createHomesNamespace(io, oxy);

  server.listen(config.port, () => {
    isReady = true;
    console.log(`Willo backend listening on port ${config.port}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
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
        stopEcosystemActivity()
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
