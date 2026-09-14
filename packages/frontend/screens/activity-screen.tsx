import React, { createContext, useContext, useState } from 'react';
import { Pressable, View } from 'react-native';
import { PageColumns, PageScroll } from '../layout/page-layout';
import { ClassicHeader } from '../components/headers';
import { EventRow } from '../components/event-row';
import { Icon } from '@willo/ui';
import { Label, Pill, SectionTitle } from '@willo/ui';
import { activityEvents, briefParagraphs, timelineEvents } from '../data/events';
import { type ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import { useTheme } from '@oxy.so/bloom/theme';
export function ActivityScreen({ onNavigate, header }: ScreenProps) {
  const { setSheet, notify } = useHome();
  const { colors: themeColors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [device, setDevice] = useState('All devices');
  const [eventType, setEventType] = useState('All events');
  const [day, setDay] = useState('All dates');
  function selectFilter(title: string, values: string[], current: string, onSelect: (value: string) => void) {
    setSheet({ kind: 'menu', title, options: values.map(value => ({ label: value, selected: current === value, onPress: () => { onSelect(value); setSheet(null); } })) });
  }
  const events = activityEvents.filter(event => (device === 'All devices' || (device === 'Cameras' ? event.category !== 'security' : event.category === 'security')) && (eventType === 'All events' || (eventType === 'People' ? event.category === 'person' : event.category === 'animal')) && (day === 'All dates' || event.day === day));
  return <View className="flex-1 bg-card"><PageScroll>
    {header}
    <View className="flex-row flex-wrap gap-2 py-3"><Pill label={device === 'All devices' ? 'Devices' : device} selected={device !== 'All devices'} onPress={() => selectFilter('Devices', ['All devices', 'Cameras', 'Security'], device, setDevice)}/><Pill label={eventType === 'All events' ? 'Events' : eventType} selected={eventType !== 'All events'} onPress={() => selectFilter('Events', ['All events', 'People', 'Animals'], eventType, setEventType)}/><Pill label={day === 'All dates' ? 'Date' : day} selected={day !== 'All dates'} onPress={() => selectFilter('Date', ['All dates', 'Today', 'Yesterday'], day, setDay)}/></View>
    <PageColumns weights={[1, 1.25]}><View><View className="rounded-[23px] bg-home-surface p-4"><View className="mb-3 flex-row items-center gap-3"><Icon name="calendar" size={21} color={themeColors.primary}/><Label className="text-[13px] font-medium">Tuesday’s Home Brief</Label></View><View className="pl-[33px]">{briefParagraphs.slice(0, expanded ? 3 : 2).map(paragraph => <Label key={paragraph.slice(0, 20)} className="mb-4 text-[12px] leading-[18px] text-muted-foreground">{paragraph}</Label>)}
      <View className="flex-row items-center gap-3"><Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} className="flex-row items-center gap-2 rounded-full bg-primary-subtle px-3 py-2"><Icon name="sparkle" size={15} color={themeColors.primary} filled/><Label className="text-[11px] font-medium text-primary-text">{expanded ? 'See less' : 'See more'}</Label></Pressable>{(['up', 'down'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={value === 'up' ? 'Helpful summary' : 'Unhelpful summary'} accessibilityState={{ selected: feedback === value }} onPress={() => { setFeedback(feedback === value ? null : value); notify('Feedback saved locally'); }} className="p-2"><Icon name={value === 'up' ? 'thumb-up' : 'thumb-down'} size={16} color={feedback === value ? themeColors.info : themeColors.textSecondary}/></Pressable>)}</View>
    </View></View></View><View>
    {events.length ? (['Today', 'Yesterday'] as const).map(date => events.some(event => event.day === date) && <View key={date}><SectionTitle>{date}</SectionTitle>{events.filter(event => event.day === date).map(event => <EventRow card key={event.id} event={event}/>)}</View>) : <View className="p-6"><Label className="text-center text-[13px] text-muted-foreground">No events match these filters.</Label><Pressable onPress={() => { setDevice('All devices'); setEventType('All events'); setDay('All dates'); }} className="mt-3 p-2"><Label className="text-center text-[13px] text-info-text">Clear filters</Label></Pressable></View>}
  </View></PageColumns></PageScroll></View>;
}

// TimelineScreen's header carries a "filter" pill whose menu and selected
// value are the screen body's own state — header and body are siblings in
// the layout (the header now renders outside/above ContentPanel), so the
// state they share lives in this small screen-local context instead of
// either one owning it.
type TimelineFilterValue = { filter: string; openFilter: () => void };
const TimelineFilterContext = createContext<TimelineFilterValue | null>(null);
function useTimelineFilter(): TimelineFilterValue {
  const value = useContext(TimelineFilterContext);
  if (!value) throw new Error('TimelineHeader/TimelineScreen must be rendered inside TimelineFilterProvider.');
  return value;
}
export function TimelineFilterProvider({ children }: { children: React.ReactNode }) {
  const { setSheet } = useHome();
  const [filter, setFilter] = useState('All events');
  const openFilter = () => setSheet({ kind: 'menu', title: 'Filter activity', options: ['All events', 'People', 'Animals', 'Security'].map(label => ({ label, selected: filter === label, onPress: () => { setFilter(label); setSheet(null); } })) });
  return <TimelineFilterContext.Provider value={{ filter, openFilter }}>{children}</TimelineFilterContext.Provider>;
}
export function TimelineHeader({ onNavigate }: ScreenProps) {
  const { openFilter } = useTimelineFilter();
  return <ClassicHeader title="Activity" onNavigate={onNavigate} filter={openFilter}/>;
}
export function TimelineScreen({ onNavigate: _onNavigate, header }: ScreenProps) {
  const { filter, openFilter } = useTimelineFilter();
  const events = timelineEvents.filter(event => filter === 'All events' || event.category === (filter === 'People' ? 'person' : filter === 'Animals' ? 'animal' : 'security'));
  return <View className="flex-1 bg-card"><PageScroll maxWidth={1200}>
    {header}
    {filter !== 'All events' && <Pressable onPress={openFilter} className="self-start rounded-full bg-primary-subtle px-3 py-2"><Label className="text-[12px] text-primary-text">{filter}</Label></Pressable>}
    <PageColumns>{(['Today', 'Yesterday'] as const).map(date => events.some(event => event.day === date) && <View key={date}><SectionTitle>{date}</SectionTitle>{events.filter(event => event.day === date).map(event => <EventRow key={event.id} event={event}/>)}</View>)}
  </PageColumns></PageScroll></View>;
}
