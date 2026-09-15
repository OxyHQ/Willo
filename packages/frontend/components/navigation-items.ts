import type { ScreenId } from '../data/screens';
import type { IconName } from '@willo/ui';
import type { ParseKeys } from 'i18next';
/** `titleKey` is a translation key, resolved with `t()` wherever the tab is rendered. */
export type NavigationItem = { screen: ScreenId; titleKey: ParseKeys; icon: IconName };
// One rail/bottom-bar for the whole app — Devices and Settings used to be
// reachable only from a separate "classic" tab set, unlinked from this one
// (Settings only sneaked in via the account menu); there is no real reason
// for a Home to be controlled through two parallel navigation systems.
export const tabs: NavigationItem[] = [
  { screen: 'home', titleKey: 'nav.home', icon: 'home' },
  { screen: 'devices', titleKey: 'nav.devices', icon: 'devices' },
  { screen: 'activity', titleKey: 'nav.activity', icon: 'activity' },
  { screen: 'automations', titleKey: 'nav.automations', icon: 'automations' },
  { screen: 'settings', titleKey: 'nav.settings', icon: 'settings' },
];
// `favorites`/`favorites-assistant`/`timeline`/`routines` are no longer
// their own rail destinations (see `tabs` above) but their screens/routes
// still exist — visiting one directly highlights the tab it's closest to
// instead of leaving the rail looking like nothing is selected.
export function isNavigationActive(screen: ScreenId, target: ScreenId) {
  return screen === target
    || (target === 'home' && (screen === 'assistant' || screen === 'emergency' || screen === 'favorites' || screen === 'favorites-assistant'))
    || (target === 'automations' && (screen === 'composer' || screen === 'routines'))
    || (target === 'activity' && screen === 'timeline');
}
