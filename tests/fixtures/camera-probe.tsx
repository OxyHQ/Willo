import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { mock } from 'bun:test';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OxyServices } from '@oxy.so/core';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].startsWith('react-test-renderer is deprecated'))
    return;
  originalError(...args);
};
mock.module('react-native', () => ({ Platform: { OS: 'web' } }));
let arrived: (() => void) | undefined;
let release: (() => void) | undefined;
const arrivedAtServer = new Promise<void>((resolve) => {
  arrived = resolve;
});
const accountRequests: string[] = [];
const server = createServer(async (req, res) => {
  const encoded = req.headers.authorization?.split('.')[1];
  assert.ok(encoded);
  const { userId } = JSON.parse(Buffer.from(encoded, 'base64url').toString());
  accountRequests.push(userId);
  res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'private, no-store' });
  if (req.url === '/held' && userId === 'A') {
    res.write('old-');
    arrived?.();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
  }
  res.end(userId);
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert.ok(address && typeof address !== 'string');
const origin = `http://127.0.0.1:${address.port}`;
const oxy = new OxyServices({ baseURL: origin });
const linked = oxy.createLinkedClient({ baseURL: origin });
function token(userId: string) {
  return `e30.${Buffer.from(JSON.stringify({ userId, sessionId: userId, exp: 2_000_000_000 })).toString('base64url')}.fixture`;
}
oxy.session.setAccessToken(token('A'));
const context = {
  sessionEpoch: oxy.http.getSessionEpoch(),
  fetchSnapshot: async (url: string, signal: AbortSignal) =>
    (await linked.fetch(url, { signal })).blob(),
};
mock.module(
  fileURLToPath(new URL('../../packages/frontend/state/home-context.tsx', import.meta.url)),
  () => ({ useHomeActions: () => context }),
);
const { useCameraSnapshot } = await import('../../packages/frontend/hooks/use-camera-snapshot');
const created = new Map<string, Blob>();
const revoked: string[] = [];
const createURL = URL.createObjectURL;
const revokeURL = URL.revokeObjectURL;
URL.createObjectURL = (blob: Blob) => {
  const uri = createURL(blob);
  created.set(uri, blob);
  return uri;
};
URL.revokeObjectURL = (uri: string) => {
  revoked.push(uri);
  revokeURL(uri);
};
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
let uri: string | undefined;
function Probe({ url }: { url: string | null }) {
  uri = useCameraSnapshot(url);
  return null;
}
function tree(url: string | null) {
  return (
    <QueryClientProvider client={queryClient}>
      <Probe url={url} />
    </QueryClientProvider>
  );
}
let renderer: TestRenderer.ReactTestRenderer | undefined;
async function waitFor(predicate: () => boolean) {
  for (let attempt = 0; attempt < 100 && !predicate(); attempt++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  assert.ok(predicate(), 'Camera did not settle');
}
try {
  await act(async () => {
    renderer = TestRenderer.create(tree(`${origin}/camera`));
  });
  await waitFor(() => Boolean(uri));
  const first = uri;
  assert.ok(first);
  assert.equal(await created.get(first)?.text(), 'A');
  await act(async () => {
    renderer?.update(tree(null));
  });
  assert.equal(uri, undefined);
  assert.ok(revoked.includes(first));

  await act(async () => {
    renderer?.update(tree(`${origin}/held`));
  });
  await arrivedAtServer;
  oxy.session.setAccessToken(token('B'));
  context.sessionEpoch = oxy.http.getSessionEpoch();
  await act(async () => {
    renderer?.update(tree(`${origin}/held`));
  });
  await waitFor(() => Boolean(uri));
  const second = uri;
  assert.ok(second);
  assert.equal(await created.get(second)?.text(), 'B');
  release?.();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  assert.equal(uri, second);
  await act(async () => {
    renderer?.unmount();
  });
  assert.ok(revoked.includes(second));
  assert.equal(created.size, 2);
  assert.deepEqual(accountRequests, ['A', 'A', 'B']);
  process.stdout.write('WILLO_CAMERA_OK\n');
} finally {
  release?.();
  queryClient.clear();
  linked.dispose();
  oxy.dispose();
  URL.createObjectURL = createURL;
  URL.revokeObjectURL = revokeURL;
  console.error = originalError;
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
