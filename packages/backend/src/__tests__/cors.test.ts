/**
 * Which browsers may call Willo with a user's session: Willo's own sites, their
 * dev servers and Oxy's own HTTPS family, and nothing else. Driven through the
 * real app with a real preflight, the request a browser sends before an
 * authenticated `fetch`. No database and no Oxy call: a preflight carries no
 * bearer and is answered before any route.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createServer, type Server as HttpServer } from 'node:http';
import { OxyServer } from '@oxy.so/core/server';

// The variable this list replaced. A deploy that still sets it must not widen
// what the code admits; set before the app is imported so a regression that
// reads it again would see it.
process.env.CORS_ORIGINS = 'https://leftover.example';

let server: HttpServer;
let oxy: OxyServer;
let baseUrl = '';

beforeAll(async () => {
  const { createApp } = await import('../app');
  // Never reached: a preflight carries no Oxy bearer.
  oxy = new OxyServer({ baseURL: 'http://127.0.0.1:1' });
  server = createServer(createApp(oxy));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  oxy.dispose();
});

function preflight(origin: string): Promise<Response> {
  return fetch(`${baseUrl}/homes`, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization',
    },
  });
}

describe('an admitted origin gets its exact origin back, with credentials', () => {
  for (const origin of [
    'https://willo.sh',
    'https://frame.willo.sh',
    'http://localhost:19006',
    'http://localhost:19016',
    'https://accounts.oxy.so',
  ]) {
    test(origin, async () => {
      const response = await preflight(origin);
      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-origin')).toBe(origin);
      expect(response.headers.get('access-control-allow-credentials')).toBe('true');
    });
  }
});

describe('any other origin gets no CORS grant at all', () => {
  for (const origin of [
    'https://evil.example',
    'https://leftover.example',
    'http://willo.sh',
    'https://www.willo.sh',
    'https://willo.sh.evil.example',
    'https://evilwillo.sh',
    'http://localhost:8081',
    'null',
  ]) {
    test(origin, async () => {
      const response = await preflight(origin);
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
      expect(response.headers.get('access-control-allow-credentials')).toBeNull();
    });
  }
});
