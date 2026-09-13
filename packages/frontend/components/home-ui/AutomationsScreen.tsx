import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AUTOMATIONS, HOUSEHOLD_ROUTINES } from './fixtures';
import { Header, Icon, IconButton, SectionTitle } from './Primitives';
import type { Routine, ScreenProps } from './types';

function RoutineRow({ routine }: { routine: Routine }) {
  const [hasRun, setHasRun] = useState(false);
  return <View className="min-h-[78px] flex-row items-center gap-3 rounded-[22px] bg-willo-surface p-3 pl-4">
    <Icon name={routine.icon} size={22} />
    <View className="min-w-0 flex-1"><Text className="text-[13px] font-medium text-willo-ink">{routine.title}</Text>
      <Text numberOfLines={1} accessibilityLiveRegion="polite" className="mt-1 text-xs text-willo-secondary">
        {hasRun ? 'Preview played · no devices changed' : routine.subtitle}
      </Text></View>
    <IconButton icon={hasRun ? 'checkmark' : 'play-outline'} label={`${hasRun ? 'Reset' : 'Play'} ${routine.title} preview`}
      onPress={() => setHasRun(!hasRun)} />
  </View>;
}

export function AutomationsScreen({ onNavigate, classic = false }: ScreenProps & { classic?: boolean }) {
  const [hiddenUpcoming, setHiddenUpcoming] = useState<string[]>([]);
  const upcoming = [
    { id: 'kettle', icon: 'cafe-outline', time: '10:00', period: 'AM', caption: 'Today · Morning kettle', className: 'bg-willo-sky', color: '#005478' },
    { id: 'security', icon: 'lock-closed-outline', time: '7:30', period: 'PM', caption: 'Today · Nighttime security', className: 'bg-willo-surface', color: '#303233' },
  ] as const;
  return <View className="flex-1 bg-white">
    <Header onNavigate={onNavigate} title={classic ? 'Automations' : undefined} />
    <ScrollView className="flex-1" contentContainerClassName="pb-24" showsVerticalScrollIndicator={false}>
      {!classic && <>
        <View className="px-4"><SectionTitle>Upcoming</SectionTitle></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-4">
          {upcoming.filter((item) => !hiddenUpcoming.includes(item.id)).map((item) => <View key={item.id}
            className={`min-h-[190px] w-[170px] justify-between gap-6 rounded-[26px] p-4 ${item.className}`}>
            <View className="flex-row items-center justify-between"><Icon name={item.icon} color={item.color} />
              <IconButton icon="close" label={`Dismiss ${item.caption} preview`} onPress={() => setHiddenUpcoming([...hiddenUpcoming, item.id])} />
            </View>
            <View><View className="flex-row items-baseline gap-1"><Text className="text-[34px] font-normal text-willo-ink">{item.time}</Text>
              <Text className="text-xs text-willo-ink">{item.period}</Text></View>
              <Text className="mt-2 text-xs leading-4 text-willo-secondary">{item.caption}</Text></View>
          </View>)}
          {hiddenUpcoming.length === upcoming.length && <Text accessibilityLiveRegion="polite" className="py-6 text-sm text-willo-secondary">No upcoming previews.</Text>}
        </ScrollView>
      </>}
      <View className="px-4">
        <SectionTitle>{classic ? 'Household Routines' : 'Your automations'}</SectionTitle>
        <View className="gap-2">{(classic ? HOUSEHOLD_ROUTINES : AUTOMATIONS).map((routine) => <RoutineRow key={routine.id} routine={routine} />)}</View>
        {classic && <><SectionTitle>Personal Routines</SectionTitle><RoutineRow routine={{ id: 'bedtime', title: 'Bedtime', subtitle: '1 starter · 2 actions', icon: 'bed-outline' }} /></>}
      </View>
    </ScrollView>
    <Pressable onPress={() => onNavigate('create-automation')} accessibilityRole="button" accessibilityLabel="Add automation preview"
      className="absolute bottom-4 right-4 min-h-12 flex-row items-center gap-2 rounded-2xl bg-willo-blue px-5 py-3 active:opacity-70">
      <Icon name="add" size={20} color="#0046ae" /><Text className="text-sm font-medium text-willo-on-blue">Add</Text>
    </Pressable>
  </View>;
}
