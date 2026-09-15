import express, { type Express } from 'express';
import { OxyServices } from '@oxy.so/core';
import { createOxyAuthMiddleware, createOxyCors } from '@oxy.so/core/server';
import { config } from './config';
import homesRouter from './routes/homes.routes';
import tunnelRouter from './routes/tunnel.routes';
import { errorHandler } from './middleware/errorHandler';
import { ecosystemActivityMiddleware } from './ecosystemActivity';

/**
 * Build the Express app. Takes `oxy` as a parameter (rather than constructing
 * it internally) so tests can pass one pointed at a mock Oxy API instead of
 * the real one.
 */
export function createApp(oxy: OxyServices): Express {
  const app = express();

  // First, unconditionally: observes every inbound request whether or not
  // ecosystem-activity has actually started (see ecosystemActivity.ts — it
  // no-ops until OXY_SERVICE_API_KEY/OXY_SERVICE_API_SECRET are present), so
  // there is nothing to plumb through `createApp` when it does.
  app.use(ecosystemActivityMiddleware);
  app.use(createOxyCors({ appOrigins: config.corsOrigins }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Every route under /homes requires a verified Oxy session. Composed here
  // (optional-then-require) rather than per-router, since this whole API has
  // no public route besides /health and /tunnel.
  app.use('/homes', createOxyAuthMiddleware(oxy), homesRouter);

  // /tunnel has NO Oxy auth — its caller is a Home Assistant integration,
  // authenticated by a pairing code or tunnel secret instead (see
  // `routes/tunnel.routes.ts`).
  app.use('/tunnel', tunnelRouter);

  // Last: turns a thrown/rejected domain error into a typed JSON response.
  app.use(errorHandler);

  return app;
}

/** Build the default `OxyServices` client this process uses for both HTTP auth and Socket.IO auth. */
export function createOxyClient(): OxyServices {
  return new OxyServices({ baseURL: config.oxyApiUrl });
}
