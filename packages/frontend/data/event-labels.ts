import type { ParseKeys } from 'i18next';
import type { HomeEventType } from '../providers/types';

/**
 * What each kind of activity event is called, for the timeline's filter menu.
 * Here rather than in the screen because the filter lives in the app shell's
 * header now (`screens/timeline-filter.tsx`) and the screen reads the same
 * labels — one table, so the two can't drift.
 */
export const EVENT_TYPE_FILTER_KEYS: Record<HomeEventType, ParseKeys> = {
  motion: 'activity.filters.motion',
  contact: 'activity.filters.contact',
  safety: 'activity.filters.safety',
  other: 'activity.filters.other',
};
