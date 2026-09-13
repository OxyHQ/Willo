import React from 'react';
import { Pressable, View } from 'react-native';
import { assets } from '../data/assets';
import { type Navigate } from '../data/screens';
import { useHome } from '../state/home-context';
import { colors, Icon, Avatar, IconButton, Label } from '@willo/ui';
export function useAccountMenu(onNavigate: Navigate) {
  const { setSheet, dispatch, notify } = useHome();
  return () => setSheet({ kind: 'menu', title: 'Spring Street Home', description: 'Reference UI demo · Changes stay in this session.', options: [
    { label: 'Spring Street Home', selected: true, onPress: () => setSheet(null) },
    { label: 'Home settings', onPress: () => { setSheet(null); onNavigate('settings'); } },
    { label: 'View all 12 screens', onPress: () => { setSheet(null); onNavigate('gallery'); } },
    { label: 'Reset demo controls', onPress: () => { dispatch({ type: 'RESET' }); setSheet(null); notify('Demo controls reset'); } },
  ] });
}
export function AskHeader({ onNavigate }: { onNavigate: Navigate }) {
  const account = useAccountMenu(onNavigate);
  return <View className="flex-row items-center gap-3 bg-home-surface px-4 pb-4 pt-1">
    <Pressable accessibilityRole="button" accessibilityLabel="Ask Spring Street" onPress={() => onNavigate('assistant')} className="h-[50px] flex-1 flex-row items-center gap-2.5 rounded-full bg-white pl-3 pr-2 active:opacity-70"><View className="h-7 w-7 items-center justify-center rounded-full bg-home-surface"><Icon name="home" size={17} color={colors.muted} filled/></View><Label numberOfLines={1} className="text-[15px]">Ask Spring Street</Label></Pressable>
    <IconButton icon="plus" label="Create automation" onPress={() => onNavigate('composer')} className="bg-white"/><Avatar onPress={account} source={assets.avatar}/>
  </View>;
}
export function ClassicHeader({ title, onNavigate, home = false, filter, notifications = false }: { title: string; onNavigate: Navigate; home?: boolean; filter?: () => void; notifications?: boolean }) {
  const account = useAccountMenu(onNavigate);
  const { setSheet } = useHome();
  return <View className="min-h-[60px] flex-row items-center gap-2 bg-white px-4 pb-3 pt-1">
    {home ? <Pressable onPress={account} accessibilityRole="button" accessibilityLabel="Choose home" className="flex-1 flex-row items-center gap-2"><View className="h-7 w-7 items-center justify-center rounded-full bg-home-nav"><Icon name="home" size={16} color={colors.onBlue}/></View><Label className="text-[16px]">{title}</Label><Icon name="down" size={13} color={colors.muted}/></Pressable> : <Label className="flex-1 text-[19px]">{title}</Label>}
    {filter && <Pressable accessibilityRole="button" onPress={filter} className="px-2 py-3"><Label className="text-[12px] text-home-on-blue">Filter</Label></Pressable>}
    {notifications && <IconButton size={19} icon="bell" label="Notifications" onPress={() => setSheet({ kind: 'message', title: 'Notifications', description: 'This UI demo has no live notifications.' })}/>}
    <Avatar onPress={account} source={assets.avatar}/>
  </View>;
}
