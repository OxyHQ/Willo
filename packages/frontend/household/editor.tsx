import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, type BottomSheetRef } from '@oxy.so/bloom/bottom-sheet';
import { IconButton, Label } from '@willo/ui';
import { draftAction } from './logic';
import { MEMBERS, type Draft, type EditorKind, type EditorRequest } from './model';
import { useHousehold } from './store';
import { ActionButton, Field, Options } from './ui';

type FieldSpec = { key: string; label: string; placeholder?: string; multiline?: boolean; numeric?: boolean; choices?: readonly { id: string; title: string }[]; multiple?: boolean };
const MEMBER_OPTIONS = MEMBERS.map(member => ({ id: member.id, title: member.name }));
const REPEAT_OPTIONS = [{ id: 'once', title: 'Once' }, { id: 'daily', title: 'Daily' }, { id: 'weekly', title: 'Weekly' }, { id: 'monthly', title: 'Monthly' }];
const DATE_FIELD: FieldSpec = { key: 'date', label: 'Date (YYYY-MM-DD)', placeholder: '2026-09-14' };
const REPEAT_FIELD: FieldSpec = { key: 'repeat', label: 'Repeats', choices: REPEAT_OPTIONS };
const FORM_TITLES: Record<EditorKind, string> = { task: 'task', shopping: 'shopping item', event: 'calendar event', note: 'note', package: 'package', asset: 'maintenance item', expense: 'expense', meal: 'meal', pantry: 'food item' };
const FORM_FIELDS: Record<EditorKind, FieldSpec[]> = {
  task: [DATE_FIELD, { key: 'category', label: 'Category', choices: ['Cleaning', 'Waste', 'Pet', 'Plants', 'Laundry', 'Other'].map(title => ({ id: title, title })) }, REPEAT_FIELD,
    { key: 'member', label: 'Assigned to', choices: MEMBER_OPTIONS }, { key: 'rotate', label: 'Rotate after each occurrence', choices: [{ id: 'no', title: 'Same person' }, { id: 'yes', title: 'Take turns' }] }],
  shopping: [{ key: 'quantity', label: 'Quantity', placeholder: '2 cartons' }, { key: 'category', label: 'Aisle', choices: ['Produce', 'Dairy', 'Bakery', 'Household', 'Other'].map(title => ({ id: title, title })) }],
  event: [DATE_FIELD, { key: 'endDate', label: 'End date (optional)', placeholder: 'For visits or holidays spanning several days' }, { key: 'time', label: 'Time (24-hour, optional)', placeholder: '18:30' },
    { key: 'category', label: 'Event type', choices: ['Visit', 'Repair', 'Cleaning', 'Delivery', 'Holiday', 'Birthday'].map(title => ({ id: title, title })) },
    { key: 'member', label: 'Coordinated by', choices: MEMBER_OPTIONS }, { key: 'details', label: 'Details', multiline: true }],
  note: [{ key: 'body', label: 'Note', multiline: true }, { key: 'access', label: 'Who can read this?', choices: [{ id: 'home', title: 'Everyone at home' }, { id: 'selected', title: 'Selected members' }, { id: 'private', title: 'Only me' }] }, { key: 'readers', label: 'Allowed readers', choices: MEMBER_OPTIONS, multiple: true }],
  package: [{ key: 'member', label: 'Expected by', choices: MEMBER_OPTIONS }, DATE_FIELD, { key: 'details', label: 'Drop-off / collection location', placeholder: 'Front door, neighbour or parcel locker' }],
  asset: [{ key: 'room', label: 'Room / location', placeholder: 'Utility room' }, DATE_FIELD, REPEAT_FIELD, { key: 'warranty', label: 'Warranty until (YYYY-MM-DD, optional)' }, { key: 'details', label: 'Model, warranty reference & instructions', multiline: true }],
  expense: [{ key: 'amount', label: 'Amount in euros', placeholder: '32.00', numeric: true }, { key: 'member', label: 'Paid / to be paid by', choices: MEMBER_OPTIONS },
    { key: 'participants', label: 'Split equally between', choices: MEMBER_OPTIONS, multiple: true }, DATE_FIELD, REPEAT_FIELD,
    { key: 'paid', label: 'Payment status', choices: [{ id: 'yes', title: 'Already paid' }, { id: 'no', title: 'Not paid yet' }] }],
  meal: [DATE_FIELD, { key: 'member', label: 'Who is cooking?', choices: MEMBER_OPTIONS }, { key: 'quantity', label: 'Servings', placeholder: '3' }, { key: 'ingredients', label: 'Ingredients (one per line)', multiline: true, placeholder: 'Tomatoes\nPasta\nBasil' }],
  pantry: [{ key: 'quantity', label: 'Quantity / portions', placeholder: '2 portions' }, { ...DATE_FIELD, label: 'Use-by date (YYYY-MM-DD)' }],
};
function HouseholdForm({ request }: { request: EditorRequest }) {
  const { state, dispatch, closeEditor } = useHousehold();
  const [values, setValues] = useState<Draft>(request.values);
  const [error, setError] = useState('');
  function handleSave() {
    const result = draftAction(request, values, state);
    if ('error' in result) { setError(result.error); return; }
    dispatch(result.action);
    closeEditor();
  }
  return <View className="gap-5 pb-5">
    <View className="flex-row items-center gap-3"><Label accessibilityRole="header" className="min-w-0 flex-1 text-[23px]">{request.isNew ? 'Add' : 'Edit'} {FORM_TITLES[request.kind]}</Label>
      <IconButton icon="close" label="Close household editor" onPress={closeEditor}/></View>
    <Field label="Name" value={values.title ?? ''} onChangeText={title => setValues(previous => ({ ...previous, title }))} placeholder={`Name this ${FORM_TITLES[request.kind]}`}/>
    {FORM_FIELDS[request.kind].filter(field => field.key !== 'readers' || values.access === 'selected').map(field => field.choices ?
      <Options key={field.key} label={field.label} options={field.choices} selected={values[field.key] ?? ''} multiple={field.multiple} onChange={value => setValues(previous => ({ ...previous, [field.key]: value }))}/> :
      <Field key={field.key} label={field.label} value={values[field.key] ?? ''} multiline={field.multiline} placeholder={field.placeholder}
        keyboardType={field.numeric ? 'decimal-pad' : 'default'} onChangeText={value => setValues(previous => ({ ...previous, [field.key]: value }))}/>)}
    {request.kind === 'note' && <Label className="text-[12px] leading-5 text-home-muted">Permission preview only. Real access control must be enforced by the server. Do not enter real access codes or passwords.</Label>}
    {error !== '' && <Label accessibilityRole="alert" accessibilityLiveRegion="assertive" className="text-[13px] text-home-red">{error}</Label>}
    <ActionButton onPress={handleSave}>Save {FORM_TITLES[request.kind]}</ActionButton>
    <Label className="text-center text-[11px] text-home-muted">Saved only in this preview session. No service is contacted.</Label>
  </View>;
}
/** A single Bloom host at the app root; route changes do not multiply modal instances. */
export function HouseholdEditor() {
  const { editor, closeEditor } = useHousehold();
  const sheetRef = useRef<BottomSheetRef>(null);
  useEffect(() => {
    if (editor) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [editor]);
  return <BottomSheet ref={sheetRef} detached style={{ maxWidth: 680 }} onDismiss={closeEditor}>
    {editor && <HouseholdForm key={editor.id} request={editor}/>}
  </BottomSheet>;
}
