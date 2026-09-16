import React from 'react';
import { Pressable, View } from 'react-native';
import { type HomeActivityEvent } from '../providers/types';
import { useHome } from '../state/home-context';
import { useTheme } from '@oxy.so/bloom/theme';
import { Icon, type IconName } from '@willo.sh/ui';
import { Label } from '@willo.sh/ui';
import { useTranslation } from 'react-i18next';
import type { ParseKeys, TFunction } from 'i18next';

/** What to show for one event — title and icon are both derived from the same `eventType`/`active` pair, so every screen that renders an event reads it the same way. */
export function describeEvent(event: HomeActivityEvent): { titleKey: ParseKeys; icon: IconName } {
  switch (event.eventType) {
    case 'motion':
      return { titleKey: event.active ? 'events.motionDetected' : 'events.motionCleared', icon: 'activity' };
    case 'contact':
      return { titleKey: event.active ? 'events.opened' : 'events.closed', icon: event.active ? 'unlock' : 'lock' };
    case 'safety':
      return { titleKey: event.active ? 'events.alert' : 'events.alertCleared', icon: 'alert' };
    default:
      return { titleKey: event.active === false ? 'events.cleared' : 'events.triggered', icon: 'bell' };
  }
}

/** `language` is the active UI language (`i18n.language`), so times read the way the rest of the UI does rather than the device's own locale. */
export function formatEventTime(occurredAt: string, language: string): string {
  return new Date(occurredAt).toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' });
}

/** Whole days between today and the event's own day — 0 today, 1 yesterday. The value a date filter compares, never the heading text below. */
export function daysAgo(occurredAt: string): number {
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((startOfDay(new Date()) - startOfDay(new Date(occurredAt))) / (24 * 60 * 60 * 1000));
}

/** 'Today'/'Yesterday' for the common case, a short date otherwise — this feed has no fixed two-day window the way the old demo data did. */
export function dayBucket(occurredAt: string, t: TFunction, language: string): string {
  const diffDays = daysAgo(occurredAt);
  if (diffDays === 0) return t('events.today');
  if (diffDays === 1) return t('events.yesterday');
  return new Date(occurredAt).toLocaleDateString(language, { month: 'short', day: 'numeric' });
}

export function EventRow({ event, card = false }: { event: HomeActivityEvent; card?: boolean }) {
  const { setSheet } = useHome();
  const { colors: themeColors } = useTheme();
  const { t, i18n } = useTranslation();
  const { titleKey, icon } = describeEvent(event);
  const title = t(titleKey);
  const time = formatEventTime(event.occurredAt, i18n.language);
  const location = event.room ? `${event.name} · ${event.room}` : event.name;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${time}`}
      onPress={() =>
        setSheet({
          kind: 'message',
          title,
          description: `${location}\n${time} · ${dayBucket(event.occurredAt, t, i18n.language)}`,
        })
      }
      className={`flex-row items-center gap-3 ${card ? 'mb-2 min-h-[82px] rounded-[22px] bg-muted px-3 py-3' : 'min-h-[87px] py-2'}`}
    >
      <Icon name={icon} size={18} color={themeColors.text} />
      <View className={`min-w-0 flex-1 gap-1 ${!card ? 'border-b border-border pb-3 pt-1' : ''}`}>
        <Label className="text-[12px] leading-[16px]">{title}</Label>
        <Label className="text-[10px] leading-[14px] text-muted-foreground">
          {time} · {location}
        </Label>
      </View>
    </Pressable>
  );
}
