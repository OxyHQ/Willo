import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { connectPostgres } from './db/postgres';
import { createApp, createOxyClient } from './app';
import { createHomesNamespace } from './realtime/homesNamespace';

async function main(): Promise<void> {
  await connectPostgres();

  const oxy = createOxyClient();
  const app = createApp(oxy);
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: { origin: config.corsOrigins, credentials: true },
  });
  createHomesNamespace(io, oxy);

  server.listen(config.port, () => {
    console.log(`Willo backend listening on port ${config.port}`);
  });
}

main().catch((error: unknown) => {
  console.error('Willo backend failed to start:', error);
  process.exitCode = 1;
});
