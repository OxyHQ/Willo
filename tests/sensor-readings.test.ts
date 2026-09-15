import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRelevantSensors } from '../packages/frontend/providers/sensor-readings.ts';
import type { Device } from '../packages/frontend/providers/types.ts';

const sensor = (name: string, deviceClass: string | null, room: string | null = 'Living room', value: number | null = 20): Device => ({
  id: `sensor.${name.toLowerCase().replaceAll(' ', '_')}`,
  name,
  room,
  domain: 'sensor',
  capabilities: [{ kind: 'measurement', value, unit: null, deviceClass }],
});
const names = (devices: Device[]) => devices.map(device => device.name);

test('diagnostic sensors and sensors without a device class are left out', () => {
  const selected = selectRelevantSensors([
    sensor('Thermostat battery', 'battery'),
    sensor('Hub signal', 'signal_strength'),
    sensor('Plug energy', 'energy'),
    sensor('Uptime', null),
    sensor('Living temperature', 'temperature'),
  ]);
  assert.deepEqual(names(selected), ['Living temperature']);
});

test('a relevant sensor with no current value is left out', () => {
  assert.deepEqual(selectRelevantSensors([sensor('Living humidity', 'humidity', 'Living room', null)]), []);
});

test('a non-sensor device carrying a measurement is left out', () => {
  const thermostat: Device = { ...sensor('Thermostat', 'temperature'), domain: 'climate' };
  assert.deepEqual(selectRelevantSensors([thermostat]), []);
});

test('readings are ordered by importance: temperature, then humidity, then CO2', () => {
  const selected = selectRelevantSensors([
    sensor('Living CO2', 'carbon_dioxide'),
    sensor('Living humidity', 'humidity'),
    sensor('Living temperature', 'temperature'),
  ]);
  assert.deepEqual(names(selected), ['Living temperature', 'Living humidity', 'Living CO2']);
});

test('every room gets its first reading of a class before any room gets a second', () => {
  const selected = selectRelevantSensors([
    sensor('Bedroom humidity', 'humidity', 'Bedroom'),
    sensor('Bedroom temperature', 'temperature', 'Bedroom'),
    sensor('Bedroom window temperature', 'temperature', 'Bedroom'),
    sensor('Kitchen humidity', 'humidity', 'Kitchen'),
    sensor('Kitchen temperature', 'temperature', 'Kitchen'),
    sensor('Office humidity', 'humidity', 'Office'),
    sensor('Office temperature', 'temperature', 'Office'),
  ]);
  assert.deepEqual(names(selected).slice(0, 4), ['Bedroom temperature', 'Kitchen temperature', 'Office temperature', 'Bedroom window temperature']);
  assert.deepEqual(names(selected).slice(4), ['Bedroom humidity', 'Kitchen humidity', 'Office humidity']);
});

test('every relevant sensor is returned, not just the ones the card has room for', () => {
  const rooms = ['Bedroom', 'Kitchen', 'Office', 'Hall', 'Bathroom'];
  const selected = selectRelevantSensors(rooms.flatMap(room => [sensor(`${room} temperature`, 'temperature', room), sensor(`${room} humidity`, 'humidity', room)]));
  assert.equal(selected.length, 10);
});
