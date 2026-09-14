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
// The demo's one hardcoded home name — every "Ask {home}" and the account
// menu's title read from here instead of repeating the literal, so they can
// only ever say the same thing.
export const HOME_NAME = 'Spring Street';
export function useAccountMenu(onNavigate: Navigate) {
  const { setSheet, dispatch, notify } = useHome();
  return () => setSheet({ kind: 'menu', title: `${HOME_NAME} Home`, description: 'Reference UI demo · Changes stay in this session.', options: [
    { label: `${HOME_NAME} Home`, selected: true, onPress: () => setSheet(null) },
    { label: 'Home settings', onPress: () => { setSheet(null); onNavigate('settings'); } },
    { label: 'Classic favorites', onPress: () => { setSheet(null); onNavigate('favorites'); } },
    { label: 'Reset demo controls', onPress: () => { dispatch({ type: 'RESET' }); setSheet(null); notify('Demo controls reset'); } },
  ] });
}
export function AskHeader({ onNavigate, transparent = false }: { onNavigate: Navigate; transparent?: boolean }) {
  const account = useAccountMenu(onNavigate);
  const { compact } = useResponsiveLayout();
  return <View className={transparent ? undefined : 'bg-home-surface'}><ContentWidth>
    {/* `paddingBottom` only when compact: on desktop, this header is an
        external sibling above ContentPanel and the column that holds both
        already supplies the gap via `gap-2` (screen-surface.tsx) — adding a
        bottom inset here too would double it. On mobile it's the first thing
        inside the screen's own scroll with no such sibling gap, so it needs
        its own, symmetric with its own top inset. */}
    <View className="flex-row items-center gap-3" style={{ paddingTop: compact ? 8 : 12, paddingBottom: compact ? 8 : undefined }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ask ${HOME_NAME}`} onPress={() => onNavigate('assistant')}
        className="h-[50px] min-w-0 flex-1 flex-row items-center gap-2.5 rounded-full bg-white pl-3 pr-2 active:opacity-70"
        style={{ maxWidth: compact ? undefined : 520 }}>
        <View className="h-7 w-7 items-center justify-center rounded-full bg-home-surface"><Icon name="home" size={17} color={colors.muted} filled/></View>
        <Label numberOfLines={1} className="min-w-0 flex-1 text-[15px]">Ask {HOME_NAME}</Label>
      </Pressable>
      {!compact && <View className="flex-1"/>}
      <IconButton icon="plus" label="Create automation" onPress={() => onNavigate('composer')} className="bg-white"/>
      <Avatar onPress={account} source={assets.avatar}/>
    </View>
  </ContentWidth></View>;
}
export function ClassicHeader({ title, onNavigate, home = false, filter, notifications = false, transparent = false }: { title: string; onNavigate: Navigate; home?: boolean; filter?: () => void; notifications?: boolean; transparent?: boolean }) {
  const account = useAccountMenu(onNavigate);
  const { setSheet } = useHome();
  const { compact } = useResponsiveLayout();
  // Same reasoning as `AskHeader`'s conditional paddingBottom: desktop's own
  // gap comes from the column outside (screen-surface.tsx's `gap-2`); mobile
  // has no such sibling gap and needs its own, symmetric with `pt-2`.
  return <View className={transparent ? undefined : 'bg-home-surface'}><ContentWidth><View className={`min-h-[52px] flex-row items-center gap-2 pt-2 ${compact ? 'pb-2' : ''}`}>
    {home ? <Pressable onPress={account} accessibilityRole="button" accessibilityLabel="Choose home" className="flex-1 flex-row items-center gap-2"><View className="h-7 w-7 items-center justify-center rounded-full bg-home-nav"><Icon name="home" size={16} color={colors.onBlue}/></View><Label numberOfLines={1} className="min-w-0 flex-1 text-[16px]">{title}</Label><Icon name="down" size={13} color={colors.muted}/></Pressable> : <Label className="flex-1 text-[19px]">{title}</Label>}
    {filter && <Pressable accessibilityRole="button" onPress={filter} className="px-2 py-3"><Label className="text-[12px] text-home-on-blue">Filter</Label></Pressable>}
    {notifications && <IconButton size={19} icon="bell" label="Notifications" onPress={() => setSheet({ kind: 'message', title: 'Notifications', description: 'This UI demo has no live notifications.' })}/>}
    <Avatar onPress={account} source={assets.avatar}/>
  </View></ContentWidth></View>;
}
