/**
 * `/homes` — every route in this file requires an authenticated Oxy user.
 *
 * `app.ts` mounts `createOxyAuthMiddleware(oxy)` ahead of this router, which
 * does the actual bearer-token verification (a call to the Oxy API — see
 * `config/index.ts`). `router.use(requireOxyAuth)` below is a defensive
 * second check that `req.userId` really is set, exactly the redundancy
 * OxyHQ/Mention's `muteWords.routes.ts` keeps for the same reason.
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getRequiredOxyUserId, requireOxyAuth } from '@oxy.so/core/server';
import { validateBody } from '../middleware/validate';
import * as homesService from '../services/homes.service';
import * as membersService from '../services/homeMembers.service';
import * as devicesService from '../services/homeDevices.service';
import * as tunnelService from '../services/homeTunnel.service';
import * as eventsService from '../services/homeEvents.service';
import { sendCommand as sendTunnelCommand, requestCameraSnapshot } from '../realtime/tunnelRegistry';

const router = Router();

router.use(requireOxyAuth);

/**
 * A path param as a string. `@types/express` types every param as
 * `string | string[]` defensively; a simple named segment (`:id`) is always a
 * single string in practice. A non-string becomes `''`, which names no row
 * and answers 404 — never coerced into a plausible-looking id. Mirrors
 * OxyHQ/Mention's `pathId` in `muteWords.routes.ts`.
 */
function pathParam(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

const createHomeSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
});

const inviteMemberSchema = z.object({
  // Willo has no users-by-username lookup the way Oxy's own accounts API
  // does, so the caller supplies the target's Oxy user id directly.
  // Resolving a human-friendly identifier to an id is a frontend/UX concern
  // for a later pass.
  memberUserId: z.string().trim().min(1, 'memberUserId is required'),
});

const upsertDeviceMetadataSchema = z.object({
  customName: z.string().trim().min(1).max(200).nullable().optional(),
  room: z.string().trim().min(1).max(200).nullable().optional(),
  isFavorite: z.boolean().optional(),
});

const sendCommandSchema = z.object({
  domain: z.string().trim().min(1, 'domain is required'),
  service: z.string().trim().min(1, 'service is required'),
  serviceData: z.record(z.string(), z.unknown()).default({}),
});

/** POST /homes — create a Home; caller becomes an active owner. */
router.post('/', validateBody(createHomeSchema), async (req: Request, res: Response) => {
  const userId = getRequiredOxyUserId(req);
  const { name } = req.body as z.infer<typeof createHomeSchema>;
  const result = await homesService.createHome(userId, name);
  res.status(201).json(result);
});

/** GET /homes/me — every Home the caller actively belongs to, with its roster. */
router.get('/me', async (req: Request, res: Response) => {
  const userId = getRequiredOxyUserId(req);
  const result = await homesService.listHomesForUser(userId);
  res.status(200).json(result);
});

/** POST /homes/:id/members — invite a member by Oxy user id. Owner only. */
router.post('/:id/members', validateBody(inviteMemberSchema), async (req: Request, res: Response) => {
  const userId = getRequiredOxyUserId(req);
  const { memberUserId } = req.body as z.infer<typeof inviteMemberSchema>;
  const result = await membersService.inviteMember(pathParam(req.params.id), userId, memberUserId);
  res.status(201).json(result);
});

/** POST /homes/:id/members/:memberId/accept — invitee only. */
router.post('/:id/members/:memberId/accept', async (req: Request, res: Response) => {
  const userId = getRequiredOxyUserId(req);
  const result = await membersService.acceptInvite(pathParam(req.params.id), pathParam(req.params.memberId), userId);
  res.status(200).json(result);
});

/** POST /homes/:id/members/:memberId/decline — invitee only. */
router.post('/:id/members/:memberId/decline', async (req: Request, res: Response) => {
  const userId = getRequiredOxyUserId(req);
  const result = await membersService.declineInvite(pathParam(req.params.id), pathParam(req.params.memberId), userId);
  res.status(200).json(result);
});

/** DELETE /homes/:id/members/:memberId — owner only, never on oneself. */
router.delete('/:id/members/:memberId', async (req: Request, res: Response) => {
  const userId = getRequiredOxyUserId(req);
  const result = await membersService.removeMember(pathParam(req.params.id), userId, pathParam(req.params.memberId));
  res.status(200).json(result);
});

/** POST /homes/:id/leave — any active member; see homeMembers.service.ts's leaveHome for the owner rule. */
router.post('/:id/leave', async (req: Request, res: Response) => {
  const userId = getRequiredOxyUserId(req);
  const result = await membersService.leaveHome(pathParam(req.params.id), userId);
  res.status(200).json(result);
});

/** GET /homes/:id/devices — this Home's device metadata overlay. Any active member. */
router.get('/:id/devices', async (req: Request, res: Response) => {
  const userId = getRequiredOxyUserId(req);
  const result = await devicesService.listDeviceMetadata(pathParam(req.params.id), userId);
  res.status(200).json(result);
});

/** PUT /homes/:id/devices/:entityId — upsert metadata for one device. Any active member. */
router.put('/:id/devices/:entityId', validateBody(upsertDeviceMetadataSchema), async (req: Request, res: Response) => {
  const userId = getRequiredOxyUserId(req);
  const input = req.body as z.infer<typeof upsertDeviceMetadataSchema>;
  const result = await devicesService.upsertDeviceMetadata(pathParam(req.params.id), userId, pathParam(req.params.entityId), input);
  res.status(200).json(result);
});

/** POST /homes/:id/pairing-code — issue a code to enter into the Home Assistant integration's config flow. Owner only. */
router.post('/:id/pairing-code', async (req: Request, res: Response) => {
  const userId = getRequiredOxyUserId(req);
  const result = await tunnelService.issuePairingCode(pathParam(req.params.id), userId);
  res.status(201).json(result);
});

/** GET /homes/:id/devices/live — cached device list + whether the tunnel is currently connected. Any active member. */
router.get('/:id/devices/live', async (req: Request, res: Response) => {
  const userId = getRequiredOxyUserId(req);
  const result = await tunnelService.getLiveDevices(pathParam(req.params.id), userId);
  res.status(200).json(result);
});

/** GET /homes/:id/events — this Home's real activity history (motion/door/safety sensor transitions). Any active member. */
router.get('/:id/events', async (req: Request, res: Response) => {
  const userId = getRequiredOxyUserId(req);
  const result = await eventsService.listEvents(pathParam(req.params.id), userId);
  res.status(200).json(result);
});

/** POST /homes/:id/devices/:entityId/command — relay a command to the Home's tunnel. Any active member. Fire-and-forget, matching the app's existing command pattern. */
router.post('/:id/devices/:entityId/command', validateBody(sendCommandSchema), async (req: Request, res: Response) => {
  const userId = getRequiredOxyUserId(req);
  const homeId = pathParam(req.params.id);
  await homesService.assertActiveMember(homeId, userId);
  const { domain, service, serviceData } = req.body as z.infer<typeof sendCommandSchema>;
  sendTunnelCommand(homeId, { domain, service, entityId: pathParam(req.params.entityId), serviceData });
  res.status(202).json({ accepted: true });
});

/** GET /homes/:id/devices/:entityId/camera — request a fresh snapshot over the tunnel. Any active member. */
router.get('/:id/devices/:entityId/camera', async (req: Request, res: Response) => {
  const userId = getRequiredOxyUserId(req);
  const homeId = pathParam(req.params.id);
  await homesService.assertActiveMember(homeId, userId);
  const image = await requestCameraSnapshot(homeId, pathParam(req.params.entityId));
  res.status(200).contentType('image/jpeg').send(image);
});

export default router;
