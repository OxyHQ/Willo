import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { IconButton, Label } from '@willo/ui';
import { PageColumns } from '../layout/page-layout';
import { DEMO_TODAY, type CalendarEvent } from './model';
import { formatDay, monthCells, moveMonth } from './logic';
import { useHousehold } from './store';
import { ActionButton, Chip, EmptyState, Heading, Panel, Person } from './ui';

const EVENT_COLORS: Record<string, string> = { Visit: 'bg-home-blue', Repair: 'bg-home-peach', Cleaning: 'bg-home-green', Delivery: 'bg-home-yellow', Holiday: 'bg-home-sky', Birthday: 'bg-home-peach' };
export function CalendarScreen() {
  const { state, openEditor } = useHousehold();
  const [month, setMonth] = useState(`${DEMO_TODAY.slice(0, 7)}-01`);
  const [selected, setSelected] = useState(DEMO_TODAY);
  const [category, setCategory] = useState('All');
  const selectedEvents = state.events.filter(event => event.date <= selected && event.endDate >= selected && (category === 'All' || event.category === category)).sort((first, second) => first.time.localeCompare(second.time));
  const monthTitle = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}T12:00:00Z`));
  function handleEdit(event: CalendarEvent) {
    openEditor('event', { title: event.title, date: event.date, endDate: event.endDate, time: event.time, category: event.category, member: event.member, details: event.details }, event.id);
  }
  return <PageColumns weights={[1.2, 1]}>
    <View className="gap-5"><Panel><View className="flex-row items-center justify-between gap-1">
      <IconButton icon="back" label="Previous month" onPress={() => { const next = moveMonth(month, -1); setMonth(next); setSelected(next); }} size={19}/>
      <Label accessibilityRole="header" className="min-w-0 flex-1 text-center text-[18px] font-medium">{monthTitle}</Label>
      <IconButton icon="chevron" label="Next month" onPress={() => { const next = moveMonth(month, 1); setMonth(next); setSelected(next); }} size={19}/>
    </View><View className="flex-row">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <View key={index} className="flex-1 items-center"><Label className="text-[11px] text-home-muted">{day}</Label></View>)}</View>
    <View className="flex-row flex-wrap">{monthCells(month).map(date => {
      const hasEvents = state.events.some(event => event.date <= date && event.endDate >= date);
      return <Pressable key={date} accessibilityRole="button" accessibilityLabel={`${date}${hasEvents ? ', has events' : ''}`} accessibilityState={{ selected: selected === date }}
        onPress={() => { setSelected(date); setMonth(`${date.slice(0, 7)}-01`); }} style={{ width: `${100 / 7}%` }}
        className={`min-h-[52px] items-center justify-center gap-1 rounded-[17px] py-2 active:opacity-60 ${selected === date ? 'bg-home-sky' : date === DEMO_TODAY ? 'bg-white' : ''}`}>
        <Label className={`text-[14px] ${selected === date ? 'font-semibold text-home-on-sky' : date.slice(0, 7) === month.slice(0, 7) ? 'text-home-ink' : 'text-home-muted'}`}>{Number(date.slice(-2))}</Label>
        <View className={`h-1 w-1 rounded-full ${hasEvents ? 'bg-home-on-sky' : 'bg-transparent'}`}/>
      </Pressable>;
    })}</View><ActionButton secondary onPress={() => { setSelected(DEMO_TODAY); setMonth(`${DEMO_TODAY.slice(0, 7)}-01`); }}>Back to demo today</ActionButton></Panel>
    <View className="flex-row flex-wrap gap-2">{['All', 'Visit', 'Repair', 'Cleaning', 'Delivery', 'Holiday', 'Birthday'].map(title => <Chip key={title} title={title} selected={category === title} onPress={() => setCategory(title)}/>)}</View>
    </View>
    <View className="gap-4"><Heading title={formatDay(selected, true)} detail={`${selectedEvents.length} events in the selected category`}/>
      {!selectedEvents.length && <EmptyState title="A little breathing room" body="No events on this day. Add a visit, delivery or something to look forward to."/>}
      {selectedEvents.map(event => <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={`Edit event ${event.title}`} onPress={() => handleEdit(event)}
        className={`gap-3 rounded-[26px] p-5 active:opacity-70 ${EVENT_COLORS[event.category] ?? 'bg-home-surface'}`}>
        <View className="flex-row items-center justify-between gap-3"><Label className="text-[12px] font-medium">{event.time || 'All day'} · {event.category}</Label><Person id={event.member}/></View>
        <Label className="text-[19px] font-medium">{event.title}</Label>
        {event.endDate !== event.date && <Label className="text-[12px]">{formatDay(event.date)} – {formatDay(event.endDate)}</Label>}
        <Label className="text-[13px] leading-5 text-home-muted">{event.details || 'No extra details yet.'}</Label>
      </Pressable>)}
      <ActionButton onPress={() => openEditor('event', { date: selected })}>Add an event on this day</ActionButton>
      <Label className="text-[12px] leading-5 text-home-muted">The household calendar is a local preview, separate from your connected personal calendars.</Label>
    </View>
  </PageColumns>;
}
