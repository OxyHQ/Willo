import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon, Label } from '@willo/ui';
import { useTheme } from '@oxy.so/bloom/theme';
import { getCapability, type Device } from '../providers/types';
import { formatTemperature, type UnitSystem } from '../providers/unit-system';
import { useHome } from '../state/home-context';

/**
 * A temperature follows the Home's unit system; `45%` hugs its number; every
 * other unit (`ppm`, `µg/m³`, `lx`) is the same in both systems and reads as
 * its own word.
 */
const formatReading = (value: number | null, unit: string | null, unitSystem: UnitSystem) => {
  if (value === null) return '—';
  if (unit === '°C' || unit === '°F') return formatTemperature(value, unit, unitSystem);
  if (!unit) return `${value}`;
  return unit === '%' ? `${value}${unit}` : `${value} ${unit}`;
};

/**
 * A titled list of sensor readings on the green tone's tinted surface — the
 * same shape as `ThermostatCard`'s `bg-tertiary-subtle` card, so the two read
 * as siblings on the dashboard. Which sensors to pass, and in what order, is
 * `selectRelevantSensors`'s job, not this component's.
 */
export function SensorReadingsCard({ title, sensors, hiddenCount = 0, onShowMore }: { title: string; sensors: Device[]; hiddenCount?: number; onShowMore?: () => void }) {
  const { colors: themeColors } = useTheme();
  const { unitSystem } = useHome();
  return <View className="gap-3 rounded-[28px] bg-success-subtle p-4">
    <View className="flex-row items-center gap-2">
      <Icon name="thermometer" size={20} color={themeColors.success}/>
      <Label className="min-w-0 flex-1 text-[14px] font-medium text-success-text">{title}</Label>
    </View>
    {sensors.length === 0 && <Label className="text-[12px] text-success-text">No sensors found</Label>}
    {sensors.map(sensor => {
      const measurement = getCapability(sensor, 'measurement');
      return <View key={sensor.id} className="flex-row items-center justify-between gap-3">
        <Label numberOfLines={1} className="min-w-0 flex-1 text-[12px] text-success-text">{sensor.name}</Label>
        <Label className="text-[12px] font-medium text-success-text" style={{ fontVariant: ['tabular-nums'] }}>{formatReading(measurement?.value ?? null, measurement?.unit ?? null, unitSystem)}</Label>
      </View>;
    })}
    {hiddenCount > 0 && onShowMore && <Pressable accessibilityRole="button" accessibilityLabel={`Show ${hiddenCount} more sensors`} onPress={onShowMore} className="flex-row items-center justify-between active:opacity-70">
      <Label className="text-[12px] font-medium text-success-text">+{hiddenCount} more</Label>
      <Icon name="chevron" size={14} color={themeColors.success}/>
    </Pressable>}
  </View>;
}
