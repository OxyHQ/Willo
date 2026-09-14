import React from 'react';
import { View } from 'react-native';
import { useHome } from '../state/home-context';
import { useResponsiveLayout } from '../layout/responsive-context';
import { Icon } from '@willo/ui';
import { IconButton, Label } from '@willo/ui';
import { useTheme } from '@oxy.so/bloom/theme';

// `tertiary` is pinned to Willo's own peach in `BloomProvider`
// (`app/_layout.tsx`'s `tertiaryColor`), not left to the seed's own
// auto-derived hue — see that prop's doc comment. The +/- buttons use the
// SOLID `tertiary` fill (not the `-subtle` tint the card itself uses) so
// they read as real, pressable buttons against the card's own softer tone.
export function ThermostatCard() {
  const { state, dispatch, setSheet } = useHome();
  const { compact, fontScale } = useResponsiveLayout();
  const { colors: themeColors } = useTheme();
  const sideControls = compact && fontScale <= 1.2;
  const decrease = <IconButton icon="minus" label="Decrease temperature" color={themeColors.tertiaryForeground} shape={sideControls ? 'stepper' : 'regular'}
    className="bg-tertiary" disabled={state.temperature <= 50} onPress={() => dispatch({ type: 'TEMPERATURE', delta: -1 })}/>;
  const increase = <IconButton icon="plus" label="Increase temperature" color={themeColors.tertiaryForeground} shape={sideControls ? 'stepper' : 'regular'}
    className="bg-tertiary" disabled={state.temperature >= 90} onPress={() => dispatch({ type: 'TEMPERATURE', delta: 1 })}/>;
  return <View className="rounded-[28px] bg-tertiary-subtle p-4">
    <View className="flex-row items-center gap-2">
      <Icon name="climate" size={20} color={themeColors.tertiary}/><Label className="min-w-0 flex-1 text-[14px] font-medium text-tertiary-text">Downstairs</Label>
      <IconButton icon="chevron" label="Thermostat information" color={themeColors.tertiary} size={16} shape="small"
        onPress={() => setSheet({ kind: 'message', title: 'Downstairs thermostat', description: 'Use + and − to adjust the demo thermostat from 50°F to 90°F. No physical thermostat is connected.' })}/>
    </View>
    <View className="mt-2 flex-row items-center justify-between">
      {sideControls && decrease}
      <View className="min-w-0 flex-1 items-center">
        <Label selectable testID="thermostat-value" accessibilityLabel={`${state.temperature} degrees Fahrenheit`} accessibilityLiveRegion="polite"
          className={`${compact ? 'text-[65px] leading-[80px]' : 'text-[58px] leading-[72px]'} text-tertiary-text`}
          style={{ fontVariant: ['tabular-nums'] }}>{state.temperature}</Label>
      </View>
      {sideControls && increase}
    </View>
    <Label className="mb-3 mt-1 text-center text-[13px] text-tertiary-text">Comfort</Label>
    {!sideControls && <View className="flex-row items-center justify-around gap-2">{decrease}{increase}</View>}
  </View>;
}
