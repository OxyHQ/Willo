import test from 'node:test';
import assert from 'node:assert/strict';
import { describeDevice, isActive, primaryCommand } from '../packages/frontend/providers/device-state.ts';
import type { Device, DeviceCapability } from '../packages/frontend/providers/types.ts';

// The real `t` resolves keys against the catalogue; here the key itself is the
// answer, so a test says which string a device asks for, not how it's worded.
const t = ((key: string, values?: Record<string, unknown>) =>
  values ? `${key}(${Object.entries(values).map(([name, value]) => `${name}=${String(value)}`).join(',')})` : key) as never;
const temperature = (value: number, unit: string) => `${value}${unit}`;
const device = (domain: string, ...capabilities: DeviceCapability[]): Device => ({ id: `${domain}.one`, name: domain, room: null, domain, capabilities });
const describe = (subject: Device) => describeDevice(subject, t, temperature);

test('a lock reads locked or unlocked, and tapping it turns the key the other way', () => {
  const locked = device('lock', { kind: 'lock', locked: true });
  assert.equal(describe(locked), 'deviceState.locked');
  assert.equal(isActive(locked), true);
  assert.deepEqual(primaryCommand(locked), { kind: 'setLocked', locked: false });
});

test('a cover reads how far open it is, and tapping a closed one opens it fully', () => {
  assert.equal(describe(device('cover', { kind: 'cover', position: 40, open: true })), 'deviceState.openPercent(percent=40)');
  assert.equal(describe(device('cover', { kind: 'cover', position: 0, open: false })), 'deviceState.closed');
  // A garage door reports no position, only whether it's open.
  assert.equal(describe(device('garage', { kind: 'cover', position: null, open: true })), 'deviceState.open');
  assert.deepEqual(primaryCommand(device('cover', { kind: 'cover', position: 0, open: false })), { kind: 'setCoverPosition', percent: 100 });
});

test('a running appliance reads its time left, and tapping it pauses', () => {
  const running = device('washer', { kind: 'appliance', state: 'running', remainingMinutes: 12 });
  assert.equal(describe(running), 'deviceState.runningWithTime(state=deviceState.running,minutes=12)');
  assert.equal(isActive(running), true);
  assert.deepEqual(primaryCommand(running), { kind: 'setApplianceState', state: 'paused' });
  assert.equal(describe(device('washer', { kind: 'appliance', state: 'finished', remainingMinutes: null })), 'deviceState.finished');
});

test('a thermostat reads its mode and both temperatures, and an off one just reads off', () => {
  assert.equal(describe(device('climate', { kind: 'climate', current: 21.5, target: 22, unit: '°C', mode: 'heat' })),
    'deviceState.climate(mode=deviceState.mode.heat,current=21.5°C,target=22°C)');
  const off = device('climate', { kind: 'climate', current: 19, target: 20, unit: '°C', mode: 'off' });
  assert.equal(describe(off), 'deviceState.off');
  assert.equal(isActive(off), false);
});

test('a speaker reads its volume while playing and pauses when tapped', () => {
  const playing = device('media_player', { kind: 'media', playing: true, volume: 30 });
  assert.equal(describe(playing), 'deviceState.playingPercent(percent=30)');
  assert.deepEqual(primaryCommand(playing), { kind: 'setPlaying', playing: false });
  assert.equal(describe(device('media_player', { kind: 'media', playing: false, volume: 30 })), 'deviceState.paused');
});

test('a dimmed light reads its percentage, and an off one reads off', () => {
  assert.equal(describe(device('light', { kind: 'onOff', on: true }, { kind: 'brightness', percent: 62 })), 'deviceState.onPercent(percent=62)');
  assert.equal(describe(device('light', { kind: 'onOff', on: false }, { kind: 'brightness', percent: 0 })), 'deviceState.off');
});

test('a reading shows its value with its unit, and a contact sensor says whether it tripped', () => {
  assert.equal(describe(device('sensor', { kind: 'measurement', value: 612, unit: 'ppm', deviceClass: 'carbon_dioxide' })), '612 ppm');
  assert.equal(describe(device('sensor', { kind: 'measurement', value: 21.5, unit: '°C', deviceClass: 'temperature' })), '21.5°C');
  assert.equal(describe(device('binary_sensor', { kind: 'binarySensor', active: true, deviceClass: 'window' })), 'deviceState.detected');
});
