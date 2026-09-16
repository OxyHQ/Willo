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
  // One pass: every device's class is read once here, and the ordering below
  // walks these buckets instead of re-reading capabilities per class.
  const byClassAndRoom = new Map<string, Map<string, Device[]>>();
  for (const device of devices) {
    const measurement = getCapability(device, 'measurement');
    if (device.domain !== 'sensor' || measurement?.value == null || measurement.deviceClass === null) continue;
    if (!RELEVANT_SENSOR_CLASSES.includes(measurement.deviceClass)) continue;
    let rooms = byClassAndRoom.get(measurement.deviceClass);
    if (!rooms) {
      rooms = new Map<string, Device[]>();
      byClassAndRoom.set(measurement.deviceClass, rooms);
    }
    const room = device.room ?? '';
    const roomSensors = rooms.get(room);
    if (roomSensors) roomSensors.push(device);
    else rooms.set(room, [device]);
  }
  return RELEVANT_SENSOR_CLASSES.flatMap(deviceClass => {
    const rooms = [...(byClassAndRoom.get(deviceClass)?.values() ?? [])];
    // By name within a room, then rooms against each other by their own first
    // sensor — so the same set of sensors always comes out in the same order,
    // whatever order Home Assistant happened to report them in.
    for (const roomSensors of rooms) roomSensors.sort((first, second) => first.name.localeCompare(second.name));
    rooms.sort((first, second) => (first[0]?.name ?? '').localeCompare(second[0]?.name ?? ''));
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
