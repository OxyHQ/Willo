import React from 'react';
import { Image, type ImageSource } from 'expo-image';
import { Pressable, Text, View, type TextProps, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './icon';
import { colors, tones, type Tone } from '../theme/tokens';
export function Label({ className = '', ...props }: TextProps & { className?: string }) {
  return <Text {...props} className={`font-sans text-home-ink ${className}`} />;
}
export function IconButton({ icon, onPress, label, color = colors.ink, className = '', size = 22, disabled = false, shape = 'regular' }: { icon: IconName; onPress: () => void; label: string; color?: string; className?: string; size?: number; disabled?: boolean; shape?: 'regular' | 'small' | 'stepper' }) {
  const dimensions = { regular: 'h-11 w-11', small: 'h-9 w-9', stepper: 'h-[58px] w-[66px]' }[shape];
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={4} className={`${dimensions} items-center justify-center rounded-full active:opacity-60 ${disabled ? 'opacity-40' : ''} ${className}`}><Icon name={icon} size={size} color={color}/></Pressable>;
}
export function Avatar({ onPress, source, label = 'Account menu' }: { onPress: () => void; source: ImageSource; label?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="h-9 w-9 overflow-hidden rounded-full bg-home-surface active:opacity-70"><Image source={source} style={{ width: '100%', height: '100%' }} contentFit="cover"/></Pressable>;
}
export function SectionTitle({ children, right, onPress }: { children: React.ReactNode; right?: string; onPress?: () => void }) {
  return <View className="mb-3 mt-5 flex-row items-center justify-between"><Label className="text-[13px] font-medium">{children}</Label>{right && <Pressable onPress={onPress} accessibilityRole="button" className="p-1"><Label className="text-[12px] font-medium text-home-on-blue">{right}</Label></Pressable>}</View>;
}
export function Tile({ title, subtitle, icon, tone = 'neutral', onPress, onLongPress, brightness, chevron = false, active, height = 80 }: { title: string; subtitle?: string; icon: IconName; tone?: Tone; onPress: () => void; onLongPress?: () => void; brightness?: number; chevron?: boolean; active?: boolean; height?: number }) {
  const t = tones[tone];
  return <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityRole={active === undefined ? 'button' : 'switch'} accessibilityState={active === undefined ? undefined : { checked: active }} accessibilityLabel={`${title}${subtitle ? ', ' + subtitle : ''}`} accessibilityHint={onLongPress ? 'Hold to adjust brightness' : undefined} className={`relative flex-1 flex-row items-center gap-3 overflow-hidden rounded-[24px] px-4 active:opacity-75 ${t.tile}`} style={{ minHeight: height }}>
    {brightness !== undefined && <View pointerEvents="none" className="absolute bottom-0 left-0 top-0 bg-home-yellow-fill" style={{ width: `${Math.min(100, Math.max(0, brightness))}%` as ViewStyle['width'] }}/>}
    <View className="relative"><Icon name={icon} size={20} color={t.color} filled={active === true && (icon === 'light' || icon === 'lock')}/></View>
    <View className="flex-1 py-2"><Label className={`text-[13px] font-medium leading-[17px] ${t.text}`}>{title}</Label>{subtitle && <Label className={`mt-0.5 text-[11px] leading-[14px] ${t.text}`}>{subtitle}</Label>}</View>
    {chevron && <Icon name="chevron" size={16} color={t.color}/>}
  </Pressable>;
}
export function AddButton({ onPress }: { onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Add automation or device" onPress={onPress} className="absolute bottom-5 right-4 flex-row items-center gap-2 rounded-[15px] bg-home-blue px-4 py-3 active:opacity-70" style={{ boxShadow: '0 2px 5px rgba(29,52,91,0.14)' }}><Icon name="plus" size={20} color={colors.onBlue}/><Label className="text-[13px] font-medium text-home-on-blue">Add</Label></Pressable>;
}
export function Pill({ label, onPress, selected = false }: { label: string; onPress: () => void; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} className={`flex-row items-center gap-2 rounded-lg border px-3 py-2 active:opacity-70 ${selected ? 'border-home-sky bg-home-sky' : 'border-home-border bg-white'}`}><Label className="text-[12px]">{label}</Label><Icon name="down" size={12}/></Pressable>;
}
