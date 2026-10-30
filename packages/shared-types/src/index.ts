/**
 * Shapes the Willo backend shares with its clients: the app, and Frame by
 * Willo (`packages/frame`). The vocabularies are `as const` arrays so the
 * backend validates against the same list the clients render from.
 */

/** Quarter turns a frame's picture is rotated by, in degrees clockwise. */
export const FRAME_ROTATIONS = [0, 90, 180, 270] as const;
export type FrameRotation = (typeof FRAME_ROTATIONS)[number];

/** The cards a frame can show along its bottom edge. */
export const FRAME_CARDS = ['gallery', 'door', 'co2', 'music', 'weather', 'news'] as const;
export type FrameCard = (typeof FRAME_CARDS)[number];

/** The small readings a frame can show beside its clock. */
export const FRAME_STATUS_ICONS = [
  'indoorTemperature',
  'outdoorTemperature',
  'humidity',
  'co2',
] as const;
export type FrameStatusIcon = (typeof FRAME_STATUS_ICONS)[number];

/**
 * Everything a person can set for one frame, from the Willo app. The backend
 * always answers the whole object, every field filled with its default where
 * nothing was chosen, so a frame never needs defaults of its own.
 */
export interface FrameSettings {
  rotation: FrameRotation;
  /**
   * Pixels kept clear at the top and bottom of the screen, for a mat or a
   * bezel that covers the panel's edge.
   */
  safeArea: { top: number; bottom: number };
  secondsPerPhoto: number;
  /** Whether a resting photo zooms in slowly. */
  drift: boolean;
  showClock: boolean;
  /** Off hides every card at once, whatever `cards` says. */
  showCards: boolean;
  cards: Record<FrameCard, boolean>;
  statusIcons: Record<FrameStatusIcon, boolean>;
  /** Stash albums: the full-screen background, and the gallery card. `null` shows none. */
  backgroundAlbumId: string | null;
  galleryAlbumId: string | null;
  /** Clarity languages for the news card; empty follows the frame's own language. */
  newsLanguages: string[];
}

export interface FrameDiagnostics {
  platform: string | null;
  appVersion: string | null;
  /** Frames per second the frame measured over its last minute. */
  fps: number | null;
}

export interface Frame {
  id: string;
  homeId: string;
  name: string;
  /**
   * The room the frame stands in. Its door, air and temperature readings come
   * from the devices in this room; `null` counts no room's devices.
   */
  room: string | null;
  settings: FrameSettings;
  diagnostics: FrameDiagnostics;
  /** When the frame last checked in; `null` before its first heartbeat. */
  lastSeenAt: string | null;
  createdAt: string;
}

/** What a frame sends when it joins a Home. */
export interface RegisterFrameRequest {
  name?: string;
  room?: string | null;
  /** The frame's Oxy device id, so the app can revoke the device with the frame. */
  oxyDeviceId?: string | null;
  platform?: string;
  appVersion?: string;
}

/** A change to one frame from the app; `settings` is merged, not replaced. */
export interface UpdateFrameRequest {
  name?: string;
  room?: string | null;
  settings?: Partial<Omit<FrameSettings, 'safeArea' | 'cards' | 'statusIcons'>> & {
    safeArea?: Partial<FrameSettings['safeArea']>;
    cards?: Partial<FrameSettings['cards']>;
    statusIcons?: Partial<FrameSettings['statusIcons']>;
  };
}

export interface FrameHeartbeatRequest {
  platform?: string;
  appVersion?: string;
  fps?: number;
}
