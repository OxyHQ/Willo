import type { ScreenId } from '../data/screens';
import type { IconName } from '@willo/ui';
export type NavigationItem = { screen: ScreenId; title: string; icon: IconName };
export const modernTabs: NavigationItem[] = [
  { screen: 'home', title: 'Home', icon: 'home' },
  { screen: 'household', title: 'Household', icon: 'person' },
  { screen: 'activity', title: 'Activity', icon: 'activity' },
  { screen: 'automations', title: 'Automations', icon: 'automations' },
];
export const classicTabs: NavigationItem[] = [
  { screen: 'favorites', title: 'Favorites', icon: 'heart' },
  { screen: 'devices', title: 'Devices', icon: 'devices' },
  { screen: 'routines', title: 'Automations', icon: 'sparkle' },
  { screen: 'timeline', title: 'Activity', icon: 'history' },
  { screen: 'settings', title: 'Settings', icon: 'settings' },
];
export function isNavigationActive(screen: ScreenId, target: ScreenId) {
  return screen === target || (target === 'favorites' && screen === 'favorites-assistant')
    || (target === 'home' && (screen === 'assistant' || screen === 'emergency'))
    || (target === 'automations' && screen === 'composer');
}
