import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon, Label } from '@willo/ui';
import { SectionGrid } from '../layout/page-layout';
import { DEMO_TODAY, MEMBERS, SECTIONS, type HouseholdSection } from './model';
import { canReadNote, formatDay, money } from './logic';
import { HouseholdGlyph } from './glyph';
import { useHousehold } from './store';
import { Panel, PALETTES, Person } from './ui';

export function HouseholdOverview({ onOpen }: { onOpen: (section: HouseholdSection) => void }) {
  const { state } = useHousehold();
  const counts: Record<HouseholdSection, string> = {
    tasks: `${state.tasks.filter(task => task.due <= DEMO_TODAY && !task.completion).length} due today`,
    shopping: `${state.shopping.filter(item => !item.checkedBy).length} items to pick up`,
    calendar: `${state.events.filter(event => event.date <= DEMO_TODAY && event.endDate >= DEMO_TODAY).length} happening today`,
    notes: `${state.notes.filter(note => canReadNote(note, state.actor)).length} notes you can read`,
    packages: `${state.packages.filter(parcel => parcel.status === 'delivered').length} ready to bring inside`,
    maintenance: `${state.assets.filter(asset => asset.due <= DEMO_TODAY && !asset.history.some(entry => entry.date === DEMO_TODAY)).length} need attention`,
    expenses: `${money(state.expenses.filter(expense => !expense.paid).reduce((sum, expense) => sum + expense.cents, 0))} still to pay`,
    meals: state.meals.find(meal => meal.date === DEMO_TODAY)?.title ?? 'Dinner is not planned yet',
  };
  return <View className="gap-6"><Panel tone="sky"><View className="flex-row items-start justify-between gap-4"><View className="min-w-0 flex-1 gap-2"><Label className="text-[12px] text-home-on-sky">Monday, {formatDay(DEMO_TODAY, true)} · Sample home</Label>
    <Label className="text-[34px] leading-[43px] text-home-on-sky">Home, together.</Label><Label className="text-[14px] leading-6 text-home-on-sky">The everyday things, shared.</Label></View><Icon name="home" size={36} color="#00537f"/></View>
    <View className="flex-row items-center gap-2">{MEMBERS.map(member => <Person key={member.id} id={member.id}/>)}<Label className="ml-2 text-[12px] text-home-on-sky">3 people, one home</Label></View></Panel>
    <SectionGrid minimumWidth={260} gap={16}>{SECTIONS.map(section => <Pressable key={section.id} accessibilityRole="button" accessibilityLabel={`Open ${section.title}`} onPress={() => onOpen(section.id)}
      className={`min-h-[178px] gap-5 rounded-[28px] p-5 active:opacity-70 ${PALETTES[section.tone].panel}`}>
      <View className="flex-row items-center justify-between"><HouseholdGlyph name={section.id} color={PALETTES[section.tone].ink} size={26}/><Icon name="chevron" size={18} color={PALETTES[section.tone].ink}/></View>
      <View className="gap-2"><Label className={`text-[19px] font-medium ${PALETTES[section.tone].text}`}>{section.title}</Label><Label className={`text-[13px] leading-5 ${PALETTES[section.tone].text}`}>{counts[section.id]}</Label></View>
    </Pressable>)}</SectionGrid>
    <View className="gap-2 rounded-[24px] bg-home-surface p-5"><Label className="text-[14px] font-medium">A shared home, not another feed.</Label><Label className="text-[12px] leading-5 text-home-muted">Tasks, lists and plans belong to your household. This preview uses invented data, keeps changes only in memory, and does not contact any external services.</Label></View>
  </View>;
}
