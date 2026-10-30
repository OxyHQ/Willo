import type { Request } from 'express';
import type { OxyAuthRequest } from '@oxy.so/core/server';
import { NotFoundError } from '../errors';

/**
 * The Oxy session a request is signed in with — how a frame is recognised
 * (see `frames` in `db/schema.ts`). The auth middleware refuses a user token
 * bound to no session before any route runs, so a request reaching a route
 * without one names no frame.
 */
export function requiredOxySessionId(req: Request): string {
  const sessionId = (req as OxyAuthRequest).sessionId;
  if (!sessionId) throw new NotFoundError('Frame not found.');
  return sessionId;
}
