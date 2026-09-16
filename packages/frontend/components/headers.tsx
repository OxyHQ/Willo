import React from 'react';
import { assets } from '../data/assets';
import { Pressable, View } from 'react-native';
import { type Navigate } from '../data/screens';
import { useHome, useHomeActions } from '../state/home-context';
import { ContentWidth } from '../layout/page-layout';
import { Icon } from '@willo.sh/ui';
import { Avatar, IconButton, Label } from '@willo.sh/ui';
import { useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';
export function useAccountMenu(onNavigate: Navigate) {
  const { homeName } = useHome();
  const { setSheet } = useHomeActions();
  const { t } = useTranslation();
  return () => setSheet({ kind: 'menu', title: homeName, options: [
    { label: homeName, selected: true, onPress: () => setSheet(null) },
    { label: t('header.homeSettings'), onPress: () => { setSheet(null); onNavigate('settings'); } },
  ] });
}
export function AskHeader({ onNavigate }: { onNavigate: Navigate }) {
  const account = useAccountMenu(onNavigate);
  const { homeName } = useHome();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
  // No background class: this always sits directly on a `bg-background`
  // ancestor (the desktop shell, or the mobile `bleedHeader` gradient
  // wrapper — see `screen-surface.tsx`), so painting one here would either
  // be a redundant repaint or (on mobile) opaquely cover the wrapper's
  // gradient.
  return <View><ContentWidth>
    {/* The bottom inset stops at `shell:`: above that width this header is a
        sibling above ContentPanel and the column holding both already supplies
        the gap (`gap-2` in screen-surface.tsx), so its own would double it.
        Below it the header floats over the screen and needs its own, symmetric
        with the top. Classes, not a measured `compact` — this is styling, and
        a measured one re-renders the subtree on every frame of a resize. */}
    <View className="flex-row items-center gap-3 pb-2 pt-2 shell:pb-0 shell:pt-3">
      {/* `card`/`background`: the same raised-surface-on-shell pairing as
          `ContentPanel` (`screen-surface.tsx`) — a search pill reads the same
          way as that panel, not as a plain page element. `card` is real white
          in light mode (not `sidebar`, which is a slightly tinted off-white)
          and resolves to a sensible raised dark tone in dark mode. */}
      <Pressable accessibilityRole="button" accessibilityLabel={t('header.ask', { home: homeName })} onPress={() => onNavigate('assistant')}
        className="h-[50px] min-w-0 flex-1 flex-row items-center gap-2.5 rounded-full bg-card pl-3 pr-2 active:opacity-70 shell:max-w-[520px]">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-background"><Icon name="home" size={17} color={themeColors.textSecondary} filled/></View>
        <Label numberOfLines={1} className="min-w-0 flex-1 text-[15px]">{t('header.ask', { home: homeName })}</Label>
      </Pressable>
      <View className="hidden flex-1 shell:flex"/>
      <IconButton icon="plus" label={t('composer.title')} onPress={() => onNavigate('composer')} className="bg-card"/>
      <Avatar onPress={account} source={assets.avatar} label={t('common.accountMenu')}/>
    </View>
  </ContentWidth></View>;
}
export function ClassicHeader({ title, onNavigate, home = false, filter, notifications = false }: { title: string; onNavigate: Navigate; home?: boolean; filter?: () => void; notifications?: boolean }) {
  const account = useAccountMenu(onNavigate);
  const { setSheet } = useHomeActions();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
  // Same reasoning as `AskHeader`'s conditional paddingBottom: desktop's own
  // gap comes from the column outside (screen-surface.tsx's `gap-2`); mobile
  // has no such sibling gap and needs its own, symmetric with `pt-2`. No
  // background class here either — same reasoning as `AskHeader`.
  return <View><ContentWidth><View className="min-h-[52px] flex-row items-center gap-2 pb-2 pt-2 shell:pb-0">
    {home ? <Pressable onPress={account} accessibilityRole="button" accessibilityLabel={t('header.chooseHome')} className="flex-1 flex-row items-center gap-2"><View className="h-7 w-7 items-center justify-center rounded-full bg-home-nav"><Icon name="home" size={16} color={themeColors.info}/></View><Label numberOfLines={1} className="min-w-0 flex-1 text-[16px]">{title}</Label><Icon name="down" size={13} color={themeColors.textSecondary}/></Pressable> : <Label className="flex-1 text-[19px]">{title}</Label>}
    {filter && <Pressable accessibilityRole="button" onPress={filter} className="px-2 py-3"><Label className="text-[12px] text-info-text">{t('header.filter')}</Label></Pressable>}
    {notifications && <IconButton size={19} icon="bell" label={t('settings.notifications')} onPress={() => setSheet({ kind: 'message', title: t('settings.notifications'), description: t('header.noNotifications') })}/>}
    <Avatar onPress={account} source={assets.avatar} label={t('common.accountMenu')}/>
  </View></ContentWidth></View>;
}
