import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { HouseholdSection } from './model';

/** Consistent household-specific line glyphs; no new font dependency. */
export function HouseholdGlyph({ name, size = 24, color = '#202124' }: { name: HouseholdSection; size?: number; color?: string }) {
  const symbols: Record<HouseholdSection, React.ReactNode> = {
    tasks: <><Rect x="4" y="4" width="16" height="18" rx="3"/><Path d="M9 2h6v4H9zm-2 9 2 2 3-4m2 3h3m-10 5 2 2 3-4m2 3h3"/></>,
    shopping: <><Path d="m3 9 2 12h14l2-12Zm4 0 5-7 5 7M9 12v6m6-6v6"/></>,
    calendar: <><Rect x="3" y="5" width="18" height="16" rx="3"/><Path d="M7 2v6m10-6v6M3 10h18m-14 4h2m4 0h2m-8 4h2"/></>,
    notes: <><Path d="M14 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-8M8 11h5m-5 5h8m0-11 3-3 3 3-8 8-4 1 1-4Z"/></>,
    packages: <><Path d="m3 7 9-5 9 5v11l-9 5-9-5Zm0 0 9 5 9-5M12 12v11M7 4.8l10 5.5v5"/></>,
    maintenance: <><Path d="M15 3a5 5 0 0 0-5 7l-7 7a2.8 2.8 0 0 0 4 4l7-7a5 5 0 0 0 7-5l-4 3-4-4 3-5Z"/></>,
    expenses: <><Path d="M5 2h14v20l-3-2-4 2-4-2-3 2Z"/><Path d="M8 7h8m-8 4h5m-5 5h8"/><Circle cx="16" cy="11" r=".5"/></>,
    meals: <><Path d="M4 2v6a3 3 0 0 0 6 0V2M7 2v20M17 2c-3 3-3 8 0 9h3M20 2v20"/></>,
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden>{symbols[name]}</Svg>;
}
