import React from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
export type IconName = 'home' | 'heart' | 'grid' | 'camera' | 'light' | 'wifi' | 'lock' | 'unlock' | 'climate' | 'plus' | 'minus' | 'chevron' | 'down' | 'close' | 'play' | 'activity' | 'automations' | 'settings' | 'sun' | 'waves' | 'tv' | 'blinds' | 'vacuum' | 'plug' | 'microphone' | 'broadcast' | 'calendar' | 'sparkle' | 'kettle' | 'speaker' | 'shield' | 'link' | 'person' | 'video' | 'bell' | 'send' | 'thumb-up' | 'thumb-down' | 'volume-off' | 'camera-off' | 'alert' | 'back' | 'check' | 'filter' | 'globe' | 'info' | 'moon' | 'battery' | 'signal' | 'history' | 'devices' | 'thermometer' | 'fan' | 'garage' | 'alia-mini' | 'add-bold' | 'remove-bold' | 'air-conditioner' | 'heater' | 'purifier' | 'humidifier' | 'air-fryer' | 'oven' | 'dishwasher' | 'washer' | 'dryer' | 'coffee' | 'doorbell' | 'leak' | 'smoke' | 'door' | 'window' | 'energy';
/**
 * Icons whose own source art uses a DIFFERENT coordinate space than every
 * other icon here's shared `0 0 24 24` — `alia-mini` is a Google Material
 * Symbols glyph (`viewBox="0 -960 960 960"`, a solid filled path, not the
 * stroke line-art the rest of this set draws by hand). Rendered as a nested
 * `<Svg>` with ITS OWN viewBox rather than hand-converting the path's
 * coordinates into the 24-unit grid: an SVG viewBox already does that exact
 * scale/offset math correctly by definition, so this can't get the
 * transform wrong the way a manually computed `matrix(...)` could.
 */
const NESTED_VIEWBOX_ICONS: Partial<Record<IconName, { viewBox: string; path: string }>> = {
  'alia-mini': {
    viewBox: '0 -960 960 960',
    path: 'M360-200q-116 0-198-82T80-480q0-38 18.5-86t64.5-91.5q46-43.5 123-73T480-760q117 0 194 29.5t123 73q46 43.5 64.5 91.5t18.5 86q0 116-82 198t-198 82H360Zm6-80h228q63 0 114.5-33.5T784-400H176q24 53 75.5 86.5T366-280Zm114-120Zm0-40Zm-320-40h640q0-30-16-65t-53.5-65q-37.5-30-99-50T480-680q-90 0-151 20t-98.5 50q-37.5 30-54 65T160-480Zm320 0Z',
  },
  // Material Symbols `add_2` / `remove` at weight 700 — the thermostat's
  // +/- steppers, heavier than the hand-drawn `plus`/`minus` line icons.
  'add-bold': {
    viewBox: '0 -960 960 960',
    path: 'M412-74v-338H74v-136h338v-338h136v338h338v136H548v338H412Z',
  },
  'remove-bold': {
    viewBox: '0 -960 960 960',
    path: 'M154-412v-136h652v136H154Z',
  },
};
/**
 * Every glyph, at module scope rather than rebuilt inside `Icon`: the table
 * holds ~260 JSX elements and only one of them is ever used, so building it
 * per render allocated thousands of throwaway elements on a screen full of
 * tiles. The dozen glyphs that tint a dot or swap a stroke are functions of
 * the colour and fill they need; the rest are plain nodes, since the parent
 * `<Svg>` already carries `stroke`/`fill` for them.
 */
/** The glyphs whose art has a solid variant, so `filled` means something for them. */
const FILLABLE = new Set<IconName>(['heart', 'home', 'lock', 'light', 'play', 'sparkle']);
type Glyph = React.ReactNode | ((tint: { color: string; filled: boolean }) => React.ReactNode);
const SYMBOLS: Record<IconName, Glyph> = {
    fan: <><Circle cx="12" cy="12" r="2"/><Path d="M11 10C5 9 5 4 9 3c4-1 7 1 4 7M14 11c1-6 6-6 7-2 1 4-1 7-7 4M13 14c6 1 6 6 2 7-4 1-7-1-4-7M10 13c-1 6-6 6-7 2-1-4 1-7 7-4"/></>,
    garage: <><Path d="m2 9 10-6 10 6v12H2Z"/><Path d="M6 21V11h12v10M6 14h12M6 17h12"/></>,
    history: <><Path d="M3 11a9 9 0 1 1 2.6 7M3 5v6h6M12 7v5l4 2"/></>,
    devices: <><Path d="M14 17H2V4h17v4M1 21h13"/><Rect x="16" y="10" width="6" height="12" rx="1"/><Path d="M18 19h2"/></>,
    thermometer: ({ color }) => <><Path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><Path d="M12 7v10"/><Circle cx="12" cy="18" r="1.5" fill={color}/></>,
    home: ({ filled }) => filled ? <Path fillRule="evenodd" d="m3.8 10 8.2-7 8.2 7v10H3.8Z M9 20v-7h6v7Z"/> : <><Path d="m3.8 10 8.2-7 8.2 7v10H3.8Z"/><Path d="M9 20v-7h6v7"/></>,
    heart: <Path d="M20.8 4.9a5.6 5.6 0 0 0-8 .1l-.8.8-.8-.8a5.6 5.6 0 0 0-8 7.9L12 21l8.8-8.1a5.6 5.6 0 0 0 0-8Z"/>,
    grid: <><Rect x="3" y="3" width="7" height="7" rx="1"/><Rect x="14" y="3" width="7" height="7" rx="1"/><Rect x="3" y="14" width="7" height="7" rx="1"/><Rect x="14" y="14" width="7" height="7" rx="1"/></>,
    camera: <><Rect x="2.5" y="5.5" width="13" height="13" rx="2"/><Path d="m15.5 10 6-3.5v11l-6-3.5"/></>,
    light: <><Path d="M8 15c-.6-2-3-3-3-6a7 7 0 0 1 14 0c0 3-2.4 4-3 6Z"/><Path d="M8.5 18h7M10 21h4"/></>,
    wifi: ({ color }) => <><Path d="M2 8a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><Circle cx="12" cy="20" r="1" fill={color} stroke="none"/></>,
    lock: ({ color, filled }) => <><Rect x="5" y="10" width="14" height="12" rx="2"/><Path d="M8 10V6a4 4 0 0 1 8 0v4"/><Circle cx="12" cy="15" r="1" stroke={filled ? 'white' : color} fill={filled ? 'white' : color}/><Path d="M12 16v2" stroke={filled ? 'white' : color}/></>,
    unlock: <><Rect x="5" y="10" width="14" height="12" rx="2"/><Path d="M8 10V6a4 4 0 0 1 7.6-1.8"/><Circle cx="12" cy="15" r="1"/></>,
    climate: <><Path d="M6 3c-6 6 6 9 0 18M12 3c-6 6 6 9 0 18M18 3c-6 6 6 9 0 18"/></>,
    plus: <Path d="M12 4v16M4 12h16"/>, minus: <Path d="M5 12h14"/>,
    chevron: <Path d="m9 5 7 7-7 7"/>, down: <Path d="m6 9 6 6 6-6"/>, close: <Path d="m6 6 12 12M18 6 6 18"/>,
    play: <Path d="m9 5 11 7-11 7Z"/>,
    activity: <><Rect x="4" y="3" width="16" height="6" rx="1"/><Rect x="4" y="14" width="16" height="7" rx="1"/></>,
    automations: <><Path d="m8 4-4 4a3 3 0 0 0 4 4l4-4a3 3 0 0 0-4-4Zm8 8-4 4a3 3 0 0 0 4 4l4-4a3 3 0 0 0-4-4Z"/><Path d="m4 20 16-16"/></>,
    settings: <><Path d="m9 3-.8 2.3-2.3.6-2 .1-1.7 3 1.3 2-.1 2.4-1.1 1.8 1.7 3 2.4-.1 2.1 1.2.5 2.2h3.5l.7-2.2 2.2-1.2 2.2.1 1.8-3-1.1-2 .1-2.4 1-1.8-1.8-3-2.1.1-2.2-1.2L13 3Z"/><Circle cx="10.8" cy="12" r="3"/></>,
    sun: <><Circle cx="12" cy="12" r="4.3"/><Path d="M12 1v2M12 21v2M1 12h2M21 12h2M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5"/></>,
    waves: <Path d="M3 6c3-5 6 5 9 0s6 5 9 0M3 12c3-5 6 5 9 0s6 5 9 0M3 18c3-5 6 5 9 0s6 5 9 0"/>,
    tv: <><Rect x="2" y="4" width="20" height="14" rx="1.5"/><Path d="M7 21h10M12 18v3"/></>,
    blinds: <><Path d="M4 3h16M5 4v15M18 4v15M4 8h15M4 12h15M4 16h15M3 20h18M21 4v11"/><Circle cx="21" cy="17" r="1"/></>,
    vacuum: <><Circle cx="12" cy="14" r="7.5"/><Path d="M8 12h8M9 18h6M8 4l1.4-2h5.2L16 4"/><Circle cx="12" cy="9.5" r=".8"/></>,
    plug: <><Circle cx="12" cy="12" r="9"/><Path d="M9 8v5M15 8v5M9 15h6M12 15v4"/></>,
    microphone: <><Rect x="9" y="2" width="6" height="13" rx="3"/><Path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M9 22h6"/></>,
    broadcast: <><Circle cx="8" cy="7" r="3"/><Path d="M2 21v-3a6 6 0 0 1 12 0v3M16 6c3 2 3 5 0 7M19 3c5 4 5 10 0 14"/></>,
    calendar: <><Rect x="3" y="5" width="18" height="16" rx="1"/><Path d="M7 2v6M17 2v6M3 10h18M7 14h2M13 14h3M7 18h2M13 18h3"/></>,
    sparkle: <><Path d="m12 1 2.6 7.4L22 11l-7.4 2.6L12 21l-2.6-7.4L2 11l7.4-2.6Z"/><Path d="m20 17 .8 2.2L23 20l-2.2.8L20 23l-.8-2.2L17 20l2.2-.8Z"/></>,
    kettle: <><Path d="M5 3h10v16H5zM4 22h14M3 3h14M8 5v12M15 6h4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-4"/></>,
    speaker: <><Rect x="5" y="2" width="14" height="20" rx="1"/><Circle cx="12" cy="7" r="1.2"/><Circle cx="12" cy="15" r="3.5"/></>,
    shield: <><Path d="m12 2 8 3v6c0 5-5 9-8 11-3-2-8-6-8-11V5Z"/><Path d="M12 3v18"/></>,
    link: <><Path d="M10 7H7a5 5 0 0 0 0 10h3M14 7h3a5 5 0 0 1 0 10h-3M8 12h8"/></>,
    person: <><Circle cx="12" cy="7" r="3.5"/><Path d="M5 21v-3a7 7 0 0 1 14 0v3"/></>,
    video: <><Rect x="2" y="4" width="20" height="14" rx="1"/><Path d="m10 8 6 3-6 3zM10 22h4M12 18v4"/></>,
    bell: <><Path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4M12 2v2"/></>,
    send: <><Path d="m3 3 19 9-19 9 4-9zM7 12h15"/></>,
    'thumb-up': <><Path d="M9 21H4V10h5M9 10l5-8 2 1-1 7h5l1 2-3 9H9Z"/></>,
    'thumb-down': <><G rotation="180" origin="12,12"><Path d="M9 21H4V10h5M9 10l5-8 2 1-1 7h5l1 2-3 9H9Z"/></G></>,
    'volume-off': <><Path d="M11 4 6 9H2v6h4l5 5zM16 9l6 6M22 9l-6 6"/></>,
    'camera-off': <><Path d="M9 5h6v8M4 5H2v14h13v-1M15 10l6-3v12l-4-2M2 2l20 20"/></>,
    alert: ({ color }) => <><Path d="m12 2 10 10-10 10L2 12Z" fill={color} stroke="none"/><Path d="M12 7v6M12 16v.2" stroke="white" strokeWidth="2"/></>,
    back: <Path d="M20 12H4m6-7-7 7 7 7"/>, check: <Path d="m4 12 5 5L20 6"/>,
    filter: <><Path d="M3 5h18M6 12h12M10 19h4"/></>,
    globe: <><Circle cx="12" cy="12" r="9"/><Path d="M3 12h18M12 3a19 19 0 0 1 0 18 19 19 0 0 1 0-18Z"/></>,
    info: <><Circle cx="12" cy="12" r="9"/><Path d="M12 10v7M12 7v.2"/></>,
    moon: <Path d="M21 14a9 9 0 0 1-11-11A9 9 0 1 0 21 14Z"/>,
    battery: ({ color }) => <><Rect x="2" y="6" width="17" height="12" rx="1" fill={color}/><Path d="M21 10v4" strokeWidth="2.5"/></>,
    signal: <><Path d="M4 18v-2M9 18v-6M14 18V8M19 18V4" strokeWidth="3"/></>,
    'air-conditioner': <><Rect x="2" y="5" width="20" height="8" rx="2"/><Path d="M5 9h14M7 17c1.5 0 1.5-2 3-2M14 17c1.5 0 1.5-2 3-2M7 21c1.5 0 1.5-2 3-2M14 21c1.5 0 1.5-2 3-2"/></>,
    heater: <><Rect x="3" y="4" width="18" height="16" rx="2"/><Path d="M8 4v16M12 4v16M16 4v16M3 8h18M3 16h18"/></>,
    purifier: <><Rect x="5" y="3" width="14" height="18" rx="3"/><Circle cx="12" cy="13" r="3.5"/><Path d="M9 7h6"/></>,
    humidifier: <><Rect x="6" y="10" width="12" height="11" rx="3"/><Path d="M12 3c2 2.5 3 4 3 5.2A3 3 0 0 1 9 8.2C9 7 10 5.5 12 3Z"/></>,
    'air-fryer': ({ color }) => <><Rect x="4" y="3" width="16" height="18" rx="3"/><Path d="M4 14h16M8 7h5"/><Circle cx="16.5" cy="7" r="1.2" fill={color}/></>,
    oven: ({ color }) => <><Rect x="3" y="3" width="18" height="18" rx="2"/><Path d="M3 9h18"/><Rect x="6" y="12" width="12" height="6" rx="1"/><Circle cx="7" cy="6" r="1" fill={color}/><Circle cx="11" cy="6" r="1" fill={color}/></>,
    dishwasher: ({ color }) => <><Rect x="3" y="3" width="18" height="18" rx="2"/><Path d="M3 8h18"/><Circle cx="12" cy="14.5" r="4"/><Circle cx="7" cy="5.5" r="0.9" fill={color}/></>,
    washer: ({ color }) => <><Rect x="3" y="3" width="18" height="18" rx="2"/><Circle cx="12" cy="14" r="5"/><Circle cx="12" cy="14" r="2"/><Circle cx="7" cy="6" r="0.9" fill={color}/></>,
    dryer: <><Rect x="3" y="3" width="18" height="18" rx="2"/><Circle cx="12" cy="14" r="5"/><Path d="M10 14c1-1.5 3 1.5 4 0M7 6h3"/></>,
    coffee: <><Path d="M4 10h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-5ZM17 11h2a2 2 0 0 1 0 5h-2M8 3v3M12 3v3"/></>,
    doorbell: <><Rect x="6" y="2" width="12" height="20" rx="4"/><Circle cx="12" cy="8" r="2"/><Path d="M9 14h6M9 17h6"/></>,
    leak: <><Path d="M12 3c3.5 4.2 5 6.6 5 8.8A5 5 0 0 1 7 11.8C7 9.6 8.5 7.2 12 3Z"/><Path d="M3 21h18"/></>,
    smoke: ({ color }) => <><Circle cx="12" cy="9" r="5"/><Circle cx="12" cy="9" r="1.4" fill={color}/><Path d="M5 17c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5M5 21c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5"/></>,
    door: ({ color }) => <><Path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18"/><Circle cx="15.5" cy="12" r="1.2" fill={color}/></>,
    window: <><Rect x="3" y="3" width="18" height="18" rx="1"/><Path d="M12 3v18M3 12h18"/></>,
    energy: <><Path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></>,
    // Never actually read — `alia-mini` returns via the `NESTED_VIEWBOX_ICONS`
    // branch below before this map is indexed. Present only so this object
    // stays a real `Record<IconName, ...>`, checked exhaustively by TS
    // against every icon name that exists.
    'alia-mini': null,
    'add-bold': null,
    'remove-bold': null,
};

type Props = { name: IconName; size?: number; color?: string; filled?: boolean; strokeWidth?: number };
/** Small SVG glyphs, shared across native and web; no platform-specific icon font. */
export function Icon({ name, size = 22, color = '#202124', filled = false, strokeWidth = 1.75 }: Props) {
  const glyph = SYMBOLS[name];
  const fillable = FILLABLE.has(name);
  // `accessibilityElementsHidden` is an iOS-only RN prop; react-native-svg's
  // web build forwards props straight to the DOM rather than translating
  // them, so passing it on web reaches a real <svg> element and React warns.
  // Web's own equivalent is `aria-hidden`.
  const hiddenFromAccessibilityTree = Platform.OS === 'web' ? { 'aria-hidden': true } : { accessibilityElementsHidden: true };
  const nested = NESTED_VIEWBOX_ICONS[name];
  if (nested) {
    // A solid Material Symbols glyph, always filled — there's no stroke
    // variant of this art the way the hand-drawn icons above have one.
    return <Svg width={size} height={size} viewBox={nested.viewBox} {...hiddenFromAccessibilityTree}><Path d={nested.path} fill={color}/></Svg>;
  }
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled && fillable ? color : 'none'} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...hiddenFromAccessibilityTree}>{typeof glyph === 'function' ? glyph({ color, filled }) : glyph}</Svg>;
}
