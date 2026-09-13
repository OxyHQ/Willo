import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export type Tone = 'neutral' | 'blue' | 'sky' | 'yellow' | 'peach' | 'green';
export type ScreenId =
  | 'home' | 'favorites' | 'devices' | 'activity' | 'activity-classic'
  | 'automations' | 'routines' | 'settings' | 'ask' | 'emergency' | 'create-automation';
export type Navigate = (screen: ScreenId, replace?: boolean) => void;
export interface ScreenProps { onNavigate: Navigate; }
export interface Device {
  id: string;
  name: string;
  status: string;
  inactiveStatus: string;
  icon: IconName;
  tone: Tone;
  isActive: boolean;
  brightness?: number;
}
export interface Routine {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
}

// Complete class names keep NativeWind's static extraction deterministic.
export const TONES = {
  neutral: { background: 'bg-willo-surface', text: 'text-willo-ink', fill: 'bg-willo-muted', icon: '#444746' },
  blue: { background: 'bg-willo-blue', text: 'text-willo-on-blue', fill: 'bg-willo-blue-strong', icon: '#0046ae' },
  sky: { background: 'bg-willo-sky', text: 'text-willo-on-sky', fill: 'bg-willo-sky', icon: '#005478' },
  yellow: { background: 'bg-willo-yellow', text: 'text-willo-on-yellow', fill: 'bg-willo-yellow-strong', icon: '#5c4800' },
  peach: { background: 'bg-willo-peach', text: 'text-willo-on-peach', fill: 'bg-willo-peach-strong', icon: '#8b3000' },
  green: { background: 'bg-willo-green', text: 'text-willo-on-green', fill: 'bg-willo-green', icon: '#176b35' },
} satisfies Record<Tone, { background: string; text: string; fill: string; icon: string }>;
