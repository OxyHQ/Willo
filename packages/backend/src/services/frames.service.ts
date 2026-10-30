/**
 * Frame by Willo screens. A frame registers itself in a Home with its own Oxy
 * session, reads its settings and checks in by that session, and people in the
 * Home rename it, move it or change its settings from the app.
 */

import {
  FRAME_CARDS,
  FRAME_ROTATIONS,
  FRAME_STATUS_ICONS,
  type Frame,
  type FrameSettings,
  type UpdateFrameRequest,
} from '@willo.sh/shared-types';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/postgres';
import { frames } from '../db/schema';
import { NotFoundError } from '../errors';
import { emitToHome } from '../realtime/socketRegistry';
import { assertActiveMember } from './homes.service';

type FrameRow = typeof frames.$inferSelect;

/** What a frame shows before anyone changes anything. */
export const DEFAULT_FRAME_SETTINGS: FrameSettings = {
  rotation: 0,
  safeArea: { top: 0, bottom: 0 },
  secondsPerPhoto: 45,
  drift: true,
  showClock: true,
  showCards: true,
  cards: { gallery: true, door: true, co2: true, music: true, weather: true, news: true },
  statusIcons: { indoorTemperature: true, outdoorTemperature: true, humidity: true, co2: true },
  backgroundAlbumId: null,
  galleryAlbumId: null,
  newsLanguages: [],
};

const booleanRecord = <const Keys extends readonly [string, ...string[]]>(keys: Keys) =>
  z.partialRecord(z.enum(keys), z.boolean());

/**
 * The settings a person may choose, every field optional. Used twice: to
 * validate a change from the app, and to read what is stored, so a stored
 * value a later release no longer accepts is dropped (and its default shown)
 * instead of reaching a frame.
 */
export const frameSettingsChangeSchema = z
  .object({
    rotation: z.literal(FRAME_ROTATIONS),
    safeArea: z
      .object({
        top: z.number().int().min(0).max(1000),
        bottom: z.number().int().min(0).max(1000),
      })
      .partial()
      .strict(),
    secondsPerPhoto: z.number().int().min(5).max(3600),
    drift: z.boolean(),
    showClock: z.boolean(),
    showCards: z.boolean(),
    cards: booleanRecord(FRAME_CARDS),
    statusIcons: booleanRecord(FRAME_STATUS_ICONS),
    backgroundAlbumId: z.string().trim().min(1).max(100).nullable(),
    galleryAlbumId: z.string().trim().min(1).max(100).nullable(),
    newsLanguages: z
      .array(
        z
          .string()
          .trim()
          .regex(/^[a-z]{2,3}$/),
      )
      .max(10),
  })
  .partial()
  .strict();

type FrameSettingsChange = z.infer<typeof frameSettingsChangeSchema>;

/** Stored choices over the defaults, one field (or one nested key) at a time. */
export function resolveFrameSettings(stored: unknown): FrameSettings {
  const parsed = frameSettingsChangeSchema.safeParse(stored);
  const chosen: FrameSettingsChange = parsed.success ? parsed.data : {};
  if (!parsed.success) {
    console.warn('Stored frame settings no longer validate; showing defaults', {
      issues: parsed.error.issues.map((issue) => issue.path.join('.')),
    });
  }
  return {
    ...DEFAULT_FRAME_SETTINGS,
    ...chosen,
    safeArea: { ...DEFAULT_FRAME_SETTINGS.safeArea, ...chosen.safeArea },
    cards: { ...DEFAULT_FRAME_SETTINGS.cards, ...chosen.cards },
    statusIcons: { ...DEFAULT_FRAME_SETTINGS.statusIcons, ...chosen.statusIcons },
  };
}

/**
 * A new choice over the ones already stored, one nested key at a time. Only
 * what someone chose is kept: a nested group nobody touched stays absent.
 */
function mergeChoices(
  stored: FrameSettingsChange,
  change: FrameSettingsChange,
): FrameSettingsChange {
  const merged: FrameSettingsChange = { ...stored, ...change };
  if (stored.safeArea || change.safeArea) {
    merged.safeArea = { ...stored.safeArea, ...change.safeArea };
  }
  if (stored.cards || change.cards) merged.cards = { ...stored.cards, ...change.cards };
  if (stored.statusIcons || change.statusIcons) {
    merged.statusIcons = { ...stored.statusIcons, ...change.statusIcons };
  }
  return merged;
}

function toFrame(row: FrameRow): Frame {
  return {
    id: row.id,
    homeId: row.homeId,
    addedByUserId: row.addedByUserId,
    name: row.name,
    room: row.room,
    settings: resolveFrameSettings(row.settings),
    diagnostics: { platform: row.platform, appVersion: row.appVersion, fps: row.fps },
    lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface RegisterFrameInput {
  name: string;
  room: string | null;
  oxyDeviceId: string | null;
  platform: string | null;
  appVersion: string | null;
}

/**
 * A frame joins a Home with the session it is signed in with. The same
 * session registering again (a reload, a retry) gets its existing frame back,
 * moved to the Home it asked for, with its settings kept.
 */
export async function registerFrame(
  homeId: string,
  userId: string,
  oxySessionId: string,
  input: RegisterFrameInput,
): Promise<Frame> {
  await assertActiveMember(homeId, userId);
  const [row] = await getDb()
    .insert(frames)
    .values({ homeId, addedByUserId: userId, oxySessionId, ...input })
    .onConflictDoUpdate({
      target: frames.oxySessionId,
      set: {
        homeId,
        addedByUserId: userId,
        oxyDeviceId: input.oxyDeviceId,
        platform: input.platform,
        appVersion: input.appVersion,
      },
    })
    .returning();
  if (!row) throw new Error('Registering a frame returned no row.');
  const frame = toFrame(row);
  emitToHome(homeId, 'home:frame-updated', frame);
  return frame;
}

/**
 * The frame this session belongs to. `NotFoundError` before it registered,
 * and once the person who set it up is no longer in its Home.
 */
export async function getOwnFrame(userId: string, oxySessionId: string): Promise<Frame> {
  const [row] = await getDb().select().from(frames).where(eq(frames.oxySessionId, oxySessionId));
  if (!row || row.addedByUserId !== userId) throw new NotFoundError('Frame not found.');
  await assertActiveMember(row.homeId, userId);
  return toFrame(row);
}

/** A frame checking in: it is online, and how it is running. */
export async function recordHeartbeat(
  userId: string,
  oxySessionId: string,
  diagnostics: { platform?: string; appVersion?: string; fps?: number },
): Promise<void> {
  const updated = await getDb()
    .update(frames)
    .set({
      lastSeenAt: new Date(),
      ...(diagnostics.platform !== undefined ? { platform: diagnostics.platform } : {}),
      ...(diagnostics.appVersion !== undefined ? { appVersion: diagnostics.appVersion } : {}),
      ...(diagnostics.fps !== undefined ? { fps: diagnostics.fps } : {}),
    })
    .where(and(eq(frames.oxySessionId, oxySessionId), eq(frames.addedByUserId, userId)))
    .returning({ id: frames.id });
  if (updated.length === 0) throw new NotFoundError('Frame not found.');
}

/** This Home's frames. Any active member. */
export async function listFrames(homeId: string, userId: string): Promise<Frame[]> {
  await assertActiveMember(homeId, userId);
  const rows = await getDb().select().from(frames).where(eq(frames.homeId, homeId));
  return rows.map(toFrame);
}

async function frameInHome(homeId: string, frameId: string): Promise<FrameRow> {
  const [row] = await getDb()
    .select()
    .from(frames)
    .where(and(eq(frames.id, frameId), eq(frames.homeId, homeId)));
  if (!row) throw new NotFoundError('Frame not found.');
  return row;
}

/**
 * Rename, move or reconfigure a frame. Any active member. The frame hears the
 * change at once (`home:frame-updated`).
 */
export async function updateFrame(
  homeId: string,
  userId: string,
  frameId: string,
  change: UpdateFrameRequest & { settings?: FrameSettingsChange },
): Promise<Frame> {
  await assertActiveMember(homeId, userId);
  const current = await frameInHome(homeId, frameId);
  const stored = frameSettingsChangeSchema.safeParse(current.settings);
  const [row] = await getDb()
    .update(frames)
    .set({
      ...(change.name !== undefined ? { name: change.name } : {}),
      ...(change.room !== undefined ? { room: change.room } : {}),
      ...(change.settings !== undefined
        ? { settings: mergeChoices(stored.success ? stored.data : {}, change.settings) }
        : {}),
    })
    .where(eq(frames.id, frameId))
    .returning();
  if (!row) throw new NotFoundError('Frame not found.');
  const frame = toFrame(row);
  emitToHome(homeId, 'home:frame-updated', frame);
  return frame;
}

/**
 * Remove a frame from its Home. Any active member. Answers the Oxy device id
 * the frame reported, so the app can sign that device out of the account too.
 */
export async function removeFrame(
  homeId: string,
  userId: string,
  frameId: string,
): Promise<{ oxyDeviceId: string | null }> {
  await assertActiveMember(homeId, userId);
  const [row] = await getDb()
    .delete(frames)
    .where(and(eq(frames.id, frameId), eq(frames.homeId, homeId)))
    .returning({ oxyDeviceId: frames.oxyDeviceId });
  if (!row) throw new NotFoundError('Frame not found.');
  emitToHome(homeId, 'home:frame-removed', { frameId });
  return row;
}
