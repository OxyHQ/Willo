/**
 * The tunnel's two credential-less routes share a tight per-address budget;
 * everything else gets the app-wide limit. No database and no Oxy call: the
 * requests carry no bearer, and every one either fails validation or is
 * refused by the limiter before a handler reads anything.
 */

import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createServer, type Server as HttpServer } from 'node:http';
import { OxyServer } from '@oxy.so/core/server';
import { createApp } from '../app';
import { inertTraffic } from './fixtures/inertTraffic';

let server: HttpServer;
let oxy: OxyServer;
let origin = '';

beforeAll(async () => {
  // Never reached: no request below carries an Oxy bearer.
  oxy = new OxyServer({ baseURL: 'http://127.0.0.1:1' });
  server = createServer(createApp(oxy, inertTraffic));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address');
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  oxy.dispose();
});

test('pairing and claiming share ten attempts per address, then answer 429 in the error envelope', async () => {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const response = await fetch(`${origin}/tunnel/pair`, { method: 'POST' });
    expect(response.status).toBe(400);
  }

  const pair = await fetch(`${origin}/tunnel/pair`, { method: 'POST' });
  expect(pair.status).toBe(429);
  const body = (await pair.json()) as { error: { code: string } };
  expect(body.error.code).toBe('rate_limited');

  // The same budget: a stranger cannot switch routes to keep going.
  const claim = await fetch(`${origin}/tunnel/claim`, { method: 'POST' });
  expect(claim.status).toBe(429);

  // A device polling with its claim token is not part of that budget, and the
  // app-wide limit (600 per window for an anonymous address) still applies.
  const status = await fetch(`${origin}/tunnel/claim/status`);
  expect(status.status).toBe(401);
  expect(status.headers.get('ratelimit-limit')).toBe('600');
  expect(await status.json()).toEqual({
    error: { code: 'unauthorized', message: 'A Bearer claim token is required.' },
  });
});
