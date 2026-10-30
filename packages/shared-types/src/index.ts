/**
 * Shapes the Willo backend shares with its clients: the app, and Frame by
 * Willo (`packages/frame`). The vocabularies are `as const` arrays so the
 * backend validates against the same list the clients render from.
 */

/** The temperature units a device reports in. */
export type TemperatureUnit = '°C' | '°F';

// A capability, not a device type: any device can carry any combination of
// these, so adding a new kind of physical device (a lock, a cover, a media
// player) means adding one capability variant here, never a new Device
// subtype, a new provider method, or new fields threaded through every
// screen that lists devices.
export type DeviceCapability =
  | { kind: 'onOff'; on: boolean }
  | { kind: 'brightness'; percent: number | null }
  | { kind: 'color'; color: string | null }
  | { kind: 'fanSpeed'; percent: number | null }
  | { kind: 'camera'; snapshotUrl: string | null }
  | { kind: 'measurement'; value: number | null; unit: string | null; deviceClass: string | null }
  | { kind: 'binarySensor'; active: boolean; deviceClass: string | null }
  /** A door, a padlock, a smart lock — anything whose whole state is "locked or not". */
  | { kind: 'lock'; locked: boolean }
  /** Blinds, curtains, a garage door, an awning: `position` is how far open, 0–100, `null` on one that only reports open/closed. */
  | { kind: 'cover'; position: number | null; open: boolean }
  /** An appliance that runs a cycle — a robot vacuum, a washer, an air fryer. `remainingMinutes` is `null` when it isn't running or doesn't report one. */
  | { kind: 'appliance'; state: ApplianceState; remainingMinutes: number | null }
  /** Anything that heats or cools toward a target: a thermostat, an air conditioner, a radiator valve. */
  | {
      kind: 'climate';
      current: number | null;
      target: number | null;
      unit: TemperatureUnit;
      mode: ClimateMode;
    }
  /**
   * A TV or a speaker: playing or not, and how loud, 0–100. A real player
   * also says what it is playing, and names its artwork with `artworkKey` (a
   * hash: the artwork itself is asked for by key,
   * `GET /homes/:id/devices/:entityId/artwork`).
   */
  | {
      kind: 'media';
      playing: boolean;
      volume: number | null;
      title?: string | null;
      artist?: string | null;
      album?: string | null;
      artworkKey?: string | null;
    }
  /**
   * The weather where the Home is: Home Assistant's condition vocabulary
   * (`sunny`, `clear-night`, `partlycloudy`, `rainy`, …), and whether it is
   * night, from the sun.
   */
  | {
      kind: 'weather';
      condition: string | null;
      temperature: number | null;
      temperatureUnit: TemperatureUnit | null;
      isNight: boolean;
    };

export const APPLIANCE_STATES = ['idle', 'running', 'paused', 'finished'] as const;
export type ApplianceState = (typeof APPLIANCE_STATES)[number];
export const CLIMATE_MODES = ['off', 'heat', 'cool', 'auto'] as const;
export type ClimateMode = (typeof CLIMATE_MODES)[number];

export type Device = {
  id: string;
  name: string;
  room: string | null;
  /** The provider's own domain/category for this device (e.g. Home Assistant's
   * "light", "camera", "fan", "sensor") — used for icon/grouping choices, never
   * for deciding what a device can do. What it can do is `capabilities`. */
  domain: string;
  capabilities: DeviceCapability[];
};

export const getCapability = <K extends DeviceCapability['kind']>(
  device: Device,
  kind: K,
): Extract<DeviceCapability, { kind: K }> | undefined =>
  device.capabilities.find(
    (capability): capability is Extract<DeviceCapability, { kind: K }> => capability.kind === kind,
  );

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
  /**
   * Who set the frame up: its Oxy device is in their account, so only they can
   * sign it out when the frame is removed.
   */
  addedByUserId: string;
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
