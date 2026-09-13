import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ClassicHeader } from '../components/headers';
import { CameraCard } from '../components/camera-card';
import { Icon, type IconName } from '@willo/ui';
import { Label, SectionTitle, Tile } from '@willo/ui';
import { type ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import { tones, type Tone } from '@willo/ui';
const categories: { icon: IconName; title: string; detail: string; tone: Tone }[] = [
  { icon: 'camera', title: 'Cameras', detail: '6 cameras', tone: 'blue' },
  { icon: 'light', title: 'Lighting', detail: '8 lights', tone: 'yellow' },
  { icon: 'wifi', title: 'Wi-Fi', detail: '2 devices', tone: 'green' },
  { icon: 'climate', title: 'Climate', detail: '2 devices', tone: 'peach' },
];
export function FavoritesScreen({ onNavigate, withAssistant = false }: ScreenProps & { withAssistant?: boolean }) {
  const { state, dispatch, setSheet, notify } = useHome();
  const [assistantVacuum, setAssistantVacuum] = useState(true);
  const vacuumRunning = withAssistant ? assistantVacuum : state.devices.vacuum;
  const displayCategories = withAssistant ? [categories[0]!, categories[1]!, categories[3]!, categories[2]!] : categories;
  return <View className="flex-1 bg-white"><ClassicHeader title="Spring Street Home" home notifications={!withAssistant} onNavigate={onNavigate}/><ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: 18 }}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
      {displayCategories.map(category => <Pressable key={category.title} accessibilityRole="button" accessibilityLabel={category.title} onPress={() => category.title === 'Cameras' ? setSheet({ kind: 'camera', title: 'Backyard camera', garden: true }) : onNavigate(category.title === 'Wi-Fi' ? 'settings' : 'devices')} className={`h-[100px] w-[104px] justify-between rounded-[23px] p-3.5 active:opacity-70 ${tones[category.tone].tile}`}><Icon name={category.icon} size={20} color={tones[category.tone].color}/><View><Label className="text-[12px]">{category.title}</Label><Label className="mt-0.5 text-[10px]">{withAssistant && category.title === 'Cameras' ? '3 cameras' : withAssistant && category.title === 'Lighting' ? '12 lights' : category.detail}</Label></View></Pressable>)}
    </ScrollView>
    <View className="px-4"><SectionTitle>Favorites</SectionTitle><View className="gap-2">
      {withAssistant ? <View className="flex-row gap-2"><Tile title="Broadcast" icon="broadcast" onPress={() => setSheet({ kind: 'message', title: 'Broadcast', description: 'Broadcast is represented as a UI shortcut. No microphone is activated and no audio is sent.' })}/><Tile title="Assistant" icon="microphone" onPress={() => onNavigate('assistant')}/></View> : <View className="flex-row gap-2"><Tile title="Hallway thermostat" subtitle="Indoor 70°" icon="thermometer" tone="peach" chevron onPress={() => onNavigate('home')}/><Tile title="Front door lock" subtitle={state.locked ? 'Locked' : 'Unlocked'} tone={state.locked ? 'blue' : 'neutral'} icon={state.locked ? 'lock' : 'unlock'} active={state.locked} onPress={() => dispatch({ type: 'TOGGLE_LOCK' })}/></View>}
      <CameraCard garden showNest={false} height={196} label={withAssistant ? 'Nest Camera\nBackyard' : 'Yard cam'}/>
      <View className="flex-row gap-2"><Tile title={withAssistant ? 'Kitchen pantry light' : 'Pantry light'} subtitle={state.devices.pantry ? `On · ${state.brightness.pantry}%` : 'Off'} icon="light" tone={state.devices.pantry ? 'yellow' : 'neutral'} active={state.devices.pantry} brightness={state.devices.pantry ? state.brightness.pantry : undefined} onPress={() => dispatch({ type: 'TOGGLE_DEVICE', id: 'pantry' })} onLongPress={() => setSheet({ kind: 'device', title: 'Pantry light', id: 'pantry' })}/><Tile title="Movie mode" icon="sparkle" tone={state.movieMode ? 'blue' : 'neutral'} active={state.movieMode} onPress={() => { dispatch({ type: 'TOGGLE_MOVIE' }); notify(state.movieMode ? 'Movie mode stopped' : 'Movie mode started in demo'); }}/></View>
      <View className="flex-row gap-2"><Tile title="Living room blinds" subtitle={state.devices.blinds ? 'Open' : 'Closed'} icon="blinds" tone={state.devices.blinds ? 'blue' : 'neutral'} onPress={() => dispatch({ type: 'TOGGLE_DEVICE', id: 'blinds' })}/><Tile title="Vacuum" subtitle={vacuumRunning ? 'Running' : 'Paused'} icon="vacuum" tone={vacuumRunning ? 'blue' : 'neutral'} onPress={() => withAssistant ? setAssistantVacuum(value => !value) : dispatch({ type: 'TOGGLE_DEVICE', id: 'vacuum' })}/></View>
    </View></View>
  </ScrollView></View>;
}
