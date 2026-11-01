import { mock } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
process.env.EXPO_PUBLIC_OXY_CLIENT_ID = 'fixture';
const config = require('../../packages/frame/app.config.js');
const reports: Record<string, unknown> = {};
let finish: (() => void) | undefined;
const received = new Promise<void>((resolve) => {
  finish = resolve;
});
const client = {
  fetch: async (url: string, options?: RequestInit) => {
    if (url.endsWith('/frames/me') && !options) return new Response(null, { status: 404 });
    if (url.endsWith('/homes/me')) return Response.json([{ home: { id: 'home', name: 'Home' } }]);
    if (url.endsWith('/homes/home/frames') || url.endsWith('/frames/me/heartbeat')) {
      reports[url.endsWith('/heartbeat') ? 'heartbeat' : 'registration'] = JSON.parse(
        String(options?.body),
      );
      if (reports.heartbeat && reports.registration) finish?.();
      return Response.json({ id: 'frame' });
    }
    throw new Error(`Unexpected request ${url}`);
  },
};
mock.module('react-native', () => ({ Platform: { OS: 'web' } }));
mock.module('@oxy.so/services/ui/client', () => ({
  useOxy: () => ({
    sessions: [{ sessionId: 'session', deviceId: 'device' }],
    activeSessionId: 'session',
    oxyServices: { createLinkedClient: () => client },
  }),
}));
mock.module('../../packages/frame/lib/fps', () => ({ measureFps: async () => 60 }));
const { useFrameSession, useHeartbeat } = await import('../../packages/frame/lib/willo');
function Probe() {
  useFrameSession('Frame');
  useHeartbeat('frame');
  return null;
}
const queries = new QueryClient({ defaultOptions: { queries: { retry: false } } });
let renderer: ReturnType<typeof create> | undefined;
await act(async () => {
  renderer = create(createElement(QueryClientProvider, { client: queries }, createElement(Probe)));
});
await act(async () => {
  await received;
});
for (const report of Object.values(reports)) {
  if ((report as { appVersion: string }).appVersion !== config.expo.version) {
    throw new Error('Frame report does not match Expo app version');
  }
}
await act(async () => renderer?.unmount());
queries.clear();
