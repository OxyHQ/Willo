/**
 * What a frame shows over its photo, worked out from the Home's devices, the
 * frame's room and its settings. Pure: no clock, no network, no rendering —
 * the screen passes everything in and renders what comes back, in its own
 * language (this returns facts, never text).
 *
 * The rules are the ones the studio frame ran on (a Home Assistant template):
 * an open door drops a panel from the top; stuffy air is an alert card; what
 * is playing, the gallery, the news and the weather fill the row along the
 * bottom, music first.
 */

import {
  getCapability,
  type Device,
  type FrameCard,
  type FrameSettings,
  type FrameStatusIcon,
} from '@willo.sh/shared-types';

/** CO₂ above this, in ppm, is stuffy air: an alert card and an alert-coloured reading. */
export const CO2_ALERT_PPM = 1000;

/** Home Assistant binary-sensor classes that are an opening someone can leave open. */
const OPENING_CLASSES = new Set(['door', 'opening', 'window', 'garage_door']);

/** The order of the row along the bottom; music always leads. */
const ROW_ORDER: readonly FrameCard[] = ['music', 'gallery', 'news', 'weather', 'co2'];

/** Something open in the frame's room: the panel that drops from the top. */
export interface OpeningAlert {
  kind: 'opening';
  deviceId: string;
  /** The device's name, as the Home names it ("Balcony door"). */
  name: string;
  deviceClass: string;
}

export interface MusicCard {
  kind: 'music';
  deviceId: string;
  title: string;
  artist: string | null;
  artworkKey: string | null;
}

export interface Co2Card {
  kind: 'co2';
  /** Rounded to the nearest 25: a reading that jitters by 3 ppm should not redraw the card. */
  ppm: number;
}

export interface WeatherCard {
  kind: 'weather';
  condition: string;
  isNight: boolean;
  /** Whole degrees in `unit`. */
  temperature: number;
  unit: string | null;
}

/** A news article the screen picked (it rotates them); the row shows it as is. */
export interface NewsCard {
  kind: 'news';
  id: string;
  title: string;
  publisher: string | null;
  imageUrl: string | null;
  imageSeeds: string[];
}

/** A gallery photo the screen picked (it rotates them); the row shows it as is. */
export interface GalleryCard {
  kind: 'gallery';
  url: string;
  width: number;
  height: number;
}

export type RowCard = MusicCard | Co2Card | WeatherCard | NewsCard | GalleryCard;

export interface StatusReading {
  icon: FrameStatusIcon;
  value: number;
  unit: string | null;
  isAlert: boolean;
}

export interface FrameContent {
  /** Open things in the room, the panel rotates between them; empty for none. */
  alerts: OpeningAlert[];
  row: RowCard[];
  /** The small readings beside the clock, in a fixed order. */
  status: StatusReading[];
}

export interface FrameInputs {
  devices: Device[];
  /** The frame's room: its door, air and indoor readings come from devices here. */
  room: string | null;
  settings: FrameSettings;
  /** The article showing now, when the screen has one. */
  news: Omit<NewsCard, 'kind'> | null;
  /** The gallery photo showing now, when the screen has one. */
  gallery: Omit<GalleryCard, 'kind'> | null;
}

const inRoom = (device: Device, room: string | null) => room !== null && device.room === room;

/** The first measurement of `deviceClass` among `devices` with a value. */
function measurement(devices: Device[], deviceClass: string) {
  for (const device of devices) {
    const reading = getCapability(device, 'measurement');
    if (reading?.deviceClass === deviceClass && reading.value !== null) return reading;
  }
  return undefined;
}

/** The weather, from the first weather device that reports a condition and a temperature. */
function weather(devices: Device[]) {
  for (const device of devices) {
    const report = getCapability(device, 'weather');
    if (report?.condition && report.temperature !== null) return report;
  }
  return undefined;
}

export function frameContent({
  devices,
  room,
  settings,
  news,
  gallery,
}: FrameInputs): FrameContent {
  const roomDevices = devices.filter((device) => inRoom(device, room));
  const isCardOn = (card: FrameCard) => settings.showCards && settings.cards[card];

  const alerts: OpeningAlert[] = isCardOn('door')
    ? roomDevices.flatMap((device) => {
        const sensor = getCapability(device, 'binarySensor');
        return sensor?.active && sensor.deviceClass && OPENING_CLASSES.has(sensor.deviceClass)
          ? [
              {
                kind: 'opening' as const,
                deviceId: device.id,
                name: device.name,
                deviceClass: sensor.deviceClass,
              },
            ]
          : [];
      })
    : [];

  const row: RowCard[] = [];

  if (isCardOn('music')) {
    for (const device of roomDevices) {
      const media = getCapability(device, 'media');
      if (media?.playing && media.title) {
        row.push({
          kind: 'music',
          deviceId: device.id,
          title: media.title,
          artist: media.artist ?? null,
          artworkKey: media.artworkKey ?? null,
        });
        break;
      }
    }
  }

  const co2 = measurement(roomDevices, 'carbon_dioxide');
  if (isCardOn('co2') && co2?.value != null && co2.value > CO2_ALERT_PPM) {
    row.push({ kind: 'co2', ppm: Math.round(co2.value / 25) * 25 });
  }

  const report = weather(devices);
  if (isCardOn('weather') && report?.condition && report.temperature !== null) {
    row.push({
      kind: 'weather',
      condition: report.condition,
      isNight: report.isNight,
      temperature: Math.round(report.temperature),
      unit: report.temperatureUnit,
    });
  }

  if (isCardOn('news') && news) row.push({ kind: 'news', ...news });
  if (isCardOn('gallery') && gallery) row.push({ kind: 'gallery', ...gallery });

  row.sort((a, b) => ROW_ORDER.indexOf(a.kind) - ROW_ORDER.indexOf(b.kind));

  const status: StatusReading[] = [];
  const indoor = measurement(roomDevices, 'temperature');
  if (settings.statusIcons.indoorTemperature && indoor?.value != null) {
    status.push({
      icon: 'indoorTemperature',
      value: Math.round(indoor.value),
      unit: indoor.unit,
      isAlert: false,
    });
  }
  if (settings.statusIcons.outdoorTemperature && report?.temperature != null) {
    status.push({
      icon: 'outdoorTemperature',
      value: Math.round(report.temperature),
      unit: report.temperatureUnit,
      isAlert: false,
    });
  }
  const humidity = measurement(roomDevices, 'humidity');
  if (settings.statusIcons.humidity && humidity?.value != null) {
    status.push({
      icon: 'humidity',
      value: Math.round(humidity.value),
      unit: humidity.unit,
      isAlert: false,
    });
  }
  if (settings.statusIcons.co2 && co2?.value != null) {
    status.push({
      icon: 'co2',
      value: Math.round(co2.value),
      unit: co2.unit,
      isAlert: co2.value > CO2_ALERT_PPM,
    });
  }

  return { alerts, row, status };
}
