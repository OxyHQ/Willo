import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { PageColumns, PageScroll } from '../layout/page-layout';
import { ClassicHeader } from '../components/headers';
import { EventRow, dayBucket } from '../components/event-row';
import { Icon } from '@willo/ui';
import { Label, Pill, SectionTitle } from '@willo/ui';
import { briefParagraphs } from '../data/events';
import { type HomeActivityEvent, type HomeEventType } from '../providers/types';
import { type ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import { useTheme } from '@oxy.so/bloom/theme';

/** The Events filter's labels, in Willo's own real activity categories — see `providers/types.ts`'s `HOME_EVENT_TYPES` doc comment for why this vocabulary is deliberately small today. */
const EVENT_TYPE_FILTER_LABELS: Record<string, HomeEventType> = {
  Motion: 'motion',
  'Doors & windows': 'contact',
  Safety: 'safety',
  Other: 'other',
};

function useActivityEvents() {
  const { fetchEvents, notify } = useHome();
  const [events, setEvents] = useState<HomeActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetchEvents()
      .then(result => {
        if (!ignore) setEvents(result);
      })
      .catch((error: unknown) => {
        console.error('Failed to load activity:', error);
        if (!ignore) notify('Could not load activity.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { events, loading };
}

export function ActivityScreen({ onNavigate, header }: ScreenProps) {
  const { setSheet, notify } = useHome();
  const { colors: themeColors } = useTheme();
  const { events: allEvents, loading } = useActivityEvents();
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [device, setDevice] = useState('All devices');
  const [eventType, setEventType] = useState('All events');
  const [day, setDay] = useState('All dates');
  function selectFilter(title: string, values: string[], current: string, onSelect: (value: string) => void) {
    setSheet({ kind: 'menu', title, options: values.map(value => ({ label: value, selected: current === value, onPress: () => { onSelect(value); setSheet(null); } })) });
  }
  const deviceNames = [...new Set(allEvents.map(event => event.name))].sort((a, b) => a.localeCompare(b));
  const events = allEvents.filter(event =>
    (device === 'All devices' || event.name === device) &&
    (eventType === 'All events' || event.eventType === EVENT_TYPE_FILTER_LABELS[eventType]) &&
    (day === 'All dates' || dayBucket(event.occurredAt) === day)
  );
  const dayBuckets = [...new Set(events.map(event => dayBucket(event.occurredAt)))];
  return <View className="flex-1 bg-card"><PageScroll>
    {header}
    <View className="flex-row flex-wrap gap-2 py-3"><Pill label={device === 'All devices' ? 'Devices' : device} selected={device !== 'All devices'} onPress={() => selectFilter('Devices', ['All devices', ...deviceNames], device, setDevice)}/><Pill label={eventType === 'All events' ? 'Events' : eventType} selected={eventType !== 'All events'} onPress={() => selectFilter('Events', ['All events', ...Object.keys(EVENT_TYPE_FILTER_LABELS)], eventType, setEventType)}/><Pill label={day === 'All dates' ? 'Date' : day} selected={day !== 'All dates'} onPress={() => selectFilter('Date', ['All dates', 'Today', 'Yesterday'], day, setDay)}/></View>
    <PageColumns weights={[1, 1.25]}><View><View className="rounded-[23px] bg-muted p-4"><View className="mb-3 flex-row items-center gap-3"><Icon name="calendar" size={21} color={themeColors.primary}/><Label className="text-[13px] font-medium">Tuesday’s Home Brief</Label></View><View className="pl-[33px]">{briefParagraphs.slice(0, expanded ? 3 : 2).map(paragraph => <Label key={paragraph.slice(0, 20)} className="mb-4 text-[12px] leading-[18px] text-muted-foreground">{paragraph}</Label>)}
      <View className="flex-row items-center gap-3"><Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} className="flex-row items-center gap-2 rounded-full bg-primary-subtle px-3 py-2"><Icon name="sparkle" size={15} color={themeColors.primary} filled/><Label className="text-[11px] font-medium text-primary-text">{expanded ? 'See less' : 'See more'}</Label></Pressable>{(['up', 'down'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={value === 'up' ? 'Helpful summary' : 'Unhelpful summary'} accessibilityState={{ selected: feedback === value }} onPress={() => { setFeedback(feedback === value ? null : value); notify('Feedback saved locally'); }} className="p-2"><Icon name={value === 'up' ? 'thumb-up' : 'thumb-down'} size={16} color={feedback === value ? themeColors.info : themeColors.textSecondary}/></Pressable>)}</View>
    </View></View></View><View>
    {loading ? <View className="items-center p-6"><ActivityIndicator color={themeColors.primary}/></View>
      : events.length ? dayBuckets.map(bucket => <View key={bucket}><SectionTitle>{bucket}</SectionTitle>{events.filter(event => dayBucket(event.occurredAt) === bucket).map(event => <EventRow card key={event.id} event={event}/>)}</View>)
      : <View className="p-6"><Label className="text-center text-[13px] text-muted-foreground">{allEvents.length ? 'No events match these filters.' : 'No activity yet. Motion, door and safety sensors will show up here.'}</Label>{allEvents.length > 0 && <Pressable onPress={() => { setDevice('All devices'); setEventType('All events'); setDay('All dates'); }} className="mt-3 p-2"><Label className="text-center text-[13px] text-info-text">Clear filters</Label></Pressable>}</View>}
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
  const openFilter = () => setSheet({ kind: 'menu', title: 'Filter activity', options: ['All events', ...Object.keys(EVENT_TYPE_FILTER_LABELS)].map(label => ({ label, selected: filter === label, onPress: () => { setFilter(label); setSheet(null); } })) });
  return <TimelineFilterContext.Provider value={{ filter, openFilter }}>{children}</TimelineFilterContext.Provider>;
}
export function TimelineHeader({ onNavigate }: ScreenProps) {
  const { openFilter } = useTimelineFilter();
  return <ClassicHeader title="Activity" onNavigate={onNavigate} filter={openFilter}/>;
}
export function TimelineScreen({ onNavigate: _onNavigate, header }: ScreenProps) {
  const { filter, openFilter } = useTimelineFilter();
  const { events: allEvents, loading } = useActivityEvents();
  const events = allEvents.filter(event => filter === 'All events' || event.eventType === EVENT_TYPE_FILTER_LABELS[filter]);
  const dayBuckets = [...new Set(events.map(event => dayBucket(event.occurredAt)))];
  const { colors: themeColors } = useTheme();
  return <View className="flex-1 bg-card"><PageScroll maxWidth={1200}>
    {header}
    {filter !== 'All events' && <Pressable onPress={openFilter} className="self-start rounded-full bg-primary-subtle px-3 py-2"><Label className="text-[12px] text-primary-text">{filter}</Label></Pressable>}
    {loading ? <View className="items-center p-6"><ActivityIndicator color={themeColors.primary}/></View>
      : <PageColumns>{dayBuckets.map(bucket => <View key={bucket}><SectionTitle>{bucket}</SectionTitle>{events.filter(event => dayBucket(event.occurredAt) === bucket).map(event => <EventRow key={event.id} event={event}/>)}</View>)}
      {events.length === 0 && <Label className="p-6 text-center text-[13px] text-muted-foreground">No activity yet.</Label>}
    </PageColumns>}
  </PageScroll></View>;
}
