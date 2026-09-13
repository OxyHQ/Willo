import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { IconButton, Label } from '@willo/ui';
import { PageColumns } from '../layout/page-layout';
import { DEMO_TODAY, memberName } from './model';
import { addDays, formatDay, normalizedItem } from './logic';
import { HouseholdGlyph } from './glyph';
import { useHousehold } from './store';
import { ActionButton, CheckControl, Chip, EmptyState, Heading, Panel, Person } from './ui';

export function MealsScreen() {
  const { state, dispatch, openEditor } = useHousehold();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(DEMO_TODAY);
  const [hasAddedIngredients, setHasAddedIngredients] = useState(false);
  const meals = state.meals.filter(meal => meal.date === selectedDate);
  return <PageColumns weights={[1.5, 1]}>
    <View className="gap-5"><View className="flex-row flex-wrap gap-2">{Array.from({ length: 7 }, (_, index) => addDays(DEMO_TODAY, index)).map(date => <Chip key={date} title={date === DEMO_TODAY ? 'Tonight' : formatDay(date)} selected={selectedDate === date} onPress={() => { setSelectedDate(date); setHasAddedIngredients(false); }}/>)}</View>
      <Heading title={selectedDate === DEMO_TODAY ? 'What is for dinner?' : `Dinner · ${formatDay(selectedDate)}`} detail="Plan a meal, use what is left, share the shopping."/>
      {!meals.length && <EmptyState title="Dinner is an open question" body="Plan something delicious for this evening."/>}
      {meals.map(meal => <Panel key={meal.id} tone="peach"><View className="flex-row items-center justify-between"><HouseholdGlyph name="meals" size={30} color="#8e3205"/><Label className="text-[12px] text-home-on-peach">{meal.cooked ? 'Cooked' : 'Dinner'} · {meal.servings} servings</Label></View>
        <Label className="text-[30px] leading-10 text-home-on-peach">{meal.title}</Label><View className="flex-row items-center gap-2"><Person id={meal.cook}/><Label className="text-[12px] text-home-on-peach">{memberName(meal.cook)} is cooking</Label></View>
        <View className="gap-2">{meal.ingredients.map(ingredient => {
          const available = state.pantry.some(item => !item.used && item.expires >= DEMO_TODAY && normalizedItem(item.title) === normalizedItem(ingredient));
          const onList = state.shopping.some(item => !item.checkedBy && normalizedItem(item.title) === normalizedItem(ingredient));
          return <View key={ingredient} className="flex-row items-center justify-between gap-3 rounded-[16px] bg-white/60 px-4 py-3"><Label className="min-w-0 flex-1 text-[13px]">{ingredient}</Label><Label className="text-[10px] text-home-muted">{available ? 'At home' : onList ? 'On the list' : 'Needed'}</Label></View>;
        })}</View>
        {meal.ingredients.length > 0 && <ActionButton secondary onPress={() => { dispatch({ type: 'shop-meal', id: meal.id }); setHasAddedIngredients(true); }}>Add missing ingredients to shopping</ActionButton>}
        <View className="flex-row flex-wrap gap-2"><ActionButton secondary onPress={() => dispatch({ type: 'cook-meal', id: meal.id })}>{meal.cooked ? 'Undo cooked' : 'Mark as cooked'}</ActionButton>
          <ActionButton secondary onPress={() => openEditor('meal', { title: meal.title, date: meal.date, member: meal.cook, quantity: meal.servings, ingredients: meal.ingredients.join('\n') }, meal.id)}>Edit meal</ActionButton></View>
      </Panel>)}
      {hasAddedIngredients && <Panel><Label accessibilityLiveRegion="polite" className="text-[13px] text-home-on-sky">Shopping list updated. Items already on the list or available at home were not duplicated.</Label><ActionButton onPress={() => router.navigate({ pathname: '/household/[section]', params: { section: 'shopping' } })}>Open shopping list</ActionButton></Panel>}
      <ActionButton onPress={() => openEditor('meal', { date: selectedDate })}>Plan a meal for {formatDay(selectedDate)}</ActionButton>
    </View>
    <View className="gap-5"><Panel title="Use what is already here"><Label className="text-[12px] leading-5 text-home-muted">Leftovers and ingredients, ordered by their sample use-by date.</Label>
      {[...state.pantry].sort((first, second) => first.expires.localeCompare(second.expires)).map(item => <View key={item.id} className="flex-row items-center gap-2 rounded-[20px] bg-white p-2"><CheckControl checked={item.used} label={`${item.used ? 'Restore' : 'Use up'} ${item.title}`} onPress={() => dispatch({ type: 'use-pantry', id: item.id })}/>
        <View className="min-w-0 flex-1 gap-1"><Label className={`text-[13px] font-medium ${item.used ? 'line-through text-home-muted' : ''}`}>{item.title}</Label><Label className="text-[11px] text-home-muted">{item.quantity} · {item.used ? 'Used up' : `Use by ${formatDay(item.expires)}`}</Label></View>
        <IconButton icon="chevron" label={`Edit food ${item.title}`} size={15} onPress={() => openEditor('pantry', { title: item.title, quantity: item.quantity, date: item.expires }, item.id)}/>
      </View>)}
      <ActionButton secondary onPress={() => openEditor('pantry')}>Add food or leftovers</ActionButton></Panel>
      <Label className="text-[12px] leading-5 text-home-muted">Planning a meal does not reserve groceries or consume pantry items automatically. Mark food used up when it is actually gone.</Label>
    </View>
  </PageColumns>;
}
