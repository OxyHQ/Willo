import React from 'react';
import { View } from 'react-native';
import { useHome } from '../state/home-context';
import { useResponsiveLayout } from '../layout/responsive-context';
import { colors } from '@willo/ui';
import { Icon } from '@willo/ui';
import { IconButton, Label } from '@willo/ui';

export function ThermostatCard() {
  const { state, dispatch, setSheet } = useHome();
  const { compact, fontScale } = useResponsiveLayout();
  const sideControls = compact && fontScale <= 1.2;
  const decrease = <IconButton icon="minus" label="Decrease temperature" color={colors.onPeach} shape={sideControls ? 'stepper' : 'regular'}
    className="bg-home-peach-button" disabled={state.temperature <= 50} onPress={() => dispatch({ type: 'TEMPERATURE', delta: -1 })}/>;
  const increase = <IconButton icon="plus" label="Increase temperature" color={colors.onPeach} shape={sideControls ? 'stepper' : 'regular'}
    className="bg-home-peach-button" disabled={state.temperature >= 90} onPress={() => dispatch({ type: 'TEMPERATURE', delta: 1 })}/>;
  return <View className="rounded-[28px] bg-home-peach p-4">
    <View className="flex-row items-center gap-2">
      <Icon name="climate" size={20} color={colors.onPeach}/><Label className="min-w-0 flex-1 text-[14px] font-medium text-home-on-peach">Downstairs</Label>
      <IconButton icon="chevron" label="Thermostat information" color={colors.onPeach} size={16} shape="small"
        onPress={() => setSheet({ kind: 'message', title: 'Downstairs thermostat', description: 'Use + and − to adjust the demo thermostat from 50°F to 90°F. No physical thermostat is connected.' })}/>
    </View>
    <View className="mt-2 flex-row items-center justify-between">
      {sideControls && decrease}
      <View className="min-w-0 flex-1 items-center">
        <Label selectable testID="thermostat-value" accessibilityLabel={`${state.temperature} degrees Fahrenheit`} accessibilityLiveRegion="polite"
          className={`${compact ? 'text-[65px] leading-[80px]' : 'text-[58px] leading-[72px]'} text-home-on-peach`}
          style={{ fontVariant: ['tabular-nums'] }}>{state.temperature}</Label>
      </View>
      {sideControls && increase}
    </View>
    <Label className="mb-3 mt-1 text-center text-[13px] text-home-on-peach">Comfort</Label>
    {!sideControls && <View className="flex-row items-center justify-around gap-2">{decrease}{increase}</View>}
  </View>;
}
