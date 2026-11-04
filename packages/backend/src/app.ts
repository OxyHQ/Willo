import { createAwsWorkloadCredentialProvider } from '@oxy.so/core/server/aws';
import express, { type Express } from 'express';
import {
  OxyServer,
  createOxyAuthMiddleware,
  createOxyCors,
  createOxyRateLimit,
  oxyTrustProxy,
} from '@oxy.so/core/server';
import { config } from './config';
import { createHomesRouter } from './routes/homes.routes';
import tunnelRouter from './routes/tunnel.routes';
import framesRouter from './routes/frames.routes';
import { errorHandler } from './middleware/errorHandler';
import { ecosystemActivityMiddleware } from './ecosystemActivity';
import { WILLO_APP_ORIGINS } from './origins';

/** Willo's Oxy application (`b043569d14d358371cb545b5` in Oxy's application registry). */
const WILLO_APPLICATION_ID = 'b043569d14d358371cb545b5';

/**
 * The budget `POST /tunnel/pair` and `POST /tunnel/claim` share per client
 * address. They are the only routes a stranger can call with no credential at
 * all: `/pair` is where a pairing code would be guessed and `/claim` writes a
 * row per call. A Home Assistant integration calls `/pair` once per pairing
 * and a device calls `/claim` once per setup, so a few retries fit easily.
 */
const TUNNEL_ENROLLMENT_MAX_PER_WINDOW = 10;
const TUNNEL_ENROLLMENT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Build the Express app. Takes `oxy` as a parameter (rather than constructing
 * it internally) so tests can pass one pointed at a mock Oxy API instead of
 * the real one.
 */
export function createApp(oxy: OxyServer): Express {
  const app = express();

  // Before any middleware: `req.ip` is the real client behind the ALB, and behind
  // the Cloudflare proxy too (the ALB's entry is trusted only when it is a
  // published Cloudflare address). Without it `req.ip` is the ALB itself, and a
  // forged X-Forwarded-For is never believed either way.
  app.set('trust proxy', oxyTrustProxy);

  // First, unconditionally: observes every inbound request whether or not
  // ecosystem-activity has actually started (see ecosystemActivity.ts — it
  // uses the configured temporary AWS identity, including local SSO), so
  // there is nothing to plumb through `createApp` when it does.
  app.use(ecosystemActivityMiddleware);
  app.use(createOxyCors({ appOrigins: [...WILLO_APP_ORIGINS] }));
  // Per Oxy user when signed in, per (hashed) client address otherwise.
  // In-memory store: Willo runs exactly one task (`desired_count = 1` in
  // oxy-infra's app-willo.tf), the same one-process assumption the tunnel and
  // room registries in `realtime/` already make, so a process-local count is
  // the whole count. A shared store comes with the second task.
  app.use(createOxyRateLimit(oxy));
  const tunnelEnrollmentLimit = createOxyRateLimit(oxy, {
    anonymousMax: TUNNEL_ENROLLMENT_MAX_PER_WINDOW,
    authenticatedMax: TUNNEL_ENROLLMENT_MAX_PER_WINDOW,
    windowMs: TUNNEL_ENROLLMENT_WINDOW_MS,
  });
  app.post(['/tunnel/pair', '/tunnel/claim'], tunnelEnrollmentLimit);
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Every route under /homes requires a verified Oxy session. Composed here
  // rather than per-router, since this whole API has no public route besides
  // /health and /tunnel.
  app.use('/homes', createOxyAuthMiddleware(oxy), createHomesRouter(oxy));
  // A Frame by Willo screen asking about itself, by the session it is signed
  // in with (see `routes/frames.routes.ts`).
  app.use('/frames', createOxyAuthMiddleware(oxy), framesRouter);

  // /tunnel has NO Oxy auth — its caller is a Home Assistant integration,
  // authenticated by a pairing code or tunnel secret instead (see
  // `routes/tunnel.routes.ts`).
  app.use('/tunnel', tunnelRouter);

  // Last: turns a thrown/rejected domain error into a typed JSON response.
  app.use(errorHandler);

  return app;
}

/**
 * Build the one `OxyServer` this process uses for HTTP auth, Socket.IO auth and
 * Oxy reads. `serviceIdentity: 'when-anonymous'`: a read with no user session
 * (an invitee's account) carries Willo's own workload token, so Oxy charges it
 * to Willo instead of to the fleet's shared NAT address.
 */
export function createOxyClient(): OxyServer {
  return new OxyServer({
    baseURL: config.oxyApiUrl,
    applicationId: WILLO_APPLICATION_ID,
    serviceIdentity: 'when-anonymous',
    workloadCredentials: createAwsWorkloadCredentialProvider(),
  });
}
