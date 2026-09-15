import type { ScreenId } from './screens';

/** Home is the existing authenticated index route, never an unguarded /home. */
export const SCREEN_ROUTES = {
  onboarding: '/onboarding',
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

const PATHNAME_SCREENS: Record<string, ScreenId> = Object.fromEntries(
  Object.entries(SCREEN_ROUTES).map(([screen, path]) => [path, screen as ScreenId]),
);

/**
 * The persistent app shell (`app/_layout.tsx`) renders the nav rail and
 * bottom nav ONCE, outside the routed `<Slot/>`/`<Stack/>` — unlike the
 * per-route content, which naturally remounts on navigation — so it needs the
 * current `ScreenId` from the URL itself rather than a prop threaded down
 * from a specific route file. Falls back to `'home'` for any pathname this
 * app doesn't otherwise recognise (there is no dedicated 404 screen).
 */
export function screenForPathname(pathname: string): ScreenId {
  return PATHNAME_SCREENS[pathname] ?? 'home';
}
