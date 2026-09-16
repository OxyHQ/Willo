import type { ParseKeys } from 'i18next';
import type { DeviceCapability } from './types';

/**
 * The demo home, as the same `Device[]` a real Home Assistant would report —
 * so every screen, tile and sheet renders it through exactly the code that
 * serves real devices, and adding an appliance is adding a row here rather
 * than a branch in three screens.
 *
 * Names and rooms are translation keys: the demo is the one catalog Willo owns
 * (a real device keeps whatever its owner named it in Home Assistant), so it
 * follows the UI language like the rest of the interface.
 */
type CatalogEntry = { id: string; nameKey: ParseKeys; roomKey: ParseKeys | null; domain: string; capabilities: DeviceCapability[] };

const light = (on: boolean, percent: number | null = null): DeviceCapability[] =>
  percent === null ? [{ kind: 'onOff', on }] : [{ kind: 'onOff', on }, { kind: 'brightness', percent: on ? percent : 0 }];
const measurement = (value: number, unit: string, deviceClass: string): DeviceCapability[] => [{ kind: 'measurement', value, unit, deviceClass }];
const binarySensor = (active: boolean, deviceClass: string): DeviceCapability[] => [{ kind: 'binarySensor', active, deviceClass }];

const LIVING = 'demo.rooms.livingRoom';
const KITCHEN = 'demo.rooms.kitchen';
const BEDROOM = 'demo.rooms.bedroom';
const BATHROOM = 'demo.rooms.bathroom';
const OFFICE = 'demo.rooms.office';
const HALLWAY = 'demo.rooms.hallway';
const GARAGE = 'demo.rooms.garage';
const GARDEN = 'demo.rooms.garden';

export const DEMO_CATALOG: CatalogEntry[] = [
  // Lights
  { id: 'light.living_ceiling', nameKey: 'demo.devices.ceilingLight', roomKey: LIVING, domain: 'light', capabilities: light(true, 70) },
  { id: 'light.living_lamp', nameKey: 'demo.devices.lamp', roomKey: LIVING, domain: 'light', capabilities: light(true, 40) },
  { id: 'light.living_strip', nameKey: 'demo.devices.lightStrip', roomKey: LIVING, domain: 'light', capabilities: [...light(false, 60), { kind: 'color', color: '#ff7a3d' }] },
  { id: 'light.kitchen_ceiling', nameKey: 'demo.devices.ceilingLight', roomKey: KITCHEN, domain: 'light', capabilities: light(true, 100) },
  { id: 'light.bedroom_lamp', nameKey: 'demo.devices.bedsideLamp', roomKey: BEDROOM, domain: 'light', capabilities: light(false, 25) },
  { id: 'light.office_lamp', nameKey: 'demo.devices.lamp', roomKey: OFFICE, domain: 'light', capabilities: light(true, 80) },
  { id: 'light.bathroom_mirror', nameKey: 'demo.devices.mirrorLight', roomKey: BATHROOM, domain: 'light', capabilities: light(false) },
  { id: 'light.hallway', nameKey: 'demo.devices.hallwayLight', roomKey: HALLWAY, domain: 'light', capabilities: light(true) },
  { id: 'light.garden', nameKey: 'demo.devices.gardenLights', roomKey: GARDEN, domain: 'light', capabilities: light(false) },

  // Climate and air
  { id: 'climate.thermostat', nameKey: 'demo.devices.thermostat', roomKey: LIVING, domain: 'climate', capabilities: [{ kind: 'climate', current: 21.5, target: 22, unit: '°C', mode: 'heat' }] },
  { id: 'climate.bedroom_ac', nameKey: 'demo.devices.airConditioner', roomKey: BEDROOM, domain: 'air-conditioner', capabilities: [{ kind: 'climate', current: 24, target: 21, unit: '°C', mode: 'cool' }] },
  { id: 'climate.office_heater', nameKey: 'demo.devices.heater', roomKey: OFFICE, domain: 'heater', capabilities: [{ kind: 'climate', current: 19, target: 20, unit: '°C', mode: 'off' }] },
  { id: 'fan.living', nameKey: 'demo.devices.fan', roomKey: LIVING, domain: 'fan', capabilities: [{ kind: 'onOff', on: true }, { kind: 'fanSpeed', percent: 40 }] },
  { id: 'fan.purifier', nameKey: 'demo.devices.airPurifier', roomKey: LIVING, domain: 'purifier', capabilities: [{ kind: 'onOff', on: true }, { kind: 'fanSpeed', percent: 25 }] },
  { id: 'humidifier.bedroom', nameKey: 'demo.devices.humidifier', roomKey: BEDROOM, domain: 'humidifier', capabilities: [{ kind: 'onOff', on: false }, { kind: 'fanSpeed', percent: 50 }] },

  // Appliances with a cycle
  { id: 'vacuum.robot', nameKey: 'demo.devices.robotVacuum', roomKey: LIVING, domain: 'vacuum', capabilities: [{ kind: 'appliance', state: 'idle', remainingMinutes: null }] },
  { id: 'appliance.air_fryer', nameKey: 'demo.devices.airFryer', roomKey: KITCHEN, domain: 'air-fryer', capabilities: [{ kind: 'appliance', state: 'running', remainingMinutes: 12 }] },
  { id: 'appliance.oven', nameKey: 'demo.devices.oven', roomKey: KITCHEN, domain: 'oven', capabilities: [{ kind: 'appliance', state: 'idle', remainingMinutes: null }, { kind: 'climate', current: 22, target: 180, unit: '°C', mode: 'off' }] },
  { id: 'appliance.dishwasher', nameKey: 'demo.devices.dishwasher', roomKey: KITCHEN, domain: 'dishwasher', capabilities: [{ kind: 'appliance', state: 'running', remainingMinutes: 47 }] },
  { id: 'appliance.washer', nameKey: 'demo.devices.washingMachine', roomKey: BATHROOM, domain: 'washer', capabilities: [{ kind: 'appliance', state: 'finished', remainingMinutes: null }] },
  { id: 'appliance.dryer', nameKey: 'demo.devices.dryer', roomKey: BATHROOM, domain: 'dryer', capabilities: [{ kind: 'appliance', state: 'idle', remainingMinutes: null }] },
  { id: 'appliance.coffee', nameKey: 'demo.devices.coffeeMaker', roomKey: KITCHEN, domain: 'coffee', capabilities: [{ kind: 'appliance', state: 'idle', remainingMinutes: null }] },
  { id: 'appliance.kettle', nameKey: 'demo.devices.kettle', roomKey: KITCHEN, domain: 'kettle', capabilities: [{ kind: 'onOff', on: false }] },

  // Covers and locks
  { id: 'cover.living_blinds', nameKey: 'demo.devices.blinds', roomKey: LIVING, domain: 'cover', capabilities: [{ kind: 'cover', position: 100, open: true }] },
  { id: 'cover.bedroom_blinds', nameKey: 'demo.devices.blinds', roomKey: BEDROOM, domain: 'cover', capabilities: [{ kind: 'cover', position: 0, open: false }] },
  { id: 'cover.awning', nameKey: 'demo.devices.awning', roomKey: GARDEN, domain: 'cover', capabilities: [{ kind: 'cover', position: 60, open: true }] },
  { id: 'cover.garage_door', nameKey: 'demo.devices.garageDoor', roomKey: GARAGE, domain: 'garage', capabilities: [{ kind: 'cover', position: null, open: false }] },
  { id: 'lock.front_door', nameKey: 'demo.devices.frontDoorLock', roomKey: HALLWAY, domain: 'lock', capabilities: [{ kind: 'lock', locked: true }] },
  { id: 'lock.back_door', nameKey: 'demo.devices.backDoorLock', roomKey: KITCHEN, domain: 'lock', capabilities: [{ kind: 'lock', locked: false }] },

  // Media and plugs
  { id: 'media_player.tv', nameKey: 'demo.devices.tv', roomKey: LIVING, domain: 'tv', capabilities: [{ kind: 'media', playing: true, volume: 30 }] },
  { id: 'media_player.speaker', nameKey: 'demo.devices.speaker', roomKey: KITCHEN, domain: 'media_player', capabilities: [{ kind: 'media', playing: false, volume: 45 }] },
  { id: 'switch.office_plug', nameKey: 'demo.devices.smartPlug', roomKey: OFFICE, domain: 'switch', capabilities: [{ kind: 'onOff', on: true }] },
  { id: 'switch.garden_irrigation', nameKey: 'demo.devices.irrigation', roomKey: GARDEN, domain: 'switch', capabilities: [{ kind: 'onOff', on: false }] },

  // Cameras
  { id: 'camera.living', nameKey: 'demo.devices.livingRoomCamera', roomKey: LIVING, domain: 'camera', capabilities: [{ kind: 'camera', snapshotUrl: null }] },
  { id: 'camera.garden', nameKey: 'demo.devices.gardenCamera', roomKey: GARDEN, domain: 'camera', capabilities: [{ kind: 'camera', snapshotUrl: null }] },
  { id: 'camera.doorbell', nameKey: 'demo.devices.doorbell', roomKey: HALLWAY, domain: 'doorbell', capabilities: [{ kind: 'camera', snapshotUrl: null }, { kind: 'binarySensor', active: false, deviceClass: 'occupancy' }] },

  // Readings
  { id: 'sensor.living_temperature', nameKey: 'demo.sensors.livingTemperature', roomKey: LIVING, domain: 'sensor', capabilities: measurement(21.5, '°C', 'temperature') },
  { id: 'sensor.living_humidity', nameKey: 'demo.sensors.livingHumidity', roomKey: LIVING, domain: 'sensor', capabilities: measurement(45, '%', 'humidity') },
  { id: 'sensor.living_co2', nameKey: 'demo.sensors.livingCo2', roomKey: LIVING, domain: 'sensor', capabilities: measurement(612, 'ppm', 'carbon_dioxide') },
  { id: 'sensor.living_pm25', nameKey: 'demo.sensors.livingPm25', roomKey: LIVING, domain: 'sensor', capabilities: measurement(8, 'µg/m³', 'pm25') },
  { id: 'sensor.kitchen_temperature', nameKey: 'demo.sensors.kitchenTemperature', roomKey: KITCHEN, domain: 'sensor', capabilities: measurement(22.8, '°C', 'temperature') },
  { id: 'sensor.bedroom_temperature', nameKey: 'demo.sensors.bedroomTemperature', roomKey: BEDROOM, domain: 'sensor', capabilities: measurement(19.2, '°C', 'temperature') },
  { id: 'sensor.bedroom_humidity', nameKey: 'demo.sensors.bedroomHumidity', roomKey: BEDROOM, domain: 'sensor', capabilities: measurement(48, '%', 'humidity') },
  { id: 'sensor.office_temperature', nameKey: 'demo.sensors.officeTemperature', roomKey: OFFICE, domain: 'sensor', capabilities: measurement(20.1, '°C', 'temperature') },
  { id: 'sensor.office_illuminance', nameKey: 'demo.sensors.officeIlluminance', roomKey: OFFICE, domain: 'sensor', capabilities: measurement(320, 'lx', 'illuminance') },
  { id: 'sensor.office_humidity', nameKey: 'demo.sensors.officeHumidity', roomKey: OFFICE, domain: 'sensor', capabilities: measurement(41, '%', 'humidity') },
  { id: 'sensor.office_co2', nameKey: 'demo.sensors.officeCo2', roomKey: OFFICE, domain: 'sensor', capabilities: measurement(845, 'ppm', 'carbon_dioxide') },
  // A diagnostic reading on purpose: the readings card filters battery levels out, and the demo should exercise that.
  { id: 'sensor.office_battery', nameKey: 'demo.sensors.officeBattery', roomKey: OFFICE, domain: 'sensor', capabilities: measurement(87, '%', 'battery') },
  { id: 'sensor.bathroom_humidity', nameKey: 'demo.sensors.bathroomHumidity', roomKey: BATHROOM, domain: 'sensor', capabilities: measurement(63, '%', 'humidity') },
  { id: 'sensor.home_energy', nameKey: 'demo.sensors.energyMeter', roomKey: null, domain: 'sensor', capabilities: measurement(412, 'W', 'power') },
  { id: 'sensor.garden_rain', nameKey: 'demo.sensors.rainfall', roomKey: GARDEN, domain: 'sensor', capabilities: measurement(0.4, 'mm', 'precipitation') },

  // Safety and presence
  { id: 'binary_sensor.kitchen_smoke', nameKey: 'demo.sensors.smokeDetector', roomKey: KITCHEN, domain: 'binary_sensor', capabilities: binarySensor(false, 'smoke') },
  { id: 'binary_sensor.kitchen_co', nameKey: 'demo.sensors.coDetector', roomKey: KITCHEN, domain: 'binary_sensor', capabilities: binarySensor(false, 'carbon_monoxide') },
  { id: 'binary_sensor.bathroom_leak', nameKey: 'demo.sensors.waterLeak', roomKey: BATHROOM, domain: 'binary_sensor', capabilities: binarySensor(false, 'moisture') },
  { id: 'binary_sensor.front_door', nameKey: 'demo.sensors.frontDoorContact', roomKey: HALLWAY, domain: 'binary_sensor', capabilities: binarySensor(false, 'door') },
  { id: 'binary_sensor.living_window', nameKey: 'demo.sensors.livingWindow', roomKey: LIVING, domain: 'binary_sensor', capabilities: binarySensor(true, 'window') },
  { id: 'binary_sensor.hallway_motion', nameKey: 'demo.sensors.hallwayMotion', roomKey: HALLWAY, domain: 'binary_sensor', capabilities: binarySensor(true, 'motion') },
];
