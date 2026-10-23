import { expect, test } from 'bun:test';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { OxyServices } from '@oxy.so/core';
import { createWilloTunnelProvider } from '../packages/frontend/providers/willo-tunnel';

const fixtureExpiry = Math.floor(Date.now() / 1000) + 300;
function token(account: string, nonce = 'initial'): string {
  return `e30.${Buffer.from(JSON.stringify({ userId: account, sessionId: account, exp: fixtureExpiry, nonce })).toString('base64url')}.fixture`;
}

test('Willo uses shared refresh for its own REST and fresh socket credentials, then disconnects on account change', async () => {
  const received: Array<{ path: string; token: string | undefined }> = [];
  const handshakes: string[] = [];
  let receivedCommand: (() => void) | undefined;
  const commandArrived = new Promise<void>((resolve) => {
    receivedCommand = resolve;
  });
  const server = createServer((request, response) => {
    received.push({ path: request.url ?? '', token: request.headers.authorization });
    expect(request.headers.cookie).toBeUndefined();
    if (request.headers.authorization === `Bearer ${token('A')}`) {
      response.writeHead(401);
      response.end('{}');
      return;
    }
    if (request.url?.endsWith('/command')) {
      response.writeHead(202);
      response.end('{}');
      receivedCommand?.();
      return;
    }
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        connected: true,
        paired: true,
        devices: [],
        homeName: 'A home',
        unitSystem: 'metric',
      }),
    );
  });
  const io = new Server(server);
  const homes = io.of('/homes');
  homes.on('connection', (socket) => {
    handshakes.push(socket.handshake.auth.token);
    socket.on('home:join', (_input, callback) => callback({ ok: true }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address');
  const baseURL = `http://127.0.0.1:${address.port}`;
  const oxy = new OxyServices({ baseURL });
  oxy.session.setAccessToken(token('A'));
  oxy.http.setAuthRefreshHandler(async () => token('A', 'renewed'));
  const linked = oxy.createLinkedClient({ baseURL });
  const provider = createWilloTunnelProvider({
    apiBaseUrl: baseURL,
    homeId: 'home-A',
    fetch: linked.fetch,
    session: oxy.http,
    onConnectionChange: () => {},
    onHomeName: () => {},
    onUnitSystem: () => {},
    onPaired: () => {},
  });
  try {
    expect(await provider.connect()).toEqual([]);
    expect(handshakes).toEqual([token('A', 'renewed')]);
    expect(received.slice(0, 2).map((request) => request.token)).toEqual([
      `Bearer ${token('A')}`,
      `Bearer ${token('A', 'renewed')}`,
    ]);
    provider.sendCommand('light.fixture', { kind: 'setOnOff', on: true });
    await commandArrived;
    expect(received.at(-1)?.token).toBe(`Bearer ${token('A', 'renewed')}`);
    const disconnected = new Promise<void>((resolve) => {
      for (const socket of homes.sockets.values()) socket.once('disconnect', () => resolve());
    });
    oxy.session.setAccessToken(token('B'));
    await disconnected;
    const count = received.length;
    provider.sendCommand('light.fixture', { kind: 'setOnOff', on: false });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toHaveLength(count);
    expect(homes.sockets.size).toBe(0);
  } finally {
    provider.disconnect();
    linked.dispose();
    oxy.dispose();
    await new Promise<void>((resolve) => io.close(() => resolve()));
  }
});
