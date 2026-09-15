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
  | { kind: 'binarySensor'; active: boolean; deviceClass: string | null };

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
  | { kind: 'setFanSpeed'; percent: number };

export type SmartHomeProvider = {
  connect(): Promise<Device[]>;
  subscribe(onDevices: (devices: Device[]) => void): () => void;
  sendCommand(id: string, command: DeviceCommand): void;
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
