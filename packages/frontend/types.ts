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
};

export type Entity = {
  entity_id: string;
  state: string;
  attributes: EntityAttributes;
};

export type HomeAssistantConfig = {
  location_name: string;
};

export type SetTemperature = (
  temperature: number | string,
  entityId: string
) => void;

export type ProviderControls = {
  setTemperature: SetTemperature;
  toggleLight: (entityId: string, turnOn: boolean) => void;
};

export type Pose = 'collapsed' | 'confirming' | 'expanded';
