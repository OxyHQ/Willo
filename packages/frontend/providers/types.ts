export type LightDevice = {
  id: string;
  name: string;
  room: string | null;
  on: boolean;
  brightness: number | null;
  color: string | null;
};

export type CameraDevice = {
  id: string;
  name: string;
  room: string | null;
  snapshotUrl: string | null;
};

export type FanDevice = {
  id: string;
  name: string;
  room: string | null;
  on: boolean;
  percentage: number | null;
};

export type SensorReading = {
  id: string;
  name: string;
  value: number | null;
  unit: string | null;
};

export type DeviceSnapshot = {
  lights: LightDevice[];
  cameras: CameraDevice[];
  fans: FanDevice[];
  sensors: SensorReading[];
};

export type SmartHomeProvider = {
  connect(): Promise<DeviceSnapshot>;
  subscribe(onSnapshot: (snapshot: DeviceSnapshot) => void): () => void;
  toggleLight(id: string, on: boolean): void;
  setLightBrightness(id: string, percent: number): void;
  toggleFan(id: string, on: boolean): void;
  setFanPercentage(id: string, percent: number): void;
};
