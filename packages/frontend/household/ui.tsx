import React from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Icon, Label } from '@willo/ui';
import { MEMBERS, memberName, type HouseholdTone, type MemberId } from './model';

export const PALETTES = {
  blue: { panel: 'bg-home-blue', text: 'text-home-on-blue', ink: '#064aba' },
  yellow: { panel: 'bg-home-yellow', text: 'text-home-on-yellow', ink: '#625007' },
  sky: { panel: 'bg-home-sky', text: 'text-home-on-sky', ink: '#00537f' },
  peach: { panel: 'bg-home-peach', text: 'text-home-on-peach', ink: '#8e3205' },
  green: { panel: 'bg-home-green', text: 'text-home-on-green', ink: '#146524' },
} satisfies Record<HouseholdTone, { panel: string; text: string; ink: string }>;
export function Panel({ children, tone, title }: { children: React.ReactNode; tone?: HouseholdTone; title?: string }) {
  return <View className={`min-w-0 gap-4 rounded-[28px] p-5 ${tone ? PALETTES[tone].panel : 'bg-home-surface'}`}>
    {title && <Label accessibilityRole="header" className="text-[17px] font-medium">{title}</Label>}{children}
  </View>;
}
export function ActionButton({ children, onPress, secondary = false, disabled = false, label }: {
  children: React.ReactNode; onPress: () => void; secondary?: boolean; disabled?: boolean; label?: string;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    className={`min-h-[44px] items-center justify-center rounded-full px-4 py-3 active:opacity-60 ${secondary ? 'bg-white' : 'bg-home-sky'} ${disabled ? 'opacity-40' : ''}`}>
    <Label className="text-center text-[13px] font-medium text-home-on-sky">{children}</Label>
  </Pressable>;
}
export function Chip({ title, selected = false, onPress }: { title: string; selected?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    className={`min-h-[44px] items-center justify-center rounded-full px-4 py-2 active:opacity-60 ${selected ? 'bg-home-sky' : 'bg-home-surface'}`}>
    <Label className={`text-[12px] ${selected ? 'font-medium text-home-on-sky' : 'text-home-muted'}`}>{title}</Label>
  </Pressable>;
}
export function Person({ id, caption = false }: { id: MemberId; caption?: boolean }) {
  const member = MEMBERS.find(item => item.id === id);
  return <View className="flex-row items-center gap-2">
    <View accessibilityLabel={memberName(id)} className={`h-8 w-8 items-center justify-center rounded-full ${member?.color.split(' ')[0] ?? 'bg-home-blue'}`}>
      <Label className={`text-[12px] font-medium ${member?.color.split(' ')[1] ?? 'text-home-on-blue'}`}>{member?.initial}</Label>
    </View>{caption && <Label className="text-[12px] text-home-muted">{memberName(id)}</Label>}
  </View>;
}
export function CheckControl({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={onPress}
    className="h-11 w-11 shrink-0 items-center justify-center rounded-full active:bg-home-blue">
    <View className={`h-6 w-6 items-center justify-center rounded-full ${checked ? 'bg-home-on-sky' : 'border-2 border-home-muted'}`}>
      {checked && <Icon name="check" size={16} color="#ffffff"/>}
    </View>
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View className="gap-2"><Label className="text-[12px] font-medium text-home-muted">{label}</Label>
    <TextInput {...props} accessibilityLabel={label} placeholderTextColor="#5f6368" maxLength={props.multiline ? 3000 : 100}
      className={`min-h-[50px] rounded-[18px] bg-home-surface px-4 py-3 text-[15px] text-home-ink ${props.multiline ? 'min-h-[120px]' : ''}`}
      textAlignVertical={props.multiline ? 'top' : 'center'}/>
  </View>;
}
export function Options({ label, options, selected, onChange, multiple = false }: {
  label: string; options: readonly { id: string; title: string }[]; selected: string; onChange: (value: string) => void; multiple?: boolean;
}) {
  return <View className="gap-2"><Label className="text-[12px] font-medium text-home-muted">{label}</Label><View className="flex-row flex-wrap gap-2">
    {options.map(option => <Chip key={option.id} title={option.title} selected={multiple ? selected.split(',').includes(option.id) : selected === option.id}
      onPress={() => onChange(multiple ? (selected.split(',').includes(option.id) ? selected.split(',').filter(item => item !== option.id) : [...selected.split(',').filter(Boolean), option.id]).join(',') : option.id)}/>)}</View>
  </View>;
}
export function EmptyState({ title, body }: { title: string; body: string }) {
  return <View className="items-center gap-3 rounded-[28px] bg-home-surface px-6 py-10"><Icon name="check" size={28} color="#00537f"/>
    <Label className="text-center text-[18px] font-medium">{title}</Label><Label className="text-center text-[13px] leading-5 text-home-muted">{body}</Label>
  </View>;
}
export function Heading({ title, detail }: { title: string; detail?: string }) {
  return <View className="mb-4 mt-2 gap-1"><Label accessibilityRole="header" className="text-[18px] font-medium">{title}</Label>
    {detail && <Label className="text-[12px] text-home-muted">{detail}</Label>}
  </View>;
}
