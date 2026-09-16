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
/**
 * The app's one header.
 *
 * There used to be several — an "Ask <home>" pill on some screens, a title
 * bar on others, each with its own arrangement. One row now, with the same
 * actions always in the same place, so a swipe moves the screens under a
 * header that holds still.
 *
 * A screen with a title shows it, plainly, where the pill would be. Only a
 * screen without one — the home — offers the pill, because there the header
 * has something to invite rather than something to name.
 *
 * No background class: it always sits on a `bg-background` ancestor or over
 * the shell's own gradient, so painting one here would either repaint or hide
 * the fade.
 */
export function AppHeader({ title, onNavigate, actions }: { title?: string; onNavigate: Navigate; actions?: React.ReactNode }) {
  const account = useAccountMenu(onNavigate);
  const { homeName } = useHome();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
  const ask = t('header.ask', { home: homeName });
  // `card`/`background`: the same raised-surface-on-shell pairing as
  // `ContentPanel` — the pill reads as a raised surface, not a plain page
  // element. `card` is real white in light mode and a sensible raised dark
  // tone in dark mode.
  const pill = (
    <Pressable accessibilityRole="button" accessibilityLabel={ask} onPress={() => onNavigate('assistant')}
      className="h-[50px] min-w-0 flex-1 flex-row items-center gap-2.5 rounded-full bg-card pl-3 pr-2 active:opacity-70 shell:max-w-[520px]">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-background"><Icon name="home" size={17} color={themeColors.textSecondary} filled/></View>
      <Label numberOfLines={1} className="min-w-0 flex-1 text-[15px]">{ask}</Label>
    </Pressable>
  );
  return <View><ContentWidth>
    {/* The bottom inset stops at `shell:`: above that width the header is a
        sibling above ContentPanel and the column holding both already supplies
        the gap, so its own would double it. Below it the header floats over
        the screen and needs its own, symmetric with the top. Classes, not a
        measured `compact` — this is styling, and a measured one re-renders the
        subtree on every frame of a resize. */}
    {/* `min-h-[50px]` is the pill's own height, held by the row whether or not
        there is a pill in it — otherwise a screen with a title had a shorter
        header than one without, and the whole thing jumped as you moved
        between them. */}
    <View className="min-h-[50px] flex-row items-center gap-3 pb-2 pt-2 shell:pb-0 shell:pt-3">
      {title === undefined
        ? pill
        : <Label accessibilityRole="header" numberOfLines={1} className="min-w-0 flex-1 text-[19px]">{title}</Label>}
      <View className="hidden flex-1 shell:flex"/>
      {actions}
      <IconButton icon="plus" label={t('composer.title')} onPress={() => onNavigate('composer')} className="bg-card"/>
      <Avatar onPress={account} source={assets.avatar} label={t('common.accountMenu')}/>
    </View>
  </ContentWidth></View>;
}
/** The assistant is a pushed, full-screen destination, so its header is a way back rather than a place. */
export function AssistantHeader({ onNavigate }: { onNavigate: Navigate }) {
  const { homeName } = useHome();
  const { t } = useTranslation();
  return <ContentWidth maxWidth={808}><View className="flex-row items-center gap-2 pt-2"><IconButton icon="back" label={t('assistant.back')} onPress={() => onNavigate('home')}/><Label className="text-[13px] text-muted-foreground">{t('header.ask', { home: homeName })}</Label></View></ContentWidth>;
}
/** Emergency is a modal-feeling screen: one way out, nothing else. */
export function EmergencyHeader({ onNavigate }: { onNavigate: Navigate }) {
  const { t } = useTranslation();
  return <ContentWidth maxWidth={1200}><View className="items-start pt-2"><IconButton icon="close" label={t('emergency.close')} onPress={() => onNavigate('home')}/></View></ContentWidth>;
}
