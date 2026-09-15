/**
 * `/tunnel` — the ONLY routes in this backend with no Oxy auth. The caller is
 * a Home Assistant integration, which has no Oxy session; `/pair` is
 * authenticated by the pairing code itself (single-use, short TTL — see
 * `services/homeTunnel.service.ts`), and `/health` is the ALB probe for the
 * dedicated tunnel load balancer (see the infra plan — the shared `/health`
 * route lives behind a different ALB with a different idle timeout).
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { completePairing } from '../services/homeTunnel.service';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

const pairSchema = z.object({
  code: z.string().trim().min(1, 'code is required'),
});

/** POST /tunnel/pair — exchange a pairing code for a tunnel secret. Called once by the integration during its config flow. */
router.post('/pair', validateBody(pairSchema), async (req: Request, res: Response) => {
  const { code } = req.body as z.infer<typeof pairSchema>;
  const result = await completePairing(code);
  res.status(200).json(result);
});

export default router;
