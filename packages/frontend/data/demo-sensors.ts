import type { TFunction } from 'i18next';
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
 * "+N more" row. Fahrenheit, matching the demo thermostat. Built with `t` so
 * the demo's names and rooms follow the UI language — real sensors keep the
 * names their owner gave them in Home Assistant.
 */
export function demoSensors(t: TFunction): Device[] {
  const livingRoom = t('demo.rooms.livingRoom');
  const office = t('demo.rooms.office');
  const bedroom = t('demo.rooms.bedroom');
  return [
    demoSensor('living-temperature', t('demo.sensors.livingTemperature'), livingRoom, 'temperature', 70, '°F'),
    demoSensor('office-temperature', t('demo.sensors.officeTemperature'), office, 'temperature', 68, '°F'),
    demoSensor('bedroom-temperature', t('demo.sensors.bedroomTemperature'), bedroom, 'temperature', 66, '°F'),
    demoSensor('living-humidity', t('demo.sensors.livingHumidity'), livingRoom, 'humidity', 45, '%'),
    demoSensor('office-humidity', t('demo.sensors.officeHumidity'), office, 'humidity', 41, '%'),
    demoSensor('bedroom-humidity', t('demo.sensors.bedroomHumidity'), bedroom, 'humidity', 48, '%'),
    demoSensor('living-co2', t('demo.sensors.livingCo2'), livingRoom, 'carbon_dioxide', 612, 'ppm'),
    demoSensor('office-co2', t('demo.sensors.officeCo2'), office, 'carbon_dioxide', 845, 'ppm'),
    demoSensor('living-pm25', t('demo.sensors.livingPm25'), livingRoom, 'pm25', 8, 'µg/m³'),
    demoSensor('office-battery', t('demo.sensors.officeBattery'), office, 'battery', 87, '%'),
  ];
}
