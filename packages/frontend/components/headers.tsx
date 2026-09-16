import React from 'react';
import { assets } from '../data/assets';
import { Pressable, View } from 'react-native';
import { type Navigate } from '../data/screens';
import { useHome, useHomeActions } from '../state/home-context';
import { ContentWidth } from '../layout/page-layout';
import { useResponsiveLayout } from '../layout/use-responsive-layout';
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
  const { compact } = useResponsiveLayout();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
  // No background class: this always sits directly on a `bg-background`
  // ancestor (the desktop shell, or the mobile `bleedHeader` gradient
  // wrapper — see `screen-surface.tsx`), so painting one here would either
  // be a redundant repaint or (on mobile) opaquely cover the wrapper's
  // gradient.
  return <View><ContentWidth>
    {/* `paddingBottom` only when compact: on desktop, this header is an
        external sibling above ContentPanel and the column that holds both
        already supplies the gap via `gap-2` (screen-surface.tsx) — adding a
        bottom inset here too would double it. On mobile it's the first thing
        inside the screen's own scroll with no such sibling gap, so it needs
        its own, symmetric with its own top inset. */}
    <View className="flex-row items-center gap-3" style={{ paddingTop: compact ? 8 : 12, paddingBottom: compact ? 8 : undefined }}>
      {/* `card`/`background`: the same raised-surface-on-shell pairing as
          `ContentPanel` (`screen-surface.tsx`) — a search pill reads the same
          way as that panel, not as a plain page element. `card` is real white
          in light mode (not `sidebar`, which is a slightly tinted off-white)
          and resolves to a sensible raised dark tone in dark mode. */}
      <Pressable accessibilityRole="button" accessibilityLabel={t('header.ask', { home: homeName })} onPress={() => onNavigate('assistant')}
        className="h-[50px] min-w-0 flex-1 flex-row items-center gap-2.5 rounded-full bg-card pl-3 pr-2 active:opacity-70"
        style={{ maxWidth: compact ? undefined : 520 }}>
        <View className="h-7 w-7 items-center justify-center rounded-full bg-background"><Icon name="home" size={17} color={themeColors.textSecondary} filled/></View>
        <Label numberOfLines={1} className="min-w-0 flex-1 text-[15px]">{t('header.ask', { home: homeName })}</Label>
      </Pressable>
      {!compact && <View className="flex-1"/>}
      <IconButton icon="plus" label={t('composer.title')} onPress={() => onNavigate('composer')} className="bg-card"/>
      <Avatar onPress={account} source={assets.avatar} label={t('common.accountMenu')}/>
    </View>
  </ContentWidth></View>;
}
export function ClassicHeader({ title, onNavigate, home = false, filter, notifications = false }: { title: string; onNavigate: Navigate; home?: boolean; filter?: () => void; notifications?: boolean }) {
  const account = useAccountMenu(onNavigate);
  const { setSheet } = useHomeActions();
  const { compact } = useResponsiveLayout();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
  // Same reasoning as `AskHeader`'s conditional paddingBottom: desktop's own
  // gap comes from the column outside (screen-surface.tsx's `gap-2`); mobile
  // has no such sibling gap and needs its own, symmetric with `pt-2`. No
  // background class here either — same reasoning as `AskHeader`.
  return <View><ContentWidth><View className={`min-h-[52px] flex-row items-center gap-2 pt-2 ${compact ? 'pb-2' : ''}`}>
    {home ? <Pressable onPress={account} accessibilityRole="button" accessibilityLabel={t('header.chooseHome')} className="flex-1 flex-row items-center gap-2"><View className="h-7 w-7 items-center justify-center rounded-full bg-home-nav"><Icon name="home" size={16} color={themeColors.info}/></View><Label numberOfLines={1} className="min-w-0 flex-1 text-[16px]">{title}</Label><Icon name="down" size={13} color={themeColors.textSecondary}/></Pressable> : <Label className="flex-1 text-[19px]">{title}</Label>}
    {filter && <Pressable accessibilityRole="button" onPress={filter} className="px-2 py-3"><Label className="text-[12px] text-info-text">{t('header.filter')}</Label></Pressable>}
    {notifications && <IconButton size={19} icon="bell" label={t('settings.notifications')} onPress={() => setSheet({ kind: 'message', title: t('settings.notifications'), description: t('header.noNotifications') })}/>}
    <Avatar onPress={account} source={assets.avatar} label={t('common.accountMenu')}/>
  </View></ContentWidth></View>;
}
