import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ParseKeys } from 'i18next';
import { IconButton, Label } from '@willo.sh/ui';
import { Pressable } from 'react-native';
import { AppHeader, AssistantHeader, EmergencyHeader } from './headers';
import { ComposerHeader, ComposerProvider } from '../screens/composer-draft';
import { TimelineFilterProvider, useTimelineFilter } from '../screens/timeline-filter';
import { type Navigate, type ScreenId } from '../data/screens';
import { useHomeActions } from '../state/home-context';

/**
 * A screen's title, where it has one. Home has none on purpose: its header
 * offers the assistant instead, which is what the pill says when this table
 * is silent.
 */
const SCREEN_TITLES: Partial<Record<ScreenId, ParseKeys>> = {
  devices: 'nav.devices',
  activity: 'nav.activity',
  timeline: 'nav.activity',
  automations: 'nav.automations',
  routines: 'nav.automations',
  settings: 'nav.settings',
};

/**
 * The app's one header, mounted in the shell rather than inside the routed
 * content — so swiping between tabs moves the SCREENS and leaves the header
 * where it is, instead of carrying a second copy of the same chrome across
 * with them.
 *
 * The three pushed, full-screen destinations keep their own minimal chrome:
 * they are ways OUT (a back arrow, a close, a save), not places, and a title
 * pill would offer a journey they don't have.
 *
 * It imports headers only. Nothing here reaches a screen, which is what keeps
 * the shell's bundle to the shell.
 */
export function ScreenHeader({ screen, onNavigate }: { screen: ScreenId; onNavigate: Navigate }) {
  const { t } = useTranslation();
  if (screen === 'assistant') return <AssistantHeader onNavigate={onNavigate}/>;
  if (screen === 'emergency') return <EmergencyHeader onNavigate={onNavigate}/>;
  if (screen === 'composer') return <ComposerHeader onNavigate={onNavigate}/>;
  const titleKey = SCREEN_TITLES[screen];
  return <AppHeader title={titleKey && t(titleKey)} onNavigate={onNavigate} actions={<HeaderActions screen={screen}/>}/>;
}

/**
 * The few screens that put something of their own next to the header's
 * standing actions. Each is its own component so that its hooks run only on
 * the screen it belongs to — `useTimelineFilter` has a provider to find only
 * while the timeline is on.
 */
function HeaderActions({ screen }: { screen: ScreenId }) {
  if (screen === 'timeline') return <TimelineFilterAction/>;
  if (screen === 'favorites') return <NotificationsAction/>;
  return null;
}

function TimelineFilterAction() {
  const { openFilter } = useTimelineFilter();
  const { t } = useTranslation();
  return <Pressable accessibilityRole="button" onPress={openFilter} className="px-2 py-3"><Label className="text-[12px] text-info-text">{t('header.filter')}</Label></Pressable>;
}

function NotificationsAction() {
  const { setSheet } = useHomeActions();
  const { t } = useTranslation();
  return <IconButton size={19} icon="bell" label={t('settings.notifications')} onPress={() => setSheet({ kind: 'message', title: t('settings.notifications'), description: t('header.noNotifications') })}/>;
}

/**
 * The state a screen shares with its header, mounted around both.
 *
 * ALWAYS both providers, never a branch. This wrapper sits above the routed
 * `<Stack/>` and therefore above the tabs navigator and its five live pages —
 * so swapping the element type here (a fragment on one screen, a provider on
 * the next) unmounts and rebuilds that entire subtree, losing every tab's
 * scroll position and state on each trip to the composer. That is exactly the
 * cost the pager exists to remove.
 *
 * `active` is what keeps the old behaviour that mattered: each provider
 * clears itself on the render where its screen becomes current, so a draft or
 * a filter still starts fresh every time you arrive. A `key` would do the same
 * to the provider AND to everything under it, which is the very thing this
 * avoids.
 */
export function ScreenChrome({ screen, onNavigate, children }: { screen: ScreenId; onNavigate: Navigate; children: React.ReactNode }) {
  return (
    <ComposerProvider active={screen === 'composer'} onNavigate={onNavigate}>
      <TimelineFilterProvider active={screen === 'timeline'}>{children}</TimelineFilterProvider>
    </ComposerProvider>
  );
}
