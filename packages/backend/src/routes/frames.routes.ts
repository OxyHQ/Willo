/**
 * `/frames/me` — a Frame by Willo screen asking about itself. Every route
 * requires an authenticated Oxy user, and the frame is found by the Oxy
 * SESSION its request carries (verified by Oxy, see `frames` in
 * `db/schema.ts`), never by an id the frame sends. The routes about other
 * frames, for people in the Home, live under `/homes/:id/frames`.
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getRequiredOxyUserId, requireOxyAuth } from '@oxy.so/core/server';
import { validateBody } from '../middleware/validate';
import { requiredOxySessionId } from '../middleware/oxySession';
import * as framesService from '../services/frames.service';

const router = Router();

router.use(requireOxyAuth);

const heartbeatSchema = z
  .object({
    platform: z.string().trim().min(1).max(50).optional(),
    appVersion: z.string().trim().min(1).max(50).optional(),
    fps: z.number().min(0).max(240).optional(),
  })
  .strict();

/** GET /frames/me — this frame, with its settings filled in. 404 until it has registered. */
router.get('/me', async (req: Request, res: Response) => {
  const frame = await framesService.getOwnFrame(
    getRequiredOxyUserId(req),
    requiredOxySessionId(req),
  );
  res.status(200).json(frame);
});

/** POST /frames/me/heartbeat — the frame is on, and how it is running. */
router.post('/me/heartbeat', validateBody(heartbeatSchema), async (req: Request, res: Response) => {
  await framesService.recordHeartbeat(
    getRequiredOxyUserId(req),
    requiredOxySessionId(req),
    req.body as z.infer<typeof heartbeatSchema>,
  );
  res.status(204).end();
});

export default router;
