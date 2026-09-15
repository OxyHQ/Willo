import { getCapability, type Device } from './types';

/**
 * Home Assistant `device_class` values worth showing as an indoor reading,
 * most important first. Everything else a `sensor` can report (battery,
 * signal strength, power, energy, voltage, timestamps, or no class at all)
 * is device diagnostics, not a reading of the room, and is left out. Only
 * `deviceClass` is available for this decision: HA's `entity_category`
 * ("diagnostic") doesn't reach the frontend.
 */
const RELEVANT_SENSOR_CLASSES = [
  'temperature',
  'humidity',
  'carbon_dioxide',
  'pm25',
  'volatile_organic_compounds',
  'carbon_monoxide',
  'pm10',
  'aqi',
  'illuminance',
];

/** How many readings the Home dashboard's sensors card shows before collapsing the rest into "+N more". */
export const SENSOR_CARD_LIMIT = 6;

/**
 * Every relevant sensor, in display order: by class priority, then
 * round-robin across rooms within a class (every room's first temperature
 * before any room's second), then by name. The card shows a prefix of this
 * list and the Devices screen shows all of it, so "+N more" always matches.
 */
export function selectRelevantSensors(devices: Device[]): Device[] {
  const relevant = devices.filter(device => {
    const measurement = getCapability(device, 'measurement');
    return device.domain === 'sensor'
      && measurement !== undefined
      && measurement.value !== null
      && measurement.deviceClass !== null
      && RELEVANT_SENSOR_CLASSES.includes(measurement.deviceClass);
  });
  return RELEVANT_SENSOR_CLASSES.flatMap(deviceClass => {
    const byRoom = new Map<string, Device[]>();
    const ofClass = relevant
      .filter(device => getCapability(device, 'measurement')?.deviceClass === deviceClass)
      .sort((first, second) => first.name.localeCompare(second.name));
    for (const device of ofClass) {
      const room = device.room ?? '';
      byRoom.set(room, [...(byRoom.get(room) ?? []), device]);
    }
    const rooms = [...byRoom.values()];
    const longestRoom = Math.max(0, ...rooms.map(roomSensors => roomSensors.length));
    const interleaved: Device[] = [];
    for (let round = 0; round < longestRoom; round++) {
      for (const roomSensors of rooms) {
        const roomSensor = roomSensors[round];
        if (roomSensor) interleaved.push(roomSensor);
      }
    }
    return interleaved;
  });
}
