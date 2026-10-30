import type { ApplianceState, Device } from '@willo.sh/shared-types';

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
