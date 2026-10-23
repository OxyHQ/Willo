/** Shared workload transport resolves temporary IAM credentials lazily, including local SSO. */
import { createEcosystemTraffic } from '@oxy.so/core/server';
import { createAwsWorkloadCredentialProvider } from '@oxy.so/core/server/aws';
import { config } from './config';
import type { RequestHandler } from 'express';

let activity: ReturnType<typeof createEcosystemTraffic> | undefined;

/** Start only at process bootstrap; constructing a test app starts no publisher. */
export function startEcosystemActivity(ready: () => boolean): void {
  if (activity) return;
  try {
    activity = createEcosystemTraffic({
      service: 'willo',
      baseURL: config.oxyApiUrl,
      workloadCredentials: createAwsWorkloadCredentialProvider(),
      ready,
    });
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
