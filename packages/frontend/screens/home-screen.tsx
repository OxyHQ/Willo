import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AskHeader } from '../components/headers';
import { CameraCard } from '../components/camera-card';
import { Icon, type IconName } from '@willo/ui';
import { IconButton, Label, Tile } from '@willo/ui';
import { type ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import { colors } from '@willo/ui';
export function HomeScreen({ onNavigate }: ScreenProps) {
  const { state, dispatch, setSheet } = useHome();
  const filters: { icon: IconName; label: string; action: () => void }[] = [
    { icon: 'grid', label: 'All devices', action: () => onNavigate('devices') },
    { icon: 'camera', label: 'Cameras', action: () => setSheet({ kind: 'camera', title: 'Living room camera' }) },
    { icon: 'light', label: 'Lighting', action: () => setSheet({ kind: 'device', title: 'Light', id: 'light' }) },
    { icon: 'wifi', label: 'Wi-Fi', action: () => onNavigate('settings') },
  ];
  return <View className="flex-1 bg-white"><AskHeader onNavigate={onNavigate}/>
    <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: 18 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Favorites" accessibilityState={{ selected: true }} className="h-[50px] flex-row items-center justify-center gap-2 rounded-[18px] bg-home-sky px-5"><Icon name="heart" filled size={21} color={colors.onSky}/><Label className="text-[14px] font-medium text-home-on-sky">Favorites</Label></Pressable>
        {filters.map(filter => <Pressable key={filter.label} accessibilityRole="button" accessibilityLabel={filter.label} onPress={filter.action} className="h-[50px] w-[50px] items-center justify-center rounded-full bg-home-surface active:opacity-70"><Icon name={filter.icon} size={23} color={colors.muted}/></Pressable>)}
      </ScrollView>
      <View className="gap-2 px-4"><CameraCard height={188}/>
        <View className="flex-row gap-2"><Tile title="Front door lock" subtitle={state.locked ? 'Locked' : 'Unlocked'} icon={state.locked ? 'lock' : 'unlock'} tone={state.locked ? 'blue' : 'neutral'} active={state.locked} onPress={() => dispatch({ type: 'TOGGLE_LOCK' })}/><Tile title="Light" subtitle={state.devices.light ? `On · ${state.brightness.light}%` : 'Off'} icon="light" tone={state.devices.light ? 'yellow' : 'neutral'} active={state.devices.light} brightness={state.devices.light ? state.brightness.light : undefined} onPress={() => dispatch({ type: 'TOGGLE_DEVICE', id: 'light' })} onLongPress={() => setSheet({ kind: 'device', title: 'Light', id: 'light' })}/></View>
        <View className="rounded-[28px] bg-home-peach p-4"><View className="flex-row items-center gap-3"><Icon name="climate" size={22} color={colors.onPeach}/><Label className="flex-1 text-[14px] font-medium text-home-on-peach">Downstairs</Label><IconButton icon="chevron" label="Thermostat information" color={colors.onPeach} size={18} onPress={() => setSheet({ kind: 'message', title: 'Downstairs thermostat', description: 'Use + and − to adjust the demo thermostat from 50°F to 90°F. No physical thermostat is connected.' })}/></View>
          <View className="mt-3 flex-row items-center justify-between"><IconButton icon="minus" label="Decrease temperature" color={colors.onPeach} shape="stepper" className="bg-home-peach-button" disabled={state.temperature <= 50} onPress={() => dispatch({ type: 'TEMPERATURE', delta: -1 })}/><Label selectable accessibilityLiveRegion="polite" className="text-[65px] leading-[80px] text-home-on-peach" style={{ fontVariant: ['tabular-nums'] }}>{state.temperature}</Label><IconButton icon="plus" label="Increase temperature" color={colors.onPeach} shape="stepper" className="bg-home-peach-button" disabled={state.temperature >= 90} onPress={() => dispatch({ type: 'TEMPERATURE', delta: 1 })}/></View>
          <Label className="mb-4 mt-1 text-center text-[13px] text-home-on-peach">Comfort</Label>
        </View>
        <View className="flex-row gap-2"><Tile title="San Francisco" subtitle="56° · Clear" icon="sun" height={72} onPress={() => setSheet({ kind: 'message', title: 'Weather preview', description: 'The weather and location are static values from the supplied reference.' })}/><Tile title="Outdoor AQI" subtitle="32 · Good" icon="waves" height={72} onPress={() => setSheet({ kind: 'message', title: 'Air quality preview', description: 'AQI 32 is a static reference value, not a live reading.' })}/></View>
      </View>
    </ScrollView>
  </View>;
}
