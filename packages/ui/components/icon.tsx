import React from 'react';
import Svg, { Circle, G, Line, Path, Polyline, Rect } from 'react-native-svg';
export type IconName = 'home' | 'heart' | 'grid' | 'camera' | 'light' | 'wifi' | 'lock' | 'unlock' | 'climate' | 'plus' | 'minus' | 'chevron' | 'down' | 'close' | 'play' | 'activity' | 'automations' | 'settings' | 'sun' | 'waves' | 'tv' | 'blinds' | 'vacuum' | 'plug' | 'microphone' | 'broadcast' | 'calendar' | 'sparkle' | 'kettle' | 'speaker' | 'shield' | 'link' | 'person' | 'video' | 'bell' | 'send' | 'thumb-up' | 'thumb-down' | 'volume-off' | 'camera-off' | 'alert' | 'back' | 'check' | 'filter' | 'globe' | 'info' | 'moon' | 'battery' | 'signal' | 'history' | 'devices' | 'thermometer';
type Props = { name: IconName; size?: number; color?: string; filled?: boolean; strokeWidth?: number };
/** Small SVG glyphs, shared across native and web; no platform-specific icon font. */
export function Icon({ name, size = 22, color = '#202124', filled = false, strokeWidth = 1.75 }: Props) {
  const symbols: Record<IconName, React.ReactNode> = {
    history: <><Path d="M3 11a9 9 0 1 1 2.6 7M3 5v6h6M12 7v5l4 2"/></>,
    devices: <><Path d="M14 17H2V4h17v4M1 21h13"/><Rect x="16" y="10" width="6" height="12" rx="1"/><Path d="M18 19h2"/></>,
    thermometer: <><Path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><Path d="M12 7v10"/><Circle cx="12" cy="18" r="1.5" fill={color}/></>,
    home: filled ? <Path fillRule="evenodd" d="m3.8 10 8.2-7 8.2 7v10H3.8Z M9 20v-7h6v7Z"/> : <><Path d="m3.8 10 8.2-7 8.2 7v10H3.8Z"/><Path d="M9 20v-7h6v7"/></>,
    heart: <Path d="M20.8 4.9a5.6 5.6 0 0 0-8 .1l-.8.8-.8-.8a5.6 5.6 0 0 0-8 7.9L12 21l8.8-8.1a5.6 5.6 0 0 0 0-8Z"/>,
    grid: <><Rect x="3" y="3" width="7" height="7" rx="1"/><Rect x="14" y="3" width="7" height="7" rx="1"/><Rect x="3" y="14" width="7" height="7" rx="1"/><Rect x="14" y="14" width="7" height="7" rx="1"/></>,
    camera: <><Rect x="2.5" y="5.5" width="13" height="13" rx="2"/><Path d="m15.5 10 6-3.5v11l-6-3.5"/></>,
    light: <><Path d="M8 15c-.6-2-3-3-3-6a7 7 0 0 1 14 0c0 3-2.4 4-3 6Z"/><Path d="M8.5 18h7M10 21h4"/></>,
    wifi: <><Path d="M2 8a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><Circle cx="12" cy="20" r="1" fill={color} stroke="none"/></>,
    lock: <><Rect x="5" y="10" width="14" height="12" rx="2"/><Path d="M8 10V6a4 4 0 0 1 8 0v4"/><Circle cx="12" cy="15" r="1" stroke={filled ? 'white' : color} fill={filled ? 'white' : color}/><Path d="M12 16v2" stroke={filled ? 'white' : color}/></>,
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
    alert: <><Path d="m12 2 10 10-10 10L2 12Z" fill={color} stroke="none"/><Path d="M12 7v6M12 16v.2" stroke="white" strokeWidth="2"/></>,
    back: <Path d="M20 12H4m6-7-7 7 7 7"/>, check: <Path d="m4 12 5 5L20 6"/>,
    filter: <><Path d="M3 5h18M6 12h12M10 19h4"/></>,
    globe: <><Circle cx="12" cy="12" r="9"/><Path d="M3 12h18M12 3a19 19 0 0 1 0 18 19 19 0 0 1 0-18Z"/></>,
    info: <><Circle cx="12" cy="12" r="9"/><Path d="M12 10v7M12 7v.2"/></>,
    moon: <Path d="M21 14a9 9 0 0 1-11-11A9 9 0 1 0 21 14Z"/>,
    battery: <><Rect x="2" y="6" width="17" height="12" rx="1" fill={color}/><Path d="M21 10v4" strokeWidth="2.5"/></>,
    signal: <><Path d="M4 18v-2M9 18v-6M14 18V8M19 18V4" strokeWidth="3"/></>,
  };
  const fillable = ['heart', 'home', 'lock', 'light', 'play', 'sparkle'].includes(name);
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled && fillable ? color : 'none'} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden>{symbols[name]}</Svg>;
}
