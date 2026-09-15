import React from 'react';
import { Pressable, View } from 'react-native';
import { type HomeActivityEvent } from '../providers/types';
import { useHome } from '../state/home-context';
import { useTheme } from '@oxy.so/bloom/theme';
import { Icon, type IconName } from '@willo/ui';
import { Label } from '@willo/ui';

/** What to show for one event — title and icon are both derived from the same `eventType`/`active` pair, so every screen that renders an event reads it the same way. */
export function describeEvent(event: HomeActivityEvent): { title: string; icon: IconName } {
  switch (event.eventType) {
    case 'motion':
      return { title: event.active ? 'Motion detected' : 'Motion cleared', icon: 'activity' };
    case 'contact':
      return { title: event.active ? 'Opened' : 'Closed', icon: event.active ? 'unlock' : 'lock' };
    case 'safety':
      return { title: event.active ? 'Alert' : 'Alert cleared', icon: 'alert' };
    default:
      return { title: event.active === false ? 'Cleared' : 'Triggered', icon: 'bell' };
  }
}

export function formatEventTime(occurredAt: string): string {
  return new Date(occurredAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** 'Today'/'Yesterday' for the common case, a short date otherwise — this feed has no fixed two-day window the way the old demo data did. */
export function dayBucket(occurredAt: string): string {
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(new Date(occurredAt))) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return new Date(occurredAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function EventRow({ event, card = false }: { event: HomeActivityEvent; card?: boolean }) {
  const { setSheet } = useHome();
  const { colors: themeColors } = useTheme();
  const { title, icon } = describeEvent(event);
  const location = event.room ? `${event.name} · ${event.room}` : event.name;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatEventTime(event.occurredAt)}`}
      onPress={() =>
        setSheet({
          kind: 'message',
          title,
          description: `${location}\n${formatEventTime(event.occurredAt)} · ${dayBucket(event.occurredAt)}`,
        })
      }
      className={`flex-row items-center gap-3 ${card ? 'mb-2 min-h-[82px] rounded-[22px] bg-muted px-3 py-3' : 'min-h-[87px] py-2'}`}
    >
      <Icon name={icon} size={18} color={themeColors.text} />
      <View className={`min-w-0 flex-1 gap-1 ${!card ? 'border-b border-border pb-3 pt-1' : ''}`}>
        <Label className="text-[12px] leading-[16px]">{title}</Label>
        <Label className="text-[10px] leading-[14px] text-muted-foreground">
          {formatEventTime(event.occurredAt)} · {location}
        </Label>
      </View>
    </Pressable>
  );
}
