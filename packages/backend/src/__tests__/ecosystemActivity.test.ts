/**
 * `ecosystemActivity`'s credential gate and lifecycle. Mirrors the standing
 * test every sibling backend (CrowdSource, Nilo, tnp, …) carries for this
 * same module: the ONLY thing that turns publishing on is both
 * `OXY_SERVICE_API_KEY` and `OXY_SERVICE_API_SECRET` being present and
 * non-blank — there is no separate enable flag that could fall out of sync
 * with it.
 *
 * Uses `bun:test`'s `mock.module` rather than this repo's usual `node:test` +
 * `node:assert` (see the `services/__tests__` suites) because those run
 * against a real Postgres and need no module mocking at all; this module
 * needs `@oxy.so/core/server`'s `createEcosystemTraffic` replaced so no test
 * here ever opens a real connection to Oxy.
 */
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import * as realOxyServer from '@oxy.so/core/server';
import {
  ecosystemActivityMiddleware,
  observeEcosystemSocket,
  startEcosystemActivity,
  stopEcosystemActivity,
} from '../ecosystemActivity';

const publisher = {
  observeHttp: mock((_req: unknown, _res: unknown, next: () => void) => next()),
  installFetch: mock(() => {}),
  observeSocket: mock(() => {}),
  stop: mock(async () => {}),
};
const createEcosystemTraffic = mock((_options: unknown) => publisher);

// `ecosystemActivity` calls `createEcosystemTraffic` lazily inside
// `startEcosystemActivity`, not at module load, so patching the registry
// here — after the static imports above have already resolved — still takes
// effect for every call the tests below make. Spread the real module rather
// than replacing it outright: a wholesale replacement would drop every other
// `@oxy.so/core/server` export (createOxyAuthMiddleware, createOxyCors) and
// break any other test file that imports them in the same process.
mock.module('@oxy.so/core/server', () => ({
  ...realOxyServer,
  createEcosystemTraffic,
}));

const ORIGINAL_KEY = process.env.OXY_SERVICE_API_KEY;
const ORIGINAL_SECRET = process.env.OXY_SERVICE_API_SECRET;

function setCredentials(key: string | undefined, secret: string | undefined): void {
  if (key === undefined) delete process.env.OXY_SERVICE_API_KEY;
  else process.env.OXY_SERVICE_API_KEY = key;
  if (secret === undefined) delete process.env.OXY_SERVICE_API_SECRET;
  else process.env.OXY_SERVICE_API_SECRET = secret;
}

describe('ecosystem activity lifecycle', () => {
  beforeEach(() => {
    setCredentials('test-key', 'test-secret');
    createEcosystemTraffic.mockClear();
    publisher.observeHttp.mockClear();
    publisher.installFetch.mockClear();
    publisher.observeSocket.mockClear();
    publisher.stop.mockClear();
  });

  afterEach(async () => {
    await stopEcosystemActivity();
    setCredentials(ORIGINAL_KEY, ORIGINAL_SECRET);
  });

  it('does not start when the API key is missing', () => {
    setCredentials(undefined, 'test-secret');
    startEcosystemActivity(() => true);
    expect(createEcosystemTraffic).not.toHaveBeenCalled();

    const next = mock(() => {});
    ecosystemActivityMiddleware({} as never, {} as never, next);
    expect(next).toHaveBeenCalledTimes(1);

    observeEcosystemSocket({} as never);
    expect(publisher.observeSocket).not.toHaveBeenCalled();
  });

  it('does not start when the API secret is missing', () => {
    setCredentials('test-key', undefined);
    startEcosystemActivity(() => true);
    expect(createEcosystemTraffic).not.toHaveBeenCalled();
  });

  it('treats a blank credential the same as an absent one', () => {
    setCredentials('   ', 'test-secret');
    startEcosystemActivity(() => true);
    expect(createEcosystemTraffic).not.toHaveBeenCalled();
  });

  it('starts once, wires the middleware and socket observer, and stops cleanly', async () => {
    let ready = false;
    startEcosystemActivity(() => ready);
    startEcosystemActivity(() => ready); // second call is a no-op — only one publisher
    expect(createEcosystemTraffic).toHaveBeenCalledTimes(1);
    expect(publisher.installFetch).toHaveBeenCalledTimes(1);

    const options = createEcosystemTraffic.mock.calls[0]?.[0] as { service: string; ready(): boolean };
    expect(options.service).toBe('willo');
    expect(options.ready()).toBe(false);
    ready = true;
    expect(options.ready()).toBe(true);

    const next = mock(() => {});
    ecosystemActivityMiddleware({} as never, {} as never, next);
    expect(publisher.observeHttp).toHaveBeenCalledTimes(1);

    const socket = {} as never;
    observeEcosystemSocket(socket);
    expect(publisher.observeSocket).toHaveBeenCalledWith(socket);

    await stopEcosystemActivity();
    await stopEcosystemActivity(); // second call is a no-op
    expect(publisher.stop).toHaveBeenCalledTimes(1);

    // Once stopped, requests pass straight through instead of erroring.
    const nextAfterStop = mock(() => {});
    ecosystemActivityMiddleware({} as never, {} as never, nextAfterStop);
    expect(nextAfterStop).toHaveBeenCalledTimes(1);
    expect(publisher.observeHttp).toHaveBeenCalledTimes(1);
  });
});
