import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BRIEF_PARAGRAPHS, EVENTS, GARDEN_IMAGE, ROOM_IMAGE } from './fixtures';
import { CameraCard, CameraImage, Header, Icon, IconButton, SectionTitle, Sheet } from './Primitives';
import type { ScreenProps } from './types';

type FilterName = 'device' | 'event' | 'date';
const FILTER_OPTIONS = {
  device: ['All devices', 'Backyard camera', 'Living room camera'],
  event: ['All events', 'Person', 'Animal', 'Home status'],
  date: ['All dates', 'Today', 'Yesterday'],
} satisfies Record<FilterName, string[]>;

export function ActivityScreen({ onNavigate, classic = false }: ScreenProps & { classic?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [isFiltersVisible, setIsFiltersVisible] = useState(!classic);
  const [activeFilter, setActiveFilter] = useState<FilterName | null>(null);
  const [filters, setFilters] = useState({ device: 'All devices', event: 'All events', date: 'All dates' });
  const [selectedEvent, setSelectedEvent] = useState<(typeof EVENTS)[number] | null>(null);
  const visibleEvents = EVENTS.filter((event) => {
    const matchesDevice = filters.device === 'All devices' || event.camera === filters.device;
    const matchesEvent = filters.event === 'All events' ||
      (filters.event === 'Person' && event.category === 'person') ||
      (filters.event === 'Animal' && event.category === 'animal') ||
      (filters.event === 'Home status' && event.category === 'home');
    return matchesDevice && matchesEvent && filters.date !== 'Yesterday';
  });
  return <View className="flex-1 bg-white">
    <Header onNavigate={onNavigate} title={classic ? 'Activity' : undefined} action={classic ? <Pressable
      onPress={() => setIsFiltersVisible(!isFiltersVisible)} accessibilityRole="button" accessibilityState={{ expanded: isFiltersVisible }}
      className="min-h-[44px] justify-center px-3"><Text className="text-sm text-willo-on-blue">Filter</Text></Pressable> : undefined} />
    <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8" showsVerticalScrollIndicator={false}>
      {isFiltersVisible && <View className="mb-4 mt-2 flex-row flex-wrap gap-2">
        {(['device', 'event', 'date'] as const).map((filter) => <Pressable key={filter} onPress={() => setActiveFilter(filter)}
          accessibilityRole="button" accessibilityLabel={`Filter by ${filter}: ${filters[filter]}`}
          className="min-h-[44px] flex-row items-center gap-2 rounded-xl border border-willo-outline px-3 active:bg-willo-surface">
          <Text className="text-xs text-willo-secondary">{filters[filter].startsWith('All') ? { device: 'Devices', event: 'Events', date: 'Date' }[filter] : filters[filter]}</Text>
          <Icon name="chevron-down" size={12} />
        </Pressable>)}
      </View>}
      {!classic && <View className="rounded-[22px] bg-willo-surface p-4">
        <View className="flex-row items-center gap-3"><Icon name="calendar-outline" size={21} color="#376f9f" />
          <Text accessibilityRole="header" className="flex-1 text-sm font-semibold text-willo-ink">Tuesday’s Home Brief</Text></View>
        <View className="ml-8 mt-3 gap-4">
          {BRIEF_PARAGRAPHS.slice(0, isExpanded ? 2 : 1).map((paragraph) => <Text key={paragraph} selectable className="text-[13px] leading-[20px] text-willo-secondary">{paragraph}</Text>)}
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => setIsExpanded(!isExpanded)} accessibilityRole="button" accessibilityState={{ expanded: isExpanded }}
              className="min-h-[44px] flex-row items-center gap-2 rounded-full bg-willo-sky px-4 active:opacity-60">
              <Icon name="sparkles" color="#005478" size={16} /><Text className="text-xs font-medium text-willo-on-sky">{isExpanded ? 'See less' : 'See more'}</Text>
            </Pressable>
            <IconButton icon={feedback === 'up' ? 'thumbs-up' : 'thumbs-up-outline'} label="Helpful sample brief"
              className={feedback === 'up' ? 'bg-willo-sky' : 'bg-transparent'} onPress={() => setFeedback(feedback === 'up' ? null : 'up')} />
            <IconButton icon={feedback === 'down' ? 'thumbs-down' : 'thumbs-down-outline'} label="Unhelpful sample brief"
              className={feedback === 'down' ? 'bg-willo-sky' : 'bg-transparent'} onPress={() => setFeedback(feedback === 'down' ? null : 'down')} />
          </View>
        </View>
      </View>}
      <SectionTitle>{filters.date === 'Yesterday' ? 'Yesterday' : 'Today'}</SectionTitle>
      {visibleEvents.map((event) => <Pressable key={event.id} onPress={() => setSelectedEvent(event)} accessibilityRole="button"
        accessibilityLabel={`${event.title}, ${event.time}${event.camera ? `, ${event.camera}` : ''}`}
        className={`mb-2 min-h-[86px] flex-row items-center gap-3 py-3 active:opacity-60 ${classic ? 'border-b border-willo-outline' : 'rounded-[22px] bg-willo-surface px-4'}`}>
        <Icon name={event.category === 'home' ? 'home-outline' : 'videocam-outline'} size={20} />
        <View className="min-w-0 flex-1"><Text className="text-[13px] text-willo-ink">{event.title}</Text>
          <Text className="mt-1 text-[11px] leading-4 text-willo-secondary">{event.time}{event.camera ? ` · ${event.camera}` : ''}</Text></View>
        {event.image && <CameraImage source={event.image === 'garden' ? GARDEN_IMAGE : ROOM_IMAGE} className="h-16 w-20 rounded-xl" />}
      </Pressable>)}
      {visibleEvents.length === 0 && <View className="items-center gap-3 rounded-[24px] bg-willo-surface p-6">
        <Icon name="videocam-outline" size={28} /><Text className="text-center text-sm text-willo-secondary">No sample events match these filters.</Text>
        <Pressable accessibilityRole="button" onPress={() => setFilters({ device: 'All devices', event: 'All events', date: 'All dates' })} className="min-h-[44px] justify-center px-4">
          <Text className="font-medium text-willo-on-blue">Reset filters</Text>
        </Pressable>
      </View>}
    </ScrollView>
    <Sheet visible={activeFilter !== null} title="Filter activity" onClose={() => setActiveFilter(null)}>
      {activeFilter && FILTER_OPTIONS[activeFilter].map((option) => <Pressable key={option} accessibilityRole="radio"
        accessibilityState={{ checked: filters[activeFilter] === option }}
        onPress={() => { setFilters({ ...filters, [activeFilter]: option }); setActiveFilter(null); }}
        className="min-h-14 flex-row items-center justify-between gap-4 rounded-xl px-3 active:bg-willo-surface">
        <Text className="text-base text-willo-ink">{option}</Text>
        <Icon name={filters[activeFilter] === option ? 'radio-button-on' : 'radio-button-off'} color="#005478" />
      </Pressable>)}
    </Sheet>
    <Sheet visible={selectedEvent !== null} title={selectedEvent?.title ?? 'Event'} onClose={() => setSelectedEvent(null)}>
      {selectedEvent?.image && <CameraCard source={selectedEvent.image === 'garden' ? GARDEN_IMAGE : ROOM_IMAGE} label={selectedEvent.camera} />}
      <Text className="mt-4 text-sm text-willo-secondary">{selectedEvent?.time} · Sample event. No recording is played.</Text>
    </Sheet>
  </View>;
}
