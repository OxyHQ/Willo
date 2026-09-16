import React, { createContext, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HOME_EVENT_TYPES, type HomeEventType } from '../providers/types';
import { useHomeActions } from '../state/home-context';
import { EVENT_TYPE_FILTER_KEYS } from '../data/event-labels';

/**
 * The timeline's filter, shared between its header and its body.
 *
 * The pill that opens the menu lives in the header and the value it sets is
 * read by the body, and the two are siblings in the layout — the header is the
 * app shell's, the body is the route's — so neither can own the state. It sits
 * in its own file, away from the screen, so mounting the provider (which the
 * shell does, for the header's sake) doesn't drag the whole timeline screen in
 * with it.
 */
type TimelineFilterValue = { filter: HomeEventType | null; openFilter: () => void };
const TimelineFilterContext = createContext<TimelineFilterValue | null>(null);

export function useTimelineFilter(): TimelineFilterValue {
  const value = useContext(TimelineFilterContext);
  if (!value) throw new Error('The timeline filter is only available inside TimelineFilterProvider.');
  return value;
}

export function TimelineFilterProvider({ active, children }: { active: boolean; children: React.ReactNode }) {
  const { setSheet } = useHomeActions();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<HomeEventType | null>(null);
  // The timeline opens unfiltered every time. Same shape as the composer's
  // reset, and for the same reason — see `screen-chrome.tsx`.
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setFilter(null);
  }
  const choices = [{ value: null, label: t('activity.filters.allEvents') }, ...HOME_EVENT_TYPES.map(type => ({ value: type, label: t(EVENT_TYPE_FILTER_KEYS[type]) }))];
  const openFilter = () => setSheet({ kind: 'menu', title: t('activity.filters.filterActivity'), options: choices.map(choice => ({ label: choice.label, selected: filter === choice.value, onPress: () => { setFilter(choice.value); setSheet(null); } })) });
  return <TimelineFilterContext.Provider value={{ filter, openFilter }}>{children}</TimelineFilterContext.Provider>;
}
