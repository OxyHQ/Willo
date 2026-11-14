import { startEcosystemTraffic } from '@oxy.so/core/server';

/** The handle `server.ts` holds where the process does not publish: tests build apps with it. */
export const inertTraffic = startEcosystemTraffic({
  service: 'willo',
  ready: () => false,
  env: { OXY_ECOSYSTEM_ACTIVITY_ENABLED: 'false' },
});
