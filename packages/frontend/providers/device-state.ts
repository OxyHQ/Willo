import type { ParseKeys, TFunction } from 'i18next';
import { getCapability, type Device, type DeviceCommand } from './types';
import type { TemperatureUnit } from './unit-system';

/**
 * What a device says and does, read from its capabilities alone — no React, so
 * the wording and the tap behaviour of every device type are covered by
 * `tests/device-state.test.ts` rather than only by looking at a screen.
 */
/** Written out rather than built as `deviceState.mode.${mode}`: `tests/i18n-catalogs.test.ts` only sees keys that appear literally in the source. */
const CLIMATE_MODE_KEYS = {
  heat: 'deviceState.mode.heat', cool: 'deviceState.mode.cool', auto: 'deviceState.mode.auto',
} as const satisfies Record<string, ParseKeys>;

const APPLIANCE_STATE_KEYS = {
  idle: 'deviceState.idle', running: 'deviceState.running', paused: 'deviceState.paused', finished: 'deviceState.finished',
} as const satisfies Record<string, ParseKeys>;

/**
 * What a device says about itself under its name — the first capability that
 * has a state worth reading, in the order a person would look for it. Pure, so
 * the wording of every device type is covered by `tests/device-tile.test.ts`
 * rather than only by looking at a screen.
 */
export function describeDevice(device: Device, t: TFunction, temperature: (value: number, unit: TemperatureUnit) => string): string {
  const lock = getCapability(device, 'lock');
  if (lock) return t(lock.locked ? 'deviceState.locked' : 'deviceState.unlocked');

  const cover = getCapability(device, 'cover');
  if (cover) {
    if (!cover.open) return t('deviceState.closed');
    return cover.position === null ? t('deviceState.open') : t('deviceState.openPercent', { percent: cover.position });
  }

  const appliance = getCapability(device, 'appliance');
  if (appliance) {
    const state = t(APPLIANCE_STATE_KEYS[appliance.state]);
    return appliance.state === 'running' && appliance.remainingMinutes !== null
      ? t('deviceState.runningWithTime', { state, minutes: appliance.remainingMinutes })
      : state;
  }

  const climate = getCapability(device, 'climate');
  if (climate) {
    if (climate.mode === 'off') return t('deviceState.off');
    const mode = t(CLIMATE_MODE_KEYS[climate.mode]);
    if (climate.current === null || climate.target === null) return mode;
    return t('deviceState.climate', { mode, current: temperature(climate.current, climate.unit), target: temperature(climate.target, climate.unit) });
  }

  const media = getCapability(device, 'media');
  if (media) {
    if (!media.playing) return t('deviceState.paused');
    return media.volume === null ? t('deviceState.playing') : t('deviceState.playingPercent', { percent: media.volume });
  }

  const measurement = getCapability(device, 'measurement');
  if (measurement) {
    if (measurement.value === null) return '—';
    return measurement.unit === '°C' || measurement.unit === '°F'
      ? temperature(measurement.value, measurement.unit)
      : `${measurement.value}${measurement.unit ? ` ${measurement.unit}` : ''}`;
  }

  const binarySensor = getCapability(device, 'binarySensor');
  if (binarySensor) return t(binarySensor.active ? 'deviceState.detected' : 'deviceState.clear');

  const onOff = getCapability(device, 'onOff');
  const percent = getCapability(device, 'brightness')?.percent ?? getCapability(device, 'fanSpeed')?.percent ?? null;
  if (onOff?.on && percent !== null) return t('deviceState.onPercent', { percent });
  return t(onOff?.on ? 'deviceState.on' : 'deviceState.off');
}

/** Whether a device reads as "doing something" — what drives the lit tone and the switch's checked state. */
export function isActive(device: Device): boolean {
  const lock = getCapability(device, 'lock');
  if (lock) return lock.locked;
  const cover = getCapability(device, 'cover');
  if (cover) return cover.open;
  const appliance = getCapability(device, 'appliance');
  if (appliance) return appliance.state === 'running';
  const climate = getCapability(device, 'climate');
  if (climate) return climate.mode !== 'off';
  const media = getCapability(device, 'media');
  if (media) return media.playing;
  return getCapability(device, 'onOff')?.on ?? false;
}

/** The single slider a tile can drag, and the command that commits it. Brightness, fan speed, how far a cover is open, or volume — never two at once. */
export function draggable(device: Device): { percent: number; command: (percent: number) => DeviceCommand } | null {
  const brightness = getCapability(device, 'brightness');
  if (brightness) return { percent: brightness.percent ?? 0, command: percent => percent === 0 ? { kind: 'setOnOff', on: false } : { kind: 'setBrightness', percent } };
  const fanSpeed = getCapability(device, 'fanSpeed');
  if (fanSpeed) return { percent: fanSpeed.percent ?? 0, command: percent => percent === 0 ? { kind: 'setOnOff', on: false } : { kind: 'setFanSpeed', percent } };
  const cover = getCapability(device, 'cover');
  if (cover?.position !== null && cover !== undefined) return { percent: cover.position ?? 0, command: percent => ({ kind: 'setCoverPosition', percent }) };
  const media = getCapability(device, 'media');
  if (media?.volume != null) return { percent: media.volume, command: percent => ({ kind: 'setVolume', percent }) };
  return null;
}

/** What tapping the tile does: the one obvious action for whatever this device is. */
export function primaryCommand(device: Device): DeviceCommand | null {
  const lock = getCapability(device, 'lock');
  if (lock) return { kind: 'setLocked', locked: !lock.locked };
  const cover = getCapability(device, 'cover');
  if (cover) return { kind: 'setCoverPosition', percent: cover.open ? 0 : 100 };
  const appliance = getCapability(device, 'appliance');
  if (appliance) return { kind: 'setApplianceState', state: appliance.state === 'running' ? 'paused' : 'running' };
  const media = getCapability(device, 'media');
  if (media) return { kind: 'setPlaying', playing: !media.playing };
  const climate = getCapability(device, 'climate');
  if (climate) return { kind: 'setOnOff', on: climate.mode === 'off' };
  const onOff = getCapability(device, 'onOff');
  if (onOff) return { kind: 'setOnOff', on: !onOff.on };
  return null;
}
