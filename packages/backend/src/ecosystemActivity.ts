/**
 * Ecosystem-activity telemetry: publishes this service's inbound/outbound
 * traffic and its infrastructure heartbeat to Oxy, which feeds the central
 * API's `/platform-activity` namespace and the live dashboard on oxy.so.
 *
 * ## Why there is no enable flag and no credential gate
 *
 * Every deployed Oxy service publishes activity. What a flag (or the presence
 * of `OXY_SERVICE_API_KEY`) actually stood for was "am I a deployed process, or
 * somebody's laptop", and that is a fact about where the code runs rather than
 * something to configure: ECS sets the container credentials endpoint on every
 * task and nothing else does, which is the same signal the credential-free
 * service token uses to prove what this process IS (oxy ADR 0026).
 *
 * Gating on the key pair is why Willo never reported: its task definition
 * carries no `OXY_SERVICE_API_KEY`/`OXY_SERVICE_API_SECRET`, so this module
 * disabled itself on every boot. On ECS `createEcosystemTraffic` now
 * authenticates by attesting the task role, and still uses a key pair when one
 * is present.
 */

import { canAttestWorkloadIdentity, createEcosystemTraffic } from '@oxy.so/core/server';
import type { RequestHandler } from 'express';

let activity: ReturnType<typeof createEcosystemTraffic> | undefined;

/** Start only at process bootstrap; constructing a test app starts no publisher. */
export function startEcosystemActivity(ready: () => boolean): void {
  if (activity) return;
  if (!canAttestWorkloadIdentity()) {
    console.warn(
      'Ecosystem activity is disabled for willo: not running on ECS (no workload identity to attest)',
    );
    return;
  }
  // Willo is a single-task service, so a telemetry misconfiguration (an
  // unknown AWS_REGION, a half-set key pair) must not crash-loop it. The error
  // is logged with its cause and the server keeps serving without a publisher.
  try {
    activity = createEcosystemTraffic({ service: 'willo', ready });
  } catch (error: unknown) {
    console.error('Ecosystem activity failed to start for willo; continuing without it:', error);
    return;
  }
  activity.installFetch();
}

/** Mounted first in `createApp` so every inbound request is observed, whether or not activity is running. */
export const ecosystemActivityMiddleware: RequestHandler = (request, response, next) => {
  if (activity) activity.observeHttp(request, response, next);
  else next();
};

/** Called from the `/homes` Socket.IO namespace's `connection` handler. */
export function observeEcosystemSocket(
  socket: Parameters<ReturnType<typeof createEcosystemTraffic>['observeSocket']>[0],
): void {
  activity?.observeSocket(socket);
}

export async function stopEcosystemActivity(): Promise<void> {
  const current = activity;
  activity = undefined;
  await current?.stop();
}
