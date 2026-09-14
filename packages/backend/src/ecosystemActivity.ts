/**
 * Ecosystem-activity telemetry: publishes this service's inbound/outbound
 * traffic to Oxy so cross-app observability sees Willo like every other
 * product.
 *
 * Gated purely on credential presence — no separate enable flag — matching
 * the pattern every sibling backend (CrowdSource, Nilo, tnp, …) standardized
 * on. `OXY_SERVICE_API_KEY`/`OXY_SERVICE_API_SECRET` are provisioned once Oxy
 * registers an application for Willo; until then this module disables itself
 * with a warning instead of failing startup.
 */

import { createEcosystemTraffic } from '@oxy.so/core/server';
import type { RequestHandler } from 'express';

let activity: ReturnType<typeof createEcosystemTraffic> | undefined;

/** Start only at process bootstrap; constructing a test app starts no publisher. */
export function startEcosystemActivity(ready: () => boolean): void {
  if (!process.env.OXY_SERVICE_API_KEY?.trim() || !process.env.OXY_SERVICE_API_SECRET?.trim()) {
    console.warn('Ecosystem activity is disabled for willo: missing OXY_SERVICE_API_KEY/OXY_SERVICE_API_SECRET');
    return;
  }
  if (activity) return;
  activity = createEcosystemTraffic({ service: 'willo', ready });
  activity.installFetch();
}

/** Mounted first in `createApp` so every inbound request is observed, whether or not activity is running. */
export const ecosystemActivityMiddleware: RequestHandler = (request, response, next) => {
  if (activity) activity.observeHttp(request, response, next);
  else next();
};

/** Called from the `/homes` Socket.IO namespace's `connection` handler. */
export function observeEcosystemSocket(socket: Parameters<ReturnType<typeof createEcosystemTraffic>['observeSocket']>[0]): void {
  activity?.observeSocket(socket);
}

export async function stopEcosystemActivity(): Promise<void> {
  const current = activity;
  activity = undefined;
  await current?.stop();
}
