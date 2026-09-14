import express, { type Express } from 'express';
import { OxyServices } from '@oxy.so/core';
import { createOxyAuthMiddleware, createOxyCors } from '@oxy.so/core/server';
import { config } from './config';
import homesRouter from './routes/homes.routes';
import { errorHandler } from './middleware/errorHandler';

/**
 * Build the Express app. Takes `oxy` as a parameter (rather than constructing
 * it internally) so tests can pass one pointed at a mock Oxy API instead of
 * the real one.
 */
export function createApp(oxy: OxyServices): Express {
  const app = express();

  app.use(createOxyCors({ appOrigins: config.corsOrigins }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Every route under /homes requires a verified Oxy session. Composed here
  // (optional-then-require) rather than per-router, since this whole API has
  // no public route besides /health.
  app.use('/homes', createOxyAuthMiddleware(oxy), homesRouter);

  // Last: turns a thrown/rejected domain error into a typed JSON response.
  app.use(errorHandler);

  return app;
}

/** Build the default `OxyServices` client this process uses for both HTTP auth and Socket.IO auth. */
export function createOxyClient(): OxyServices {
  return new OxyServices({ baseURL: config.oxyApiUrl });
}
