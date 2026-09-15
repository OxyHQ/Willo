import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { PageColumns, PageScroll } from '../layout/page-layout';
import { ClassicHeader } from '../components/headers';
import { EventRow, dayBucket } from '../components/event-row';
import { Icon } from '@willo.sh/ui';
import { Label, Pill, SectionTitle } from '@willo.sh/ui';
import { BRIEF_PARAGRAPH_KEYS } from '../data/events';
import { type HomeActivityEvent, type HomeEventType } from '../providers/types';
import { type ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import { useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';
import type { ParseKeys } from 'i18next';

/** The Events filter's label for each of Willo's own real activity categories — see `providers/types.ts`'s `HOME_EVENT_TYPES` doc comment for why this vocabulary is deliberately small today. */
const EVENT_TYPE_FILTER_KEYS: Record<HomeEventType, ParseKeys> = {
  motion: 'activity.filters.motion',
  contact: 'activity.filters.contact',
  safety: 'activity.filters.safety',
  other: 'activity.filters.other',
};
const EVENT_TYPES = Object.keys(EVENT_TYPE_FILTER_KEYS) as HomeEventType[];
/** The Date filter's choices besides "All dates"; each matches the day heading `dayBucket` gives the same events. */
const DAY_FILTER_KEYS = { today: 'events.today', yesterday: 'events.yesterday' } as const satisfies Record<string, ParseKeys>;
type DayFilter = keyof typeof DAY_FILTER_KEYS;

function useActivityEvents() {
  const { fetchEvents, notify } = useHome();
  const { t } = useTranslation();
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
        if (!ignore) notify(t('activity.loadFailed'));
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
  const { t, i18n } = useTranslation();
  const { events: allEvents, loading } = useActivityEvents();
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  // `null` means "all" for every filter — the state holds values, never display text, so switching language never breaks a selection.
  const [device, setDevice] = useState<string | null>(null);
  const [eventType, setEventType] = useState<HomeEventType | null>(null);
  const [day, setDay] = useState<DayFilter | null>(null);
  function selectFilter<T extends string>(title: string, allLabel: string, values: { value: T; label: string }[], current: T | null, onSelect: (value: T | null) => void) {
    const choices = [{ value: null, label: allLabel }, ...values];
    setSheet({ kind: 'menu', title, options: choices.map(choice => ({ label: choice.label, selected: current === choice.value, onPress: () => { onSelect(choice.value); setSheet(null); } })) });
  }
  const bucketOf = (occurredAt: string) => dayBucket(occurredAt, t, i18n.language);
  const deviceNames = [...new Set(allEvents.map(event => event.name))].sort((a, b) => a.localeCompare(b));
  const events = allEvents.filter(event =>
    (device === null || event.name === device) &&
    (eventType === null || event.eventType === eventType) &&
    (day === null || bucketOf(event.occurredAt) === t(DAY_FILTER_KEYS[day]))
  );
  const dayBuckets = [...new Set(events.map(event => bucketOf(event.occurredAt)))];
  return <View className="flex-1 bg-card"><PageScroll>
    {header}
    <View className="flex-row flex-wrap gap-2 py-3"><Pill label={device ?? t('activity.filters.devices')} selected={device !== null} onPress={() => selectFilter(t('activity.filters.devices'), t('activity.filters.allDevices'), deviceNames.map(name => ({ value: name, label: name })), device, setDevice)}/><Pill label={eventType ? t(EVENT_TYPE_FILTER_KEYS[eventType]) : t('activity.filters.events')} selected={eventType !== null} onPress={() => selectFilter(t('activity.filters.events'), t('activity.filters.allEvents'), EVENT_TYPES.map(type => ({ value: type, label: t(EVENT_TYPE_FILTER_KEYS[type]) })), eventType, setEventType)}/><Pill label={day ? t(DAY_FILTER_KEYS[day]) : t('activity.filters.date')} selected={day !== null} onPress={() => selectFilter(t('activity.filters.date'), t('activity.filters.allDates'), (Object.keys(DAY_FILTER_KEYS) as DayFilter[]).map(value => ({ value, label: t(DAY_FILTER_KEYS[value]) })), day, setDay)}/></View>
    <PageColumns weights={[1, 1.25]}><View><View className="rounded-[23px] bg-muted p-4"><View className="mb-3 flex-row items-center gap-3"><Icon name="calendar" size={21} color={themeColors.primary}/><Label className="text-[13px] font-medium">{t('activity.brief.title')}</Label></View><View className="pl-[33px]">{BRIEF_PARAGRAPH_KEYS.slice(0, expanded ? 3 : 2).map(key => <Label key={key} className="mb-4 text-[12px] leading-[18px] text-muted-foreground">{t(key)}</Label>)}
      <View className="flex-row items-center gap-3"><Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} className="flex-row items-center gap-2 rounded-full bg-primary-subtle px-3 py-2"><Icon name="sparkle" size={15} color={themeColors.primary} filled/><Label className="text-[11px] font-medium text-primary-text">{expanded ? t('activity.brief.seeLess') : t('activity.brief.seeMore')}</Label></Pressable>{(['up', 'down'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={value === 'up' ? t('activity.brief.helpful') : t('activity.brief.unhelpful')} accessibilityState={{ selected: feedback === value }} onPress={() => { setFeedback(feedback === value ? null : value); notify(t('activity.brief.feedbackSaved')); }} className="p-2"><Icon name={value === 'up' ? 'thumb-up' : 'thumb-down'} size={16} color={feedback === value ? themeColors.info : themeColors.textSecondary}/></Pressable>)}</View>
    </View></View></View><View>
    {loading ? <View className="items-center p-6"><ActivityIndicator color={themeColors.primary}/></View>
      : events.length ? dayBuckets.map(bucket => <View key={bucket}><SectionTitle>{bucket}</SectionTitle>{events.filter(event => bucketOf(event.occurredAt) === bucket).map(event => <EventRow card key={event.id} event={event}/>)}</View>)
      : <View className="p-6"><Label className="text-center text-[13px] text-muted-foreground">{allEvents.length ? t('activity.filters.noMatches') : t('activity.emptyWithSensors')}</Label>{allEvents.length > 0 && <Pressable onPress={() => { setDevice(null); setEventType(null); setDay(null); }} className="mt-3 p-2"><Label className="text-center text-[13px] text-info-text">{t('activity.filters.clear')}</Label></Pressable>}</View>}
  </View></PageColumns></PageScroll></View>;
}

// TimelineScreen's header carries a "filter" pill whose menu and selected
// value are the screen body's own state — header and body are siblings in
// the layout (the header now renders outside/above ContentPanel), so the
// state they share lives in this small screen-local context instead of
// either one owning it.
type TimelineFilterValue = { filter: HomeEventType | null; openFilter: () => void };
const TimelineFilterContext = createContext<TimelineFilterValue | null>(null);
function useTimelineFilter(): TimelineFilterValue {
  const value = useContext(TimelineFilterContext);
  if (!value) throw new Error('TimelineHeader/TimelineScreen must be rendered inside TimelineFilterProvider.');
  return value;
}
export function TimelineFilterProvider({ children }: { children: React.ReactNode }) {
  const { setSheet } = useHome();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<HomeEventType | null>(null);
  const choices = [{ value: null, label: t('activity.filters.allEvents') }, ...EVENT_TYPES.map(type => ({ value: type, label: t(EVENT_TYPE_FILTER_KEYS[type]) }))];
  const openFilter = () => setSheet({ kind: 'menu', title: t('activity.filters.filterActivity'), options: choices.map(choice => ({ label: choice.label, selected: filter === choice.value, onPress: () => { setFilter(choice.value); setSheet(null); } })) });
  return <TimelineFilterContext.Provider value={{ filter, openFilter }}>{children}</TimelineFilterContext.Provider>;
}
export function TimelineHeader({ onNavigate }: ScreenProps) {
  const { openFilter } = useTimelineFilter();
  const { t } = useTranslation();
  return <ClassicHeader title={t('nav.activity')} onNavigate={onNavigate} filter={openFilter}/>;
}
export function TimelineScreen({ onNavigate: _onNavigate, header }: ScreenProps) {
  const { filter, openFilter } = useTimelineFilter();
  const { events: allEvents, loading } = useActivityEvents();
  const { t, i18n } = useTranslation();
  const bucketOf = (occurredAt: string) => dayBucket(occurredAt, t, i18n.language);
  const events = allEvents.filter(event => filter === null || event.eventType === filter);
  const dayBuckets = [...new Set(events.map(event => bucketOf(event.occurredAt)))];
  const { colors: themeColors } = useTheme();
  return <View className="flex-1 bg-card"><PageScroll maxWidth={1200}>
    {header}
    {filter !== null && <Pressable onPress={openFilter} className="self-start rounded-full bg-primary-subtle px-3 py-2"><Label className="text-[12px] text-primary-text">{t(EVENT_TYPE_FILTER_KEYS[filter])}</Label></Pressable>}
    {loading ? <View className="items-center p-6"><ActivityIndicator color={themeColors.primary}/></View>
      : <PageColumns>{dayBuckets.map(bucket => <View key={bucket}><SectionTitle>{bucket}</SectionTitle>{events.filter(event => bucketOf(event.occurredAt) === bucket).map(event => <EventRow key={event.id} event={event}/>)}</View>)}
      {events.length === 0 && <Label className="p-6 text-center text-[13px] text-muted-foreground">{t('activity.empty')}</Label>}
    </PageColumns>}
  </PageScroll></View>;
}
