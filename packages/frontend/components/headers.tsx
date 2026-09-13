import React from 'react';
import { assets } from '../data/assets';
import { Pressable, View } from 'react-native';
import { type Navigate } from '../data/screens';
import { useHome } from '../state/home-context';
import { ContentWidth } from '../layout/page-layout';
import { useResponsiveLayout } from '../layout/responsive-context';
import { colors } from '@willo/ui';
import { Icon } from '@willo/ui';
import { Avatar, IconButton, Label } from '@willo/ui';
export function useAccountMenu(onNavigate: Navigate) {
  const { setSheet, dispatch, notify } = useHome();
  return () => setSheet({ kind: 'menu', title: 'Spring Street Home', description: 'Reference UI demo · Changes stay in this session.', options: [
    { label: 'Spring Street Home', selected: true, onPress: () => setSheet(null) },
    { label: 'Home settings', onPress: () => { setSheet(null); onNavigate('settings'); } },
    { label: 'Classic favorites', onPress: () => { setSheet(null); onNavigate('favorites'); } },
    { label: 'Reset demo controls', onPress: () => { dispatch({ type: 'RESET' }); setSheet(null); notify('Demo controls reset'); } },
  ] });
}
export function AskHeader({ onNavigate }: { onNavigate: Navigate }) {
  const account = useAccountMenu(onNavigate);
  const { compact } = useResponsiveLayout();
  return <View className="bg-home-surface"><ContentWidth>
    <View className="flex-row items-center gap-3" style={{ paddingTop: compact ? 8 : 20, paddingBottom: compact ? 16 : 20 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Ask Spring Street" onPress={() => onNavigate('assistant')}
        className="h-[50px] min-w-0 flex-1 flex-row items-center gap-2.5 rounded-full bg-white pl-3 pr-2 active:opacity-70"
        style={{ maxWidth: compact ? undefined : 520 }}>
        <View className="h-7 w-7 items-center justify-center rounded-full bg-home-surface"><Icon name="home" size={17} color={colors.muted} filled/></View>
        <Label numberOfLines={1} className="min-w-0 flex-1 text-[15px]">Ask Spring Street</Label>
      </Pressable>
      {!compact && <View className="flex-1"/>}
      <IconButton icon="plus" label="Create automation" onPress={() => onNavigate('composer')} className="bg-white"/>
      <Avatar onPress={account} source={assets.avatar}/>
    </View>
  </ContentWidth></View>;
}
export function ClassicHeader({ title, onNavigate, home = false, filter, notifications = false }: { title: string; onNavigate: Navigate; home?: boolean; filter?: () => void; notifications?: boolean }) {
  const account = useAccountMenu(onNavigate);
  const { setSheet } = useHome();
  return <View className="bg-white"><ContentWidth><View className="min-h-[68px] flex-row items-center gap-2 pb-3 pt-3">
    {home ? <Pressable onPress={account} accessibilityRole="button" accessibilityLabel="Choose home" className="flex-1 flex-row items-center gap-2"><View className="h-7 w-7 items-center justify-center rounded-full bg-home-nav"><Icon name="home" size={16} color={colors.onBlue}/></View><Label numberOfLines={1} className="min-w-0 flex-1 text-[16px]">{title}</Label><Icon name="down" size={13} color={colors.muted}/></Pressable> : <Label className="flex-1 text-[19px]">{title}</Label>}
    {filter && <Pressable accessibilityRole="button" onPress={filter} className="px-2 py-3"><Label className="text-[12px] text-home-on-blue">Filter</Label></Pressable>}
    {notifications && <IconButton size={19} icon="bell" label="Notifications" onPress={() => setSheet({ kind: 'message', title: 'Notifications', description: 'This UI demo has no live notifications.' })}/>}
    <Avatar onPress={account} source={assets.avatar}/>
  </View></ContentWidth></View>;
}
