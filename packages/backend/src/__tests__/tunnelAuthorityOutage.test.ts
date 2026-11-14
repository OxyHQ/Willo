import { expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createServer, type Server as HttpServer } from 'node:http';
import { OxyServer } from '@oxy.so/core/server';
import { eq } from 'drizzle-orm';
import { Server } from 'socket.io';
import { io as connectSocket, type Socket } from 'socket.io-client';
import { createApp } from '../app';
import { closePostgres, connectPostgres } from '../db/postgres';
import { homeConnections, homes } from '../db/schema';
import { createTunnelNamespace } from '../realtime/tunnelNamespace';
import { sendCommand } from '../realtime/tunnelRegistry';
import { inertTraffic } from './fixtures/inertTraffic';

async function listen(server: HttpServer): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address');
  return `http://127.0.0.1:${address.port}`;
}

it('keeps the integration tunnel usable during an Oxy authority outage', async () => {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
  if (
    !['127.0.0.1', 'localhost', '[::1]'].includes(databaseUrl.hostname) ||
    !/_(test|probe)$/.test(databaseUrl.pathname)
  ) {
    throw new Error('This test requires a local test database');
  }
  let authorityCalls = 0;
  const authority = createServer((_request, response) => {
    authorityCalls += 1;
    response.writeHead(503).end();
  });
  const authorityUrl = await listen(authority);
  const oxy = new OxyServer({ baseURL: authorityUrl });
  const app = createApp(oxy, inertTraffic);
  const server = createServer(app);
  const io = new Server(server);
  createTunnelNamespace(io, inertTraffic);
  const origin = await listen(server);
  const secret = 'local-test-tunnel-secret';
  let socket: Socket | undefined;
  let invalidSocket: Socket | undefined;
  let db: Awaited<ReturnType<typeof connectPostgres>> | undefined;
  let homeId: string | undefined;
  try {
    db = await connectPostgres();
    const [home] = await db.insert(homes).values({ name: 'Tunnel fixture' }).returning();
    if (!home) throw new Error('Failed to create fixture Home');
    homeId = home.id;
    await db.insert(homeConnections).values({
      homeId: home.id,
      provider: 'home_assistant',
      tunnelSecretHash: createHash('sha256').update(secret).digest('hex'),
    });
    const payload = {
      userId: 'local-user',
      sessionId: 'local-session',
      exp: Math.floor(Date.now() / 1000) + 300,
    };
    const bearer = `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.fixture`;
    const response = await fetch(`${origin}/homes/me`, {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    expect(response.status).toBe(503);
    expect(authorityCalls).toBeGreaterThan(0);
    const callsAfterOutage = authorityCalls;

    invalidSocket = connectSocket(`${origin}/tunnel`, {
      auth: { homeId: home.id, secret: 'wrong-local-secret' },
      transports: ['websocket'],
      reconnection: false,
    });
    const [denied] = await once(invalidSocket, 'connect_error', {
      signal: AbortSignal.timeout(5000),
    });
    expect(denied).toBeInstanceOf(Error);
    invalidSocket.disconnect();

    socket = connectSocket(`${origin}/tunnel`, {
      auth: { homeId: home.id, secret },
      transports: ['websocket'],
      reconnection: false,
    });
    await once(socket, 'connect', { signal: AbortSignal.timeout(5000) });
    const command = {
      domain: 'light',
      service: 'turn_on',
      entityId: 'light.fixture',
      serviceData: {},
    };
    const received = once(socket, 'call_service', { signal: AbortSignal.timeout(5000) });
    sendCommand(home.id, command);
    expect((await received)[0]).toEqual(command);
    expect(authorityCalls).toBe(callsAfterOutage);
  } finally {
    invalidSocket?.disconnect();
    socket?.disconnect();
    await new Promise<void>((resolve) => io.close(() => resolve()));
    if (db && homeId) await db.delete(homes).where(eq(homes.id, homeId));
    if (db) await closePostgres();
    oxy.dispose();
    await new Promise<void>((resolve) => authority.close(() => resolve()));
  }
}, 35000);
