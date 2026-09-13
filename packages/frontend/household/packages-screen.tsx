import React, { useState } from 'react';
import { View } from 'react-native';
import { IconButton, Label } from '@willo/ui';
import { PageColumns } from '../layout/page-layout';
import { memberName } from './model';
import { formatDay } from './logic';
import { HouseholdGlyph } from './glyph';
import { useHousehold } from './store';
import { ActionButton, Chip, EmptyState, Panel, Person } from './ui';

export function PackagesScreen() {
  const { state, dispatch, openEditor } = useHousehold();
  const [filter, setFilter] = useState('Active');
  const visible = state.packages.filter(parcel => filter === 'Collected' ? parcel.status === 'collected' : parcel.status !== 'collected');
  return <PageColumns weights={[1.6, 1]}>
    <View className="gap-4"><View className="flex-row gap-2">{['Active', 'Collected'].map(title => <Chip key={title} title={title} selected={filter === title} onPress={() => setFilter(title)}/>)}</View>
      {!visible.length && <EmptyState title="Nothing waiting here" body="Add an expected package or check the collected tab."/>}
      {visible.map(parcel => <Panel key={parcel.id} tone={parcel.status === 'delivered' ? 'green' : undefined}>
        <View className="flex-row items-center gap-3"><HouseholdGlyph name="packages" color="#146524"/><Label className="min-w-0 flex-1 text-[19px] font-medium">{parcel.title}</Label>
          <IconButton icon="chevron" label={`Edit package ${parcel.title}`} onPress={() => openEditor('package', { title: parcel.title, member: parcel.recipient, date: parcel.date, details: parcel.location }, parcel.id)} size={16}/></View>
        <View className="flex-row flex-wrap items-center justify-between gap-3"><Person id={parcel.recipient} caption/><Label className="text-[12px] text-home-muted">Expected {formatDay(parcel.date)}</Label></View>
        <View className="flex-row flex-wrap gap-2">{(['expected', 'delivered', 'collected'] as const).map(status => <View key={status} className={`rounded-full px-3 py-2 ${parcel.status === status ? 'bg-white' : 'bg-transparent'}`}><Label className={`text-[11px] ${parcel.status === status ? 'font-semibold text-home-on-green' : 'text-home-muted'}`}>{status === 'expected' ? 'On the way' : status === 'delivered' ? 'At the door' : 'Collected'}</Label></View>)}</View>
        <Label className="text-[13px] text-home-muted">{parcel.location}{parcel.collectedBy ? ` · Picked up by ${memberName(parcel.collectedBy)}` : ''}</Label>
        <ActionButton secondary onPress={() => dispatch({ type: parcel.status === 'collected' ? 'undo-collection' : 'advance-package', id: parcel.id })}>
          {parcel.status === 'expected' ? 'Mark as delivered' : parcel.status === 'delivered' ? `Collected by ${memberName(state.actor)}` : 'Undo collection'}
        </ActionButton>
      </Panel>)}
    </View>
    <View className="gap-5"><Panel tone="green"><HouseholdGlyph name="packages" size={36} color="#146524"/><Label className="text-[27px] leading-9 text-home-on-green">Someone at home can help.</Label>
      <Label className="text-[13px] leading-6 text-home-on-green">See who is expecting something, where it was left, and who picked it up.</Label></Panel>
      <Panel title="At a glance"><Label className="text-[35px] text-home-on-green">{state.packages.filter(parcel => parcel.status === 'delivered').length}</Label><Label className="text-[13px] text-home-muted">packages ready to bring inside</Label></Panel>
      <Label className="text-[12px] leading-5 text-home-muted">Statuses are changed manually in this preview. No carrier tracking, address or delivery service is connected.</Label>
    </View>
  </PageColumns>;
}
