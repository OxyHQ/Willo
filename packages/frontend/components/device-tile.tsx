import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tile, useOptimisticValue, type IconName, type Tone } from '@willo.sh/ui';
import { type Device } from '../providers/types';
import { describeDevice, draggable, isActive, primaryCommand } from '../providers/device-state';
import { formatTemperature } from '../providers/unit-system';
import { useHome } from '../state/home-context';

/**
 * How a device looks, by the domain its provider tagged it with — never
 * guessed from which capabilities happen to be present, so two lights look
 * alike whether or not one of them dims. `neutral` is the off/idle tone; the
 * lit tone below is what an active device switches to.
 */
const DOMAIN_APPEARANCE: Record<string, { icon: IconName; tone: Tone }> = {
  light: { icon: 'light', tone: 'yellow' },
  fan: { icon: 'fan', tone: 'blue' },
  climate: { icon: 'climate', tone: 'peach' },
  'air-conditioner': { icon: 'air-conditioner', tone: 'sky' },
  heater: { icon: 'heater', tone: 'peach' },
  purifier: { icon: 'purifier', tone: 'green' },
  humidifier: { icon: 'humidifier', tone: 'sky' },
  lock: { icon: 'lock', tone: 'blue' },
  cover: { icon: 'blinds', tone: 'blue' },
  garage: { icon: 'garage', tone: 'blue' },
  vacuum: { icon: 'vacuum', tone: 'blue' },
  'air-fryer': { icon: 'air-fryer', tone: 'peach' },
  oven: { icon: 'oven', tone: 'peach' },
  dishwasher: { icon: 'dishwasher', tone: 'sky' },
  washer: { icon: 'washer', tone: 'sky' },
  dryer: { icon: 'dryer', tone: 'sky' },
  coffee: { icon: 'coffee', tone: 'peach' },
  kettle: { icon: 'kettle', tone: 'peach' },
  'media_player': { icon: 'speaker', tone: 'blue' },
  tv: { icon: 'tv', tone: 'blue' },
  switch: { icon: 'plug', tone: 'blue' },
  doorbell: { icon: 'doorbell', tone: 'blue' },
  sensor: { icon: 'thermometer', tone: 'green' },
  binary_sensor: { icon: 'bell', tone: 'green' },
};
const FALLBACK_APPEARANCE = { icon: 'devices', tone: 'blue' } as const satisfies { icon: IconName; tone: Tone };

/**
 * Every device on every screen, real or demo, drawn from its capabilities —
 * one tile instead of the per-domain copies each screen used to keep. A real
 * component, not a helper called during render: `useOptimisticValue` is a hook
 * and these render in a dynamic-length list.
 */
export function DeviceTile({ device, height, grow = true }: { device: Device; height?: number; grow?: boolean }) {
  const { setSheet, sendCommand, unitSystem } = useHome();
  const { t } = useTranslation();
  const drag = draggable(device);
  // The dragged percent leads the round trip to the device, and the subtitle
  // is built from that same live value, so text and fill move together.
  const [percent, setPercent] = useOptimisticValue(drag?.percent ?? 0);
  const appearance = DOMAIN_APPEARANCE[device.domain] ?? FALLBACK_APPEARANCE;
  const active = isActive(device);
  const shown = drag ? withDraggedPercent(device, percent) : device;
  const command = primaryCommand(device);
  return <Tile grow={grow} height={height} title={device.name}
    subtitle={describeDevice(shown, t, (value, unit) => formatTemperature(value, unit, unitSystem))}
    icon={appearance.icon} tone={active ? appearance.tone : 'neutral'} active={active}
    /* The fill only paints while the device is actually on: an idle tile has
       no tone of its own, so a fill there would show up in the fallback
       colour (a paused speaker reading 45% looked like a lit light). Dragging
       still works — `onBrightnessChange` is what enables the gesture. */
    brightness={drag && active ? percent : undefined}
    onBrightnessChange={drag ? next => { setPercent(next); sendCommand(device.id, drag.command(next)); } : undefined}
    onPress={() => { if (command) sendCommand(device.id, command); }}
    onLongPress={() => setSheet({ kind: 'realDevice', title: device.name, device })}
    accessibilityHint={drag ? t('tile.dragHint') : t('tile.holdHint')}/>;
}

/** The device as the drag has it right now, so the subtitle reads from the same number as the fill. */
function withDraggedPercent(device: Device, percent: number): Device {
  return {
    ...device,
    capabilities: device.capabilities.map(capability => {
      if (capability.kind === 'brightness' || capability.kind === 'fanSpeed') return { ...capability, percent };
      if (capability.kind === 'cover') return { ...capability, position: percent, open: percent > 0 };
      if (capability.kind === 'media') return { ...capability, volume: percent };
      if (capability.kind === 'onOff') return { ...capability, on: percent > 0 };
      return capability;
    }),
  };
}
