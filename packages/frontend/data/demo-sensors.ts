import type { Device } from '../providers/types';

const demoSensor = (id: string, name: string, room: string, deviceClass: string, value: number, unit: string): Device => ({
  id: `demo.${id}`,
  name,
  room,
  domain: 'sensor',
  capabilities: [{ kind: 'measurement', value, unit, deviceClass }],
});

/**
 * The demo catalog's indoor readings, shaped exactly like real Home Assistant
 * sensors so the same `selectRelevantSensors` ranking and card render them.
 * More than the Home card's limit on purpose, so demo mode also shows its
 * "+N more" row. Fahrenheit, matching the demo thermostat.
 */
export const DEMO_SENSORS: Device[] = [
  demoSensor('living-temperature', 'Living room temperature', 'Living room', 'temperature', 70, '°F'),
  demoSensor('office-temperature', 'Office temperature', 'Office', 'temperature', 68, '°F'),
  demoSensor('bedroom-temperature', 'Bedroom temperature', 'Bedroom', 'temperature', 66, '°F'),
  demoSensor('living-humidity', 'Living room humidity', 'Living room', 'humidity', 45, '%'),
  demoSensor('office-humidity', 'Office humidity', 'Office', 'humidity', 41, '%'),
  demoSensor('bedroom-humidity', 'Bedroom humidity', 'Bedroom', 'humidity', 48, '%'),
  demoSensor('living-co2', 'Living room CO2', 'Living room', 'carbon_dioxide', 612, 'ppm'),
  demoSensor('office-co2', 'Office CO2', 'Office', 'carbon_dioxide', 845, 'ppm'),
  demoSensor('living-pm25', 'Living room PM2.5', 'Living room', 'pm25', 8, 'µg/m³'),
  demoSensor('office-battery', 'Office sensor battery', 'Office', 'battery', 87, '%'),
];
