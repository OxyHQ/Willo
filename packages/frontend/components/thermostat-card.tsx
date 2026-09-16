import React from 'react';
import { View } from 'react-native';
import { useHome } from '../state/home-context';
import { useResponsiveLayout } from '../layout/responsive-context';
import { Icon } from '@willo.sh/ui';
import { IconButton, Label } from '@willo.sh/ui';
import { parseRgb, useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';
import { convertTemperature, formatTemperature } from '../providers/unit-system';

// `tertiary` is pinned to Willo's own peach in `BloomProvider`
// (`app/_layout.tsx`'s `tertiaryColor`), not left to the seed's own
// auto-derived hue — see that prop's doc comment. The +/- buttons use the
// SOLID `tertiary` fill (not the `-subtle` tint the card itself uses) so
// they read as real, pressable buttons against the card's own softer tone.
/**
 * How much of the `tertiary` fill's brightness the +/- glyphs keep: the same
 * orange as the button, just much darker. Derived from the live fill rather
 * than a fixed hex so it follows the theme; `tertiary-text` can't be used
 * because in dark mode it's a LIGHT tint, while the fill stays bright orange
 * in both modes.
 */
const STEPPER_ICON_SHADE = 0.35;
function darkenedTertiary(tertiary: string, fallback: string): string {
  const channels = parseRgb(tertiary);
  if (!channels) return fallback;
  const shade = (channel: number) => Math.round(channel * STEPPER_ICON_SHADE);
  return `rgb(${shade(channels.r)} ${shade(channels.g)} ${shade(channels.b)})`;
}
export function ThermostatCard({ height }: { height: number }) {
  const { state, dispatch, setSheet, unitSystem } = useHome();
  // The demo reducer counts in whole °F (50–90); only what's displayed follows the Home's unit system.
  const displayed = convertTemperature(state.temperature, '°F', unitSystem);
  const minimum = formatTemperature(50, '°F', unitSystem);
  const maximum = formatTemperature(90, '°F', unitSystem);
  const { compact } = useResponsiveLayout();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
  const stepperIconColor = darkenedTertiary(themeColors.tertiary, themeColors.tertiaryForeground);
  // Steppers beside the reading, never under it: that's what lets the card
  // stand exactly as tall as the two tiles next to it (`cardHeight`).
  const decrease = <IconButton icon="remove-bold" label={t('thermostat.decrease')} color={stepperIconColor} shape="stepper"
    className="bg-tertiary" disabled={state.temperature <= 50} onPress={() => dispatch({ type: 'TEMPERATURE', delta: -1 })}/>;
  const increase = <IconButton icon="add-bold" label={t('thermostat.increase')} color={stepperIconColor} shape="stepper"
    className="bg-tertiary" disabled={state.temperature >= 90} onPress={() => dispatch({ type: 'TEMPERATURE', delta: 1 })}/>;
  return <View className="justify-between rounded-[28px] bg-tertiary-subtle p-4" style={{ height }}>
    <View className="flex-row items-center gap-2">
      <Icon name="climate" size={20} color={themeColors.tertiary}/><Label className="min-w-0 flex-1 text-[14px] font-medium text-tertiary-text">{t('thermostat.downstairs')}</Label>
      <IconButton icon="chevron" label={t('thermostat.info')} color={themeColors.tertiary} size={16} shape="small"
        onPress={() => setSheet({ kind: 'message', title: t('thermostat.infoTitle'), description: t('thermostat.infoDescription', { minimum, maximum }) })}/>
    </View>
    <View className="flex-row items-center justify-between">
      {decrease}
      <View className="min-w-0 flex-1 items-center">
        <Label selectable testID="thermostat-value" accessibilityLabel={displayed.unit === '°F' ? t('thermostat.valueFahrenheit', { value: displayed.value }) : t('thermostat.valueCelsius', { value: displayed.value })} accessibilityLiveRegion="polite"
          className={`${compact ? 'text-[44px] leading-[52px]' : 'text-[48px] leading-[56px]'} text-tertiary-text`}
          style={{ fontVariant: ['tabular-nums'] }}>{displayed.value}</Label>
      </View>
      {increase}
    </View>
    <Label className="text-center text-[13px] text-tertiary-text">{t('thermostat.comfort')}</Label>
  </View>;
}
