import type { Frame, UpdateFrameRequest } from '@willo.sh/shared-types';

/**
 * A frame checks in every minute (`POST /frames/me/heartbeat`); three missed
 * heartbeats is offline. Long enough that a slow network or a reload does
 * not flicker the badge, short enough that a frame unplugged for a while
 * says so.
 */
export const FRAME_ONLINE_WINDOW_MS = 3 * 60_000;

/** Whether `frame` checked in recently enough to count as on. */
export function isFrameOnline(frame: Pick<Frame, 'lastSeenAt'>, now: number): boolean {
  if (!frame.lastSeenAt) return false;
  return now - Date.parse(frame.lastSeenAt) <= FRAME_ONLINE_WINDOW_MS;
}

/**
 * `frame` as it will be once `change` is saved: the same merge the backend
 * makes (`frames.service.ts`), nested groups one key at a time. The screen
 * shows this at once and keeps the backend's answer when it arrives.
 */
export function withFrameChange(frame: Frame, change: UpdateFrameRequest): Frame {
  const settings = change.settings;
  return {
    ...frame,
    ...(change.name !== undefined ? { name: change.name } : {}),
    ...(change.room !== undefined ? { room: change.room } : {}),
    settings: settings
      ? {
          ...frame.settings,
          ...settings,
          safeArea: { ...frame.settings.safeArea, ...settings.safeArea },
          cards: { ...frame.settings.cards, ...settings.cards },
          statusIcons: { ...frame.settings.statusIcons, ...settings.statusIcons },
        }
      : frame.settings,
  };
}
