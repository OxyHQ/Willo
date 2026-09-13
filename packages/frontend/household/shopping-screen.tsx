import React, { useState } from 'react';
import { View } from 'react-native';
import { Icon, Label } from '@willo/ui';
import { PageColumns } from '../layout/page-layout';
import { memberName } from './model';
import { useHousehold } from './store';
import { ActionButton, CheckControl, Chip, EmptyState, Field, Panel } from './ui';

export function ShoppingScreen() {
  const { state, dispatch } = useHousehold();
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('To buy');
  const [error, setError] = useState('');
  const pending = state.shopping.filter(item => !item.checkedBy);
  const checked = state.shopping.filter(item => item.checkedBy);
  const visible = filter === 'To buy' ? pending : checked;
  function handleAdd() {
    const title = draft.trim();
    if (!title || title.length > 100) { setError('Enter an item name, up to 100 characters.'); return; }
    dispatch({ type: 'add-shopping', record: { id: `shopping-${Date.now()}-${state.shopping.length}`, title, quantity: '1', category: 'Other', addedBy: state.actor } });
    setDraft(''); setError('');
  }
  return <PageColumns weights={[1.6, 1]}>
    <View className="gap-5"><View className="gap-3 rounded-[28px] bg-home-yellow p-5"><Label className="text-[23px] text-home-on-yellow">What do we need?</Label>
      <Field label="Add to the shared list" value={draft} onChangeText={setDraft} placeholder="Milk, bread, something for dinner…" onSubmitEditing={handleAdd} returnKeyType="done"/>
      <ActionButton secondary onPress={handleAdd}>Add item</ActionButton>{error !== '' && <Label accessibilityRole="alert" className="text-[12px] text-home-red">{error}</Label>}
    </View>
    <View className="flex-row flex-wrap gap-2"><Chip title={`To buy · ${pending.length}`} selected={filter === 'To buy'} onPress={() => setFilter('To buy')}/><Chip title={`Picked up · ${checked.length}`} selected={filter === 'Picked up'} onPress={() => setFilter('Picked up')}/></View>
    {!visible.length && <EmptyState title={filter === 'To buy' ? 'The list is all checked off' : 'Nothing picked up yet'} body="Add something above or tick an item while shopping."/>}
    {[...new Set(visible.map(item => item.category))].map(category => <View key={category} className="gap-2"><Label className="px-1 text-[12px] font-medium text-home-muted">{category}</Label>
      {visible.filter(item => item.category === category).map(item => <View key={item.id} className="flex-row items-center gap-2 rounded-[22px] bg-home-surface p-3">
        <CheckControl checked={!!item.checkedBy} label={`Mark ${item.title} ${item.checkedBy ? 'needed' : 'picked up'}`} onPress={() => dispatch({ type: 'toggle-shopping', id: item.id })}/>
        <View className="min-w-0 flex-1 gap-1"><Label className={`text-[15px] ${item.checkedBy ? 'line-through text-home-muted' : 'font-medium'}`}>{item.title}</Label>
          <Label className="text-[11px] text-home-muted">{item.quantity} · {item.checkedBy ? `Picked up by ${memberName(item.checkedBy)}` : `Added by ${memberName(item.addedBy)}`}</Label></View>
      </View>)}</View>)}
    </View>
    <View className="gap-5"><Panel title="One list for everyone"><Icon name="person" color="#00537f"/><Label className="text-[14px] leading-6 text-home-muted">Anyone in the household can add items and mark them while shopping. Switch the preview member above to try it.</Label>
      <Label className="text-[34px] text-home-on-sky" accessibilityLiveRegion="polite">{pending.length} <Label className="text-[14px]">items left</Label></Label></Panel>
      <Panel title="Already in the basket"><Label className="text-[13px] leading-5 text-home-muted">{checked.length} picked up. Clearing removes only checked items from this session.</Label><ActionButton disabled={!checked.length} secondary onPress={() => dispatch({ type: 'clear-shopping' })}>Clear picked-up items</ActionButton></Panel>
      <Label className="text-[12px] leading-5 text-home-muted">This preview shares state between its screens, not between devices. Live household sync is not connected.</Label>
    </View>
  </PageColumns>;
}
