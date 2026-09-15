/**
 * `/tunnel` — the ONLY routes in this backend with no Oxy auth. The caller is
 * a Home Assistant integration (or, for `/claim`+`/claim/status`, a device
 * that has no Home yet at all), which has no Oxy session; `/pair` is
 * authenticated by the pairing code itself (single-use, short TTL — see
 * `services/homeTunnel.service.ts`), `/claim/status` by its own bearer claim
 * token the same way, and `/health` is the ALB probe for the dedicated
 * tunnel load balancer (see the infra plan — the shared `/health` route
 * lives behind a different ALB with a different idle timeout).
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { completePairing, getDeviceClaimStatus, issueDeviceClaim } from '../services/homeTunnel.service';

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

/**
 * POST /tunnel/claim — the DEVICE-initiated counterpart to `/pair`: no body,
 * no caller identity, called once by a device to get a claim code (shown as
 * a QR/status screen) and a bearer token to poll with. See
 * `services/homeTunnel.service.ts`'s `issueDeviceClaim`.
 */
router.post('/claim', async (_req: Request, res: Response) => {
  const result = await issueDeviceClaim();
  res.status(201).json(result);
});

/**
 * GET /tunnel/claim/status — the device polls this, bearing the token
 * `/claim` gave it, until an owner completes the claim from the app
 * (`POST /homes/:id/claim-device`). No `validateBody`/Oxy auth applies here:
 * the claim token itself is the credential, parsed from `Authorization`
 * the same way a bearer scheme normally is — this backend has no other
 * precedent for that header, since every other route authenticates through
 * `requireOxyAuth` instead.
 */
router.get('/claim/status', async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  const match = typeof header === 'string' ? /^Bearer (.+)$/.exec(header) : null;
  if (!match) {
    res.status(401).json({ error: 'Unauthorized', message: 'A Bearer claim token is required.' });
    return;
  }
  const result = await getDeviceClaimStatus(match[1]);
  res.status(200).json(result);
});

export default router;
