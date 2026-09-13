import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AskHeader, ClassicHeader } from '../components/headers';
import { EventRow } from '../components/event-row';
import { Icon } from '@willo/ui';
import { Label, Pill, SectionTitle } from '@willo/ui';
import { activityEvents, briefParagraphs, timelineEvents } from '../data/events';
import { type ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import { colors } from '@willo/ui';
export function ActivityScreen({ onNavigate }: ScreenProps) {
  const { setSheet, notify } = useHome();
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [device, setDevice] = useState('All devices');
  const [eventType, setEventType] = useState('All events');
  const [day, setDay] = useState('All dates');
  function selectFilter(title: string, values: string[], current: string, onSelect: (value: string) => void) {
    setSheet({ kind: 'menu', title, options: values.map(value => ({ label: value, selected: current === value, onPress: () => { onSelect(value); setSheet(null); } })) });
  }
  const events = activityEvents.filter(event => (device === 'All devices' || (device === 'Cameras' ? event.category !== 'security' : event.category === 'security')) && (eventType === 'All events' || (eventType === 'People' ? event.category === 'person' : event.category === 'animal')) && (day === 'All dates' || event.day === day));
  return <View className="flex-1 bg-white"><AskHeader onNavigate={onNavigate}/><ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
    <View className="flex-row gap-2 py-3"><Pill label={device === 'All devices' ? 'Devices' : device} selected={device !== 'All devices'} onPress={() => selectFilter('Devices', ['All devices', 'Cameras', 'Security'], device, setDevice)}/><Pill label={eventType === 'All events' ? 'Events' : eventType} selected={eventType !== 'All events'} onPress={() => selectFilter('Events', ['All events', 'People', 'Animals'], eventType, setEventType)}/><Pill label={day === 'All dates' ? 'Date' : day} selected={day !== 'All dates'} onPress={() => selectFilter('Date', ['All dates', 'Today', 'Yesterday'], day, setDay)}/></View>
    <View className="rounded-[23px] bg-home-surface p-4"><View className="mb-3 flex-row items-center gap-3"><Icon name="calendar" size={21} color={colors.onSky}/><Label className="text-[13px] font-medium">Tuesday’s Home Brief</Label></View><View className="pl-[33px]">{briefParagraphs.slice(0, expanded ? 3 : 2).map(paragraph => <Label key={paragraph.slice(0, 20)} className="mb-4 text-[12px] leading-[18px] text-home-muted">{paragraph}</Label>)}
      <View className="flex-row items-center gap-3"><Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} className="flex-row items-center gap-2 rounded-full bg-home-sky px-3 py-2"><Icon name="sparkle" size={15} color={colors.onSky} filled/><Label className="text-[11px] font-medium text-home-on-sky">{expanded ? 'See less' : 'See more'}</Label></Pressable>{(['up', 'down'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={value === 'up' ? 'Helpful summary' : 'Unhelpful summary'} accessibilityState={{ selected: feedback === value }} onPress={() => { setFeedback(feedback === value ? null : value); notify('Feedback saved locally'); }} className="p-2"><Icon name={value === 'up' ? 'thumb-up' : 'thumb-down'} size={16} color={feedback === value ? colors.onBlue : colors.muted}/></Pressable>)}</View>
    </View></View>
    {events.length ? (['Today', 'Yesterday'] as const).map(date => events.some(event => event.day === date) && <View key={date}><SectionTitle>{date}</SectionTitle>{events.filter(event => event.day === date).map(event => <EventRow card key={event.id} event={event}/>)}</View>) : <View className="p-6"><Label className="text-center text-[13px] text-home-muted">No events match these filters.</Label><Pressable onPress={() => { setDevice('All devices'); setEventType('All events'); setDay('All dates'); }} className="mt-3 p-2"><Label className="text-center text-[13px] text-home-on-blue">Clear filters</Label></Pressable></View>}
  </ScrollView></View>;
}
export function TimelineScreen({ onNavigate }: ScreenProps) {
  const { setSheet } = useHome();
  const [filter, setFilter] = useState('All events');
  const openFilter = () => setSheet({ kind: 'menu', title: 'Filter activity', options: ['All events', 'People', 'Animals', 'Security'].map(label => ({ label, selected: filter === label, onPress: () => { setFilter(label); setSheet(null); } })) });
  const events = timelineEvents.filter(event => filter === 'All events' || event.category === (filter === 'People' ? 'person' : filter === 'Animals' ? 'animal' : 'security'));
  return <View className="flex-1 bg-white"><ClassicHeader title="Activity" onNavigate={onNavigate} filter={openFilter}/><ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 22 }}>
    {filter !== 'All events' && <Pressable onPress={openFilter} className="self-start rounded-full bg-home-sky px-3 py-2"><Label className="text-[12px] text-home-on-sky">{filter}</Label></Pressable>}
    {(['Today', 'Yesterday'] as const).map(date => events.some(event => event.day === date) && <View key={date}><SectionTitle>{date}</SectionTitle>{events.filter(event => event.day === date).map(event => <EventRow key={event.id} event={event}/>)}</View>)}
  </ScrollView></View>;
}
