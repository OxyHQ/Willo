import type { TemperatureUnit } from './unit-system';

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
  | { kind: 'climate'; current: number | null; target: number | null; unit: TemperatureUnit; mode: ClimateMode }
  /** A TV or a speaker: playing or not, and how loud, 0–100. */
  | { kind: 'media'; playing: boolean; volume: number | null };

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
  kind: K
): Extract<DeviceCapability, { kind: K }> | undefined =>
  device.capabilities.find((capability): capability is Extract<DeviceCapability, { kind: K }> => capability.kind === kind);

export type DeviceCommand =
  | { kind: 'setOnOff'; on: boolean }
  | { kind: 'setBrightness'; percent: number }
  | { kind: 'setFanSpeed'; percent: number }
  | { kind: 'setLocked'; locked: boolean }
  | { kind: 'setCoverPosition'; percent: number }
  | { kind: 'setApplianceState'; state: ApplianceState }
  | { kind: 'setTargetTemperature'; value: number }
  | { kind: 'setPlaying'; playing: boolean }
  | { kind: 'setVolume'; percent: number };

export type SmartHomeProvider = {
  connect(): Promise<Device[]>;
  subscribe(onDevices: (devices: Device[]) => void): () => void;
  sendCommand(id: string, command: DeviceCommand): void;
  /** Closes the connection and drops every subscriber — switching to another Home must not keep receiving this one's device events. */
  disconnect(): void;
};

/**
 * Willo's own activity categories — see the backend's `schema.ts` `homeEvents`
 * doc comment for why this vocabulary is deliberately open-ended (room for a
 * future AI-driven `person`/`animal`/`package` category without a shape
 * change; nothing that reads this way yet).
 */
export const HOME_EVENT_TYPES = ['motion', 'contact', 'safety', 'other'] as const;
export type HomeEventType = (typeof HOME_EVENT_TYPES)[number];

/** One real state transition from a `binarySensor`-capable device — `/activity`'s data source, mirroring `GET /homes/:id/events`'s response shape exactly. */
export type HomeActivityEvent = {
  id: string;
  entityId: string;
  name: string;
  room: string | null;
  eventType: HomeEventType;
  deviceClass: string | null;
  active: boolean | null;
  occurredAt: string;
};
