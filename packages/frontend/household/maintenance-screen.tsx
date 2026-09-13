import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon, Label } from '@willo/ui';
import { PageColumns } from '../layout/page-layout';
import { DEMO_TODAY, memberName } from './model';
import { formatDay } from './logic';
import { useHousehold } from './store';
import { ActionButton, Chip, EmptyState, Panel } from './ui';

export function MaintenanceScreen() {
  const { state, dispatch, openEditor } = useHousehold();
  const [selectedId, setSelectedId] = useState(state.assets[0]?.id);
  const [filter, setFilter] = useState('All items');
  const visible = state.assets.filter(asset => filter !== 'Needs attention' || (asset.due <= DEMO_TODAY && !asset.history.some(entry => entry.date === DEMO_TODAY)));
  const selected = visible.find(asset => asset.id === selectedId) ?? visible[0];
  return <PageColumns weights={[1.15, 1]}>
    <View className="gap-4"><View className="flex-row flex-wrap gap-2">{['All items', 'Needs attention'].map(title => <Chip key={title} title={title} selected={filter === title} onPress={() => setFilter(title)}/>)}</View>
      {!visible.length && <EmptyState title="Nothing overdue" body="Your sample home is up to date. Add an appliance or switch to all items."/>}
      {visible.map(asset => {
        const done = asset.history.some(entry => entry.date === DEMO_TODAY);
        return <Pressable key={asset.id} accessibilityRole="button" accessibilityLabel={`Inspect ${asset.title}`} onPress={() => setSelectedId(asset.id)}
          className={`gap-3 rounded-[25px] p-5 active:opacity-70 ${selected?.id === asset.id ? 'bg-home-blue' : 'bg-home-surface'}`}>
          <View className="flex-row items-center justify-between"><Icon name={done ? 'check' : 'settings'} color="#064aba"/><Label className={`text-[11px] ${done ? 'text-home-on-green' : asset.due <= DEMO_TODAY ? 'text-home-red' : 'text-home-muted'}`}>{done ? 'Serviced today' : asset.due <= DEMO_TODAY ? 'Due now' : `Due ${formatDay(asset.due)}`}</Label></View>
          <Label className="text-[19px] font-medium">{asset.title}</Label><Label className="text-[12px] text-home-muted">{asset.room} · {asset.interval === 'once' ? 'One-off check' : asset.interval}</Label>
        </Pressable>;
      })}
    </View>
    <View className="gap-5">{selected && <><Panel title={selected.title}>
      <Label className="text-[13px] leading-6 text-home-muted">{selected.details || 'Add the model, instructions and warranty reference here.'}</Label>
      <View className="gap-2 rounded-[20px] bg-white p-4"><Label className="text-[12px] font-medium">Warranty</Label>
        <Label className="text-[13px] text-home-muted">{selected.warranty ? `${selected.warranty < DEMO_TODAY ? 'Expired' : 'Covered until'} ${formatDay(selected.warranty, true)}, ${selected.warranty.slice(0, 4)}` : 'No warranty date recorded'}</Label></View>
      <ActionButton disabled={selected.history.some(entry => entry.date === DEMO_TODAY)} onPress={() => dispatch({ type: 'service-asset', id: selected.id })}>Mark serviced today</ActionButton>
      <ActionButton secondary onPress={() => openEditor('asset', { title: selected.title, room: selected.room, date: selected.due, repeat: selected.interval, warranty: selected.warranty, details: selected.details }, selected.id)}>Edit appliance & schedule</ActionButton>
    </Panel><Panel title="Service history">{selected.history.length ? selected.history.map((entry, index) => <View key={`${entry.date}-${index}`} className="flex-row items-center gap-3"><Icon name="check" size={18} color="#146524"/><View><Label className="text-[13px]">{formatDay(entry.date)}</Label><Label className="mt-1 text-[11px] text-home-muted">Recorded by {memberName(entry.by)}</Label></View></View>) : <Label className="text-[13px] text-home-muted">No service recorded yet.</Label>}</Panel></>}
      <Label className="text-[12px] leading-5 text-home-muted">Service history, warranty dates and repeat schedules are demonstration records. This does not book a technician or upload a warranty document.</Label>
    </View>
  </PageColumns>;
}
