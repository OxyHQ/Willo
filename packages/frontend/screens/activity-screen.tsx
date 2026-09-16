import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { PageColumns, PageScroll } from '../layout/page-layout';
import { EventRow, dayBucket, daysAgo } from '../components/event-row';
import { Icon } from '@willo.sh/ui';
import { Label, Pill, SectionTitle } from '@willo.sh/ui';
import { BRIEF_PARAGRAPH_KEYS } from '../data/events';
import { HOME_EVENT_TYPES, type HomeActivityEvent, type HomeEventType } from '../providers/types';
import { EVENT_TYPE_FILTER_KEYS } from '../data/event-labels';
import { useTimelineFilter } from './timeline-filter';
import { type ScreenProps } from '../data/screens';
import { useHomeActions } from '../state/home-context';
import { useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';
import type { ParseKeys, TFunction } from 'i18next';

/** The Date filter's choices besides "All dates": the label to show, and how many days ago that is — the events are matched on the NUMBER, never on the translated heading. */
const DAY_FILTERS = { today: { labelKey: 'events.today', daysAgo: 0 }, yesterday: { labelKey: 'events.yesterday', daysAgo: 1 } } as const satisfies Record<string, { labelKey: ParseKeys; daysAgo: number }>;
type DayFilter = keyof typeof DAY_FILTERS;

/** Events under their day heading, in feed order — one pass, so a screen never re-buckets the whole feed once per heading it renders. */
function groupByDay(events: HomeActivityEvent[], t: TFunction, language: string): Map<string, HomeActivityEvent[]> {
  const byDay = new Map<string, HomeActivityEvent[]>();
  for (const event of events) {
    const bucket = dayBucket(event.occurredAt, t, language);
    const dayEvents = byDay.get(bucket);
    if (dayEvents) dayEvents.push(event);
    else byDay.set(bucket, [event]);
  }
  return byDay;
}

function useActivityEvents() {
  const { fetchEvents, notify } = useHomeActions();
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

export function ActivityScreen({ onNavigate }: ScreenProps) {
  const { setSheet, notify } = useHomeActions();
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
  const deviceNames = [...new Set(allEvents.map(event => event.name))].sort((a, b) => a.localeCompare(b));
  const events = allEvents.filter(event =>
    (device === null || event.name === device) &&
    (eventType === null || event.eventType === eventType) &&
    (day === null || daysAgo(event.occurredAt) === DAY_FILTERS[day].daysAgo)
  );
  const eventsByDay = groupByDay(events, t, i18n.language);
  return <View className="flex-1"><PageScroll>
        <View className="flex-row flex-wrap gap-2 py-3"><Pill label={device ?? t('nav.devices')} selected={device !== null} onPress={() => selectFilter(t('nav.devices'), t('activity.filters.allDevices'), deviceNames.map(name => ({ value: name, label: name })), device, setDevice)}/><Pill label={eventType ? t(EVENT_TYPE_FILTER_KEYS[eventType]) : t('activity.filters.events')} selected={eventType !== null} onPress={() => selectFilter(t('activity.filters.events'), t('activity.filters.allEvents'), HOME_EVENT_TYPES.map(type => ({ value: type, label: t(EVENT_TYPE_FILTER_KEYS[type]) })), eventType, setEventType)}/><Pill label={day ? t(DAY_FILTERS[day].labelKey) : t('activity.filters.date')} selected={day !== null} onPress={() => selectFilter(t('activity.filters.date'), t('activity.filters.allDates'), (Object.keys(DAY_FILTERS) as DayFilter[]).map(value => ({ value, label: t(DAY_FILTERS[value].labelKey) })), day, setDay)}/></View>
    <PageColumns weights={[1, 1.25]}><View><View className="rounded-[23px] bg-muted p-4"><View className="mb-3 flex-row items-center gap-3"><Icon name="calendar" size={21} color={themeColors.primary}/><Label className="text-[13px] font-medium">{t('activity.brief.title')}</Label></View><View className="pl-[33px]">{BRIEF_PARAGRAPH_KEYS.slice(0, expanded ? 3 : 2).map(key => <Label key={key} className="mb-4 text-[12px] leading-[18px] text-muted-foreground">{t(key)}</Label>)}
      <View className="flex-row items-center gap-3"><Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} className="flex-row items-center gap-2 rounded-full bg-primary-subtle px-3 py-2"><Icon name="sparkle" size={15} color={themeColors.primary} filled/><Label className="text-[11px] font-medium text-primary-text">{expanded ? t('activity.brief.seeLess') : t('activity.brief.seeMore')}</Label></Pressable>{(['up', 'down'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={value === 'up' ? t('activity.brief.helpful') : t('activity.brief.unhelpful')} accessibilityState={{ selected: feedback === value }} onPress={() => { setFeedback(feedback === value ? null : value); notify(t('activity.brief.feedbackSaved')); }} className="p-2"><Icon name={value === 'up' ? 'thumb-up' : 'thumb-down'} size={16} color={feedback === value ? themeColors.info : themeColors.textSecondary}/></Pressable>)}</View>
    </View></View></View><View>
    {loading ? <View className="items-center p-6"><ActivityIndicator color={themeColors.primary}/></View>
      : events.length ? [...eventsByDay].map(([bucket, dayEvents]) => <View key={bucket}><SectionTitle>{bucket}</SectionTitle>{dayEvents.map(event => <EventRow card key={event.id} event={event}/>)}</View>)
      : <View className="p-6"><Label className="text-center text-[13px] text-muted-foreground">{allEvents.length ? t('activity.filters.noMatches') : t('activity.emptyWithSensors')}</Label>{allEvents.length > 0 && <Pressable onPress={() => { setDevice(null); setEventType(null); setDay(null); }} className="mt-3 p-2"><Label className="text-center text-[13px] text-info-text">{t('activity.filters.clear')}</Label></Pressable>}</View>}
  </View></PageColumns></PageScroll></View>;
}

export function TimelineScreen() {
  const { filter, openFilter } = useTimelineFilter();
  const { events: allEvents, loading } = useActivityEvents();
  const { t, i18n } = useTranslation();
  const events = allEvents.filter(event => filter === null || event.eventType === filter);
  const eventsByDay = groupByDay(events, t, i18n.language);
  const { colors: themeColors } = useTheme();
  return <View className="flex-1"><PageScroll maxWidth={1200}>
        {filter !== null && <Pressable onPress={openFilter} className="self-start rounded-full bg-primary-subtle px-3 py-2"><Label className="text-[12px] text-primary-text">{t(EVENT_TYPE_FILTER_KEYS[filter])}</Label></Pressable>}
    {loading ? <View className="items-center p-6"><ActivityIndicator color={themeColors.primary}/></View>
      : <PageColumns>{[...eventsByDay].map(([bucket, dayEvents]) => <View key={bucket}><SectionTitle>{bucket}</SectionTitle>{dayEvents.map(event => <EventRow key={event.id} event={event}/>)}</View>)}
      {events.length === 0 && <Label className="p-6 text-center text-[13px] text-muted-foreground">{t('activity.empty')}</Label>}
    </PageColumns>}
  </PageScroll></View>;
}
