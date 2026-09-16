import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tile, useOptimisticValue, type IconName, type Tone } from '@willo.sh/ui';
import { type Device } from '../providers/types';
import { describeDevice, draggable, isActive, primaryCommand } from '../providers/device-state';
import { formatTemperature } from '../providers/unit-system';
import { useHome, useHomeActions } from '../state/home-context';

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
 *
 * Memoised, and every handler below is stable, because a screen holds dozens
 * of these: without it a push about ONE device re-rendered all of them, and
 * each re-render handed `Tile` new callbacks, which made it reconfigure its
 * gesture recognisers with native. `replaceOrAppend` in the tunnel keeps the
 * object identity of a device nothing happened to, which is what lets the
 * memo actually bail out.
 */
export const DeviceTile = React.memo(function DeviceTile({ device, height, grow = true }: { device: Device; height?: number; grow?: boolean }) {
  const { unitSystem } = useHome();
  const { setSheet, sendCommand } = useHomeActions();
  const { t } = useTranslation();
  const drag = draggable(device);
  // The dragged percent leads the round trip to the device, and the subtitle
  // is built from that same live value, so text and fill move together.
  const [percent, setPercent] = useOptimisticValue(drag?.percent ?? 0);
  const appearance = DOMAIN_APPEARANCE[device.domain] ?? FALLBACK_APPEARANCE;
  const active = isActive(device);
  const command = primaryCommand(device);
  const dragCommand = drag?.command;
  const handlePress = useCallback(() => { if (command) sendCommand(device.id, command); }, [command, device.id, sendCommand]);
  const handleLongPress = useCallback(() => setSheet({ kind: 'realDevice', title: device.name, device }), [device, setSheet]);
  // `Tile` animates the fill itself, on the UI thread, so React hears about a
  // drag only at the rate the device is actually commanded. That one callback
  // does both: the subtitle follows the same number the device is being sent,
  // and neither costs a render per frame.
  const handleBrightnessCommit = useMemo(
    () => dragCommand && ((next: number) => { setPercent(next); sendCommand(device.id, dragCommand(next)); }),
    [dragCommand, device.id, sendCommand, setPercent],
  );
  return <Tile grow={grow} height={height} title={device.name}
    subtitle={describeDevice(drag ? withDraggedPercent(device, percent) : device, t, (value, unit) => formatTemperature(value, unit, unitSystem))}
    icon={appearance.icon} tone={active ? appearance.tone : 'neutral'} active={active}
    /* The fill only paints while the device is actually on: an idle tile has
       no tone of its own, so a fill there would show up in the fallback
       colour (a paused speaker reading 45% looked like a lit light). Dragging
       still works — `onBrightnessChange` is what enables the gesture. */
    brightness={drag && active ? percent : undefined}
    onBrightnessCommit={handleBrightnessCommit}
    onPress={handlePress}
    onLongPress={handleLongPress}
    accessibilityHint={drag ? t('tile.dragHint') : t('tile.holdHint')}/>;
});

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
