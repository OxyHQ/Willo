import React from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { IconButton, Label } from '@willo/ui';
import { ContentWidth, PageScroll } from '../layout/page-layout';
import { MEMBERS, SECTIONS, type EditorKind, type HouseholdSection } from './model';
import { useHousehold } from './store';
import { ActionButton, Chip } from './ui';
import { HouseholdOverview } from './overview';
import { TasksScreen } from './tasks-screen';
import { ShoppingScreen } from './shopping-screen';
import { CalendarScreen } from './calendar-screen';
import { NotesScreen } from './notes-screen';
import { PackagesScreen } from './packages-screen';
import { MaintenanceScreen } from './maintenance-screen';
import { ExpensesScreen } from './expenses-screen';
import { MealsScreen } from './meals-screen';

const EDITOR_FOR_SECTION: Record<HouseholdSection, EditorKind> = { tasks: 'task', shopping: 'shopping', calendar: 'event', notes: 'note', packages: 'package', maintenance: 'asset', expenses: 'expense', meals: 'meal' };
export function HouseholdScreen({ section }: { section?: HouseholdSection }) {
  const { state, dispatch, openEditor } = useHousehold();
  const router = useRouter();
  const definition = SECTIONS.find(item => item.id === section);
  function handleOpen(destination: HouseholdSection) { router.navigate({ pathname: '/household/[section]', params: { section: destination } }); }
  let content: React.ReactNode;
  switch (section) {
    case 'tasks': content = <TasksScreen/>; break;
    case 'shopping': content = <ShoppingScreen/>; break;
    case 'calendar': content = <CalendarScreen/>; break;
    case 'notes': content = <NotesScreen key={state.actor}/>; break;
    case 'packages': content = <PackagesScreen/>; break;
    case 'maintenance': content = <MaintenanceScreen/>; break;
    case 'expenses': content = <ExpensesScreen/>; break;
    case 'meals': content = <MealsScreen/>; break;
    default: content = <HouseholdOverview onOpen={handleOpen}/>;
  }
  return <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} className="min-h-0 flex-1 bg-white">
    <ContentWidth><View className="flex-row items-center gap-3 py-3">
      <IconButton icon={section ? 'back' : 'home'} label={section ? 'Back to household overview' : 'Back to home controls'} onPress={() => router.navigate(section ? '/household' : '/')}/>
      <View className="min-w-0 flex-1 gap-1"><Label className="text-[14px] font-medium">Spring Street Home</Label><Label className="text-[11px] text-home-muted">Household · local UI preview</Label></View>
    </View></ContentWidth>
    <PageScroll bottom={40}><View className="gap-5 pt-2">
      <View className="flex-row flex-wrap items-center justify-between gap-3"><View className="min-w-0 flex-1 gap-2"><Label accessibilityRole="header" className="text-[28px] leading-9">{definition?.title ?? 'Household'}</Label>
        {definition && <Label className="text-[13px] leading-5 text-home-muted">{definition.description}</Label>}</View>
        {section && <ActionButton onPress={() => openEditor(EDITOR_FOR_SECTION[section])}>+ Add</ActionButton>}
      </View>
      <View className="flex-row flex-wrap items-center gap-2"><Label className="mr-1 text-[11px] text-home-muted">Preview as</Label>{MEMBERS.map(member => <Chip key={member.id} title={member.name} selected={state.actor === member.id} onPress={() => dispatch({ type: 'actor', id: member.id })}/>)}</View>
      {section && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>{SECTIONS.map(item => <Chip key={item.id} title={item.short} selected={item.id === section} onPress={() => handleOpen(item.id)}/>)}</ScrollView>}
      {content}
    </View></PageScroll>
  </KeyboardAvoidingView>;
}
