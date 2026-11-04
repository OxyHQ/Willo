import type { NextFunction, Request, Response } from 'express';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
} from '../errors';

/** The Oxy API error envelope (`~/Oxy/docs/api-conventions.md`): `{ error: { code, message } }`. */
export function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

/**
 * The one place a thrown domain error becomes an HTTP response. Mounted last,
 * after every route — Express 5 forwards a rejected async handler here
 * automatically, so route handlers never need their own try/catch for these.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof BadRequestError) {
    sendError(res, 400, 'bad_request', error.message);
    return;
  }
  if (error instanceof ForbiddenError) {
    sendError(res, 403, 'forbidden', error.message);
    return;
  }
  if (error instanceof NotFoundError) {
    sendError(res, 404, 'not_found', error.message);
    return;
  }
  if (error instanceof ConflictError) {
    sendError(res, 409, 'conflict', error.message);
    return;
  }
  if (error instanceof ServiceUnavailableError) {
    sendError(res, 503, 'service_unavailable', error.message);
    return;
  }
  // Malformed request bodies (bad JSON) are a user-input boundary, not an
  // internal failure: express.json() throws a SyntaxError carrying its own
  // `status`/`statusCode` before any route handler ever runs.
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    sendError(res, 400, 'bad_request', 'Malformed request body.');
    return;
  }
  console.error('Unhandled error in Willo backend:', error);
  sendError(res, 500, 'internal_error', 'Something went wrong.');
}
