export type EntityAttributes = {
  friendly_name?: string;
  current_temperature?: number;
  temperature?: number;
  min_temp?: number;
  max_temp?: number;
  operation_mode?: string;
  current_humidity?: number;
  rgb_color?: [number, number, number];
  brightness?: number;
  entity_picture?: string;
  percentage?: number;
  unit_of_measurement?: string;
};

export type Entity = {
  entity_id: string;
  state: string;
  attributes: EntityAttributes;
};

export type SetTemperature = (
  temperature: number | string,
  entityId: string
) => void;

export type ProviderControls = {
  setTemperature: SetTemperature;
  toggleLight: (entityId: string, turnOn: boolean) => void;
};

export type { Pose } from '@willo/ui';
