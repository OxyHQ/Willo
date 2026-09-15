import { type ReactNode } from 'react';
export const SCREENS = [
  { id: 'onboarding', title: 'Set up your home', subtitle: 'Create or pair your Willo Home', generation: 'modern', number: '00' },
  { id: 'home', title: 'Home', subtitle: 'Favorites, camera & climate', generation: 'modern', number: '01' },
  { id: 'activity', title: 'Activity', subtitle: 'Home brief & event filters', generation: 'modern', number: '02' },
  { id: 'automations', title: 'Automations', subtitle: 'Upcoming & your routines', generation: 'modern', number: '03' },
  { id: 'assistant', title: 'Ask your home', subtitle: 'Conversation & camera events', generation: 'modern', number: '04' },
  { id: 'composer', title: 'Create automation', subtitle: 'Natural-language editor', generation: 'modern', number: '05' },
  { id: 'emergency', title: 'Smoke detected', subtitle: 'Alert & room status', generation: 'modern', number: '06' },
  { id: 'favorites', title: 'Favorites', subtitle: 'Categories & quick controls', generation: 'classic', number: '07' },
  { id: 'devices', title: 'Devices', subtitle: 'Devices grouped by room', generation: 'classic', number: '08' },
  { id: 'routines', title: 'Automations', subtitle: 'Household & personal routines', generation: 'classic', number: '09' },
  { id: 'timeline', title: 'Activity', subtitle: 'Camera event timeline', generation: 'classic', number: '10' },
  { id: 'settings', title: 'Settings', subtitle: 'Home, rooms & services', generation: 'classic', number: '11' },
  { id: 'favorites-assistant', title: 'Favorites + assistant', subtitle: 'Broadcast & assistant shortcuts', generation: 'classic', number: '12' },
] as const;
export type ScreenId = typeof SCREENS[number]['id'];
export type Navigate = (screen: ScreenId | 'gallery') => void;
// `header` is only set below ContentPanel's framed breakpoint, when
// ScreenSurface asks a screen to render its own header inline (one shared
// scroll) instead of the screen surface rendering it as a separate sibling
// above the panel.
export type ScreenProps = { onNavigate: Navigate; header?: ReactNode };
export const isScreenId = (value: unknown): value is ScreenId => SCREENS.some(screen => screen.id === value);
export const modernScreens: ScreenId[] = ['home', 'activity', 'automations', 'assistant', 'composer', 'emergency', 'onboarding'];
export const noTabScreens: ScreenId[] = ['assistant', 'composer', 'emergency', 'onboarding'];
