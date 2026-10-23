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

mock.module('@oxy.so/core/server', () => ({
  ...realOxyServer,
  createEcosystemTraffic,
}));

describe('ecosystem activity lifecycle', () => {
  beforeEach(() => {
    createEcosystemTraffic.mockClear();
    createEcosystemTraffic.mockImplementation((_options: unknown) => publisher);
    publisher.observeHttp.mockClear();
    publisher.installFetch.mockClear();
    publisher.observeSocket.mockClear();
    publisher.stop.mockClear();
  });

  afterEach(async () => {
    await stopEcosystemActivity();
  });

  it('starts with a lazy temporary credential provider, including outside ECS', () => {
    startEcosystemActivity(() => true);
    expect(createEcosystemTraffic).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'willo',
        workloadCredentials: expect.any(Function),
      }),
    );
    expect(publisher.installFetch).toHaveBeenCalledTimes(1);
  });

  it('keeps serving without a publisher when the publisher cannot be constructed', () => {
    createEcosystemTraffic.mockImplementation(() => {
      throw new Error(
        'Ecosystem activity requires a known infrastructure region or explicit location',
      );
    });
    const consoleError = console.error;
    const errorLog = mock((..._args: unknown[]) => {});
    console.error = errorLog;
    try {
      expect(() => startEcosystemActivity(() => true)).not.toThrow();
    } finally {
      console.error = consoleError;
    }
    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(publisher.installFetch).not.toHaveBeenCalled();

    const next = mock(() => {});
    ecosystemActivityMiddleware({} as never, {} as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('starts once, wires the middleware and socket observer, and stops cleanly', async () => {
    let ready = false;
    startEcosystemActivity(() => ready);
    startEcosystemActivity(() => ready); // second call is a no-op — only one publisher
    expect(createEcosystemTraffic).toHaveBeenCalledTimes(1);
    expect(publisher.installFetch).toHaveBeenCalledTimes(1);

    const options = createEcosystemTraffic.mock.calls[0]?.[0] as {
      service: string;
      ready(): boolean;
    };
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
