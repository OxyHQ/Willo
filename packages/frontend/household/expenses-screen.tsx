import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon, Label } from '@willo/ui';
import { PageColumns } from '../layout/page-layout';
import { DEMO_TODAY, MEMBERS, memberName } from './model';
import { balances, formatDay, money, splitExpense } from './logic';
import { useHousehold } from './store';
import { ActionButton, Chip, EmptyState, Panel, Person } from './ui';

export function ExpensesScreen() {
  const { state, dispatch, openEditor } = useHousehold();
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(state.expenses[0]?.id);
  const visible = state.expenses.filter(expense => filter === 'To pay' ? !expense.paid : filter === 'Settled' ? expense.settled : true);
  const selected = visible.find(expense => expense.id === selectedId) ?? visible[0];
  const totals = balances(state.expenses);
  const monthly = state.expenses.filter(expense => expense.date.slice(0, 7) === DEMO_TODAY.slice(0, 7));
  return <PageColumns weights={[1.5, 1]}>
    <View className="gap-5"><Panel tone="yellow"><Label className="text-[12px] text-home-on-yellow">September · Sample shared expenses</Label>
      <Label selectable className="text-[40px] leading-[48px] text-home-on-yellow">{money(monthly.reduce((sum, expense) => sum + expense.cents, 0))}</Label>
      <Label className="text-[13px] text-home-on-yellow">{money(monthly.filter(expense => !expense.paid).reduce((sum, expense) => sum + expense.cents, 0))} still to pay · no bank account connected</Label></Panel>
      <View className="flex-row flex-wrap gap-2">{['All', 'To pay', 'Settled'].map(title => <Chip key={title} title={title} selected={filter === title} onPress={() => setFilter(title)}/>)}</View>
      {!visible.length && <EmptyState title="Nothing in this view" body="Add a shared expense or choose another status."/>}
      {visible.map(expense => <Pressable key={expense.id} accessibilityRole="button" accessibilityLabel={`View split for ${expense.title}`} onPress={() => setSelectedId(expense.id)}
        className={`gap-3 rounded-[25px] p-5 active:opacity-70 ${selected?.id === expense.id ? 'bg-home-yellow' : 'bg-home-surface'}`}>
        <View className="flex-row items-start gap-3"><Label className="min-w-0 flex-1 text-[17px] font-medium">{expense.title}</Label><Label selectable className="text-[20px] font-medium">{money(expense.cents)}</Label></View>
        <Label className="text-[12px] text-home-muted">{expense.paid ? `Paid by ${memberName(expense.payer)}` : `To be paid by ${memberName(expense.payer)}`} · {formatDay(expense.date)}</Label>
        <View className="flex-row flex-wrap items-center justify-between gap-2"><Label className="text-[11px] text-home-muted">{expense.repeat === 'once' ? 'One-off' : expense.repeat} · {expense.participants.length} people</Label><Label className={`text-[11px] font-medium ${expense.settled ? 'text-home-on-green' : expense.paid ? 'text-home-on-sky' : 'text-home-on-peach'}`}>{expense.settled ? 'Settled' : expense.paid ? 'Paid · split open' : 'Unpaid'}</Label></View>
      </Pressable>)}
    </View>
    <View className="gap-5">{selected && <Panel title={`${selected.title} · the split`}>
      {splitExpense(selected).map(share => <View key={share.member} className="flex-row items-center justify-between gap-3"><Person id={share.member} caption/><Label selectable className="text-[14px] font-medium">{money(share.cents)}</Label></View>)}
      <Label className="text-[11px] leading-5 text-home-muted">Equal shares. Any remaining cent goes to members in household order, so the total always matches.</Label>
      {!selected.paid && <ActionButton onPress={() => dispatch({ type: 'pay-expense', id: selected.id })}>Mark paid by {memberName(selected.payer)}</ActionButton>}
      {selected.paid && <ActionButton onPress={() => dispatch({ type: 'settle-expense', id: selected.id })}>{selected.settled ? 'Reopen split' : 'Mark split settled'}</ActionButton>}
      {!selected.settled && <ActionButton secondary onPress={() => openEditor('expense', { title: selected.title, amount: (selected.cents / 100).toFixed(2), member: selected.payer, participants: selected.participants.join(','), date: selected.date, repeat: selected.repeat, paid: selected.paid ? 'yes' : 'no' }, selected.id)}>Edit expense</ActionButton>}
    </Panel>}
    <Panel title="Who is owed what?">{MEMBERS.map(member => <View key={member.id} className="flex-row items-center justify-between gap-3"><Person id={member.id} caption/><View className="items-end gap-1"><Label selectable className="text-[15px] font-medium">{money(Math.abs(totals[member.id]))}</Label><Label className="text-[10px] text-home-muted">{totals[member.id] > 0 ? 'is owed' : totals[member.id] < 0 ? 'owes' : 'all square'}</Label></View></View>)}
      <View className="flex-row items-start gap-2"><Icon name="info" size={16}/><Label className="min-w-0 flex-1 text-[11px] leading-5 text-home-muted">Only paid, unsettled expenses count here. Marking a split settled records an agreement, not a money transfer.</Label></View></Panel>
    </View>
  </PageColumns>;
}
