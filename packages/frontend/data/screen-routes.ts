import type { ScreenId } from './screens';

/** Home is the existing authenticated index route, never an unguarded /home. */
export const SCREEN_ROUTES = {
  home: '/',
  activity: '/activity',
  automations: '/automations',
  assistant: '/assistant',
  composer: '/composer',
  emergency: '/emergency',
  favorites: '/favorites',
  devices: '/devices',
  routines: '/routines',
  timeline: '/timeline',
  settings: '/settings',
  'favorites-assistant': '/favorites-assistant',
} as const satisfies Record<ScreenId, string>;
