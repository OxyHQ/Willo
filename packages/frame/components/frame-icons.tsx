import type { ComponentType } from 'react';
import { View } from 'react-native';
import { RiCloudyLine } from '@oxy.so/bloom/icons/RiCloudyLine';
import { RiDoorOpenLine } from '@oxy.so/bloom/icons/RiDoorOpenLine';
import { RiDrizzleLine } from '@oxy.so/bloom/icons/RiDrizzleLine';
import { RiDropLine } from '@oxy.so/bloom/icons/RiDropLine';
import { RiFoggyLine } from '@oxy.so/bloom/icons/RiFoggyLine';
import { RiHailLine } from '@oxy.so/bloom/icons/RiHailLine';
import { RiHeavyShowersLine } from '@oxy.so/bloom/icons/RiHeavyShowersLine';
import { RiHome4Line } from '@oxy.so/bloom/icons/RiHome4Line';
import { RiLeafLine } from '@oxy.so/bloom/icons/RiLeafLine';
import { RiMoonClearLine } from '@oxy.so/bloom/icons/RiMoonClearLine';
import { RiMoonCloudyLine } from '@oxy.so/bloom/icons/RiMoonCloudyLine';
import { RiMusic2Line } from '@oxy.so/bloom/icons/RiMusic2Line';
import { RiNewspaperLine } from '@oxy.so/bloom/icons/RiNewspaperLine';
import { RiRainyLine } from '@oxy.so/bloom/icons/RiRainyLine';
import { RiSnowyLine } from '@oxy.so/bloom/icons/RiSnowyLine';
import { RiSunCloudyLine } from '@oxy.so/bloom/icons/RiSunCloudyLine';
import { RiSunLine } from '@oxy.so/bloom/icons/RiSunLine';
import { RiTempColdLine } from '@oxy.so/bloom/icons/RiTempColdLine';
import { RiTempHotLine } from '@oxy.so/bloom/icons/RiTempHotLine';
import { RiThunderstormsLine } from '@oxy.so/bloom/icons/RiThunderstormsLine';
import { RiWifiOffLine } from '@oxy.so/bloom/icons/RiWifiOffLine';
import { RiWindowLine } from '@oxy.so/bloom/icons/RiWindowLine';
import { RiWindyLine } from '@oxy.so/bloom/icons/RiWindyLine';
import type { FrameStatusIcon } from '@willo.sh/shared-types';

// The pixel size goes through `width` (Bloom's `size` takes only its own
// rungs); with no `fill` a glyph paints in the theme's primary.
type Glyph = ComponentType<{ width?: number; fill?: string }>;

/** Home Assistant's weather conditions, by day and by night where they differ. */
const WEATHER_GLYPHS: Record<string, { day: Glyph; night: Glyph }> = {
  sunny: { day: RiSunLine, night: RiMoonClearLine },
  'clear-night': { day: RiMoonClearLine, night: RiMoonClearLine },
  partlycloudy: { day: RiSunCloudyLine, night: RiMoonCloudyLine },
  cloudy: { day: RiCloudyLine, night: RiCloudyLine },
  rainy: { day: RiRainyLine, night: RiRainyLine },
  pouring: { day: RiHeavyShowersLine, night: RiHeavyShowersLine },
  lightning: { day: RiThunderstormsLine, night: RiThunderstormsLine },
  'lightning-rainy': { day: RiThunderstormsLine, night: RiThunderstormsLine },
  snowy: { day: RiSnowyLine, night: RiSnowyLine },
  'snowy-rainy': { day: RiDrizzleLine, night: RiDrizzleLine },
  hail: { day: RiHailLine, night: RiHailLine },
  fog: { day: RiFoggyLine, night: RiFoggyLine },
  windy: { day: RiWindyLine, night: RiWindyLine },
  'windy-variant': { day: RiWindyLine, night: RiWindyLine },
};

const STATUS_GLYPHS: Record<Exclude<FrameStatusIcon, 'co2'>, Glyph> = {
  indoorTemperature: RiTempHotLine,
  outdoorTemperature: RiTempColdLine,
  humidity: RiDropLine,
};

const OTHER_GLYPHS = {
  home: RiHome4Line,
  air: RiLeafLine,
  music: RiMusic2Line,
  news: RiNewspaperLine,
  offline: RiWifiOffLine,
  door: RiDoorOpenLine,
  window: RiWindowLine,
} satisfies Record<string, Glyph>;

export type OtherIconName = keyof typeof OTHER_GLYPHS;

/**
 * One glyph, in its own layer: inside a Bloom `Card`, a bare SVG was painted
 * under the card's material.
 */
function Drawn({ glyph: Glyph, size, color }: { glyph: Glyph; size: number; color?: string }) {
  return (
    <View>
      <Glyph width={size} fill={color} />
    </View>
  );
}

export function WeatherIcon({
  condition,
  isNight,
  size,
  color,
}: {
  condition: string;
  isNight: boolean;
  size: number;
  color?: string;
}) {
  const glyphs = WEATHER_GLYPHS[condition];
  const glyph = glyphs ? (isNight ? glyphs.night : glyphs.day) : RiSunCloudyLine;
  return <Drawn glyph={glyph} size={size} color={color} />;
}

export function StatusIcon({
  icon,
  size,
  color,
}: {
  icon: Exclude<FrameStatusIcon, 'co2'>;
  size: number;
  color?: string;
}) {
  return <Drawn glyph={STATUS_GLYPHS[icon]} size={size} color={color} />;
}

export function FrameIcon({
  name,
  size,
  color,
}: {
  name: OtherIconName;
  size: number;
  color?: string;
}) {
  return <Drawn glyph={OTHER_GLYPHS[name]} size={size} color={color} />;
}
