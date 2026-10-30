import type { Device, FrameSettings } from '@willo.sh/shared-types';
import { useLocalSearchParams } from 'expo-router';
import { FrameScene } from '../components/frame-scene';
import { frameContent } from '../lib/cards';
import { setThemeSeeds } from '../lib/theme-seeds';

/**
 * A sample frame with no account behind it: the scene the signed-in frame
 * draws, over made-up readings. For a shop window, for a screenshot, and for
 * checking the frame's look in a browser. `?door=1` opens a door, `?rotation=90`
 * turns the picture.
 */

/** Self-contained "photos": gradients, so the preview needs no network. */
function gradient(from: string, to: string, width: number, height: number): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/></svg>`,
  )}`;
}

const PHOTO = gradient('#1d3557', '#e76f51', 1920, 1080);
const PHOTO_SEEDS = ['#c4502f', '#30507a', '#a8623d'];

const SETTINGS: FrameSettings = {
  rotation: 0,
  safeArea: { top: 0, bottom: 0 },
  secondsPerPhoto: 45,
  drift: true,
  showClock: true,
  showCards: true,
  cards: { gallery: true, door: true, co2: true, music: true, weather: true, news: true },
  statusIcons: { indoorTemperature: true, outdoorTemperature: true, humidity: true, co2: true },
  backgroundAlbumId: null,
  galleryAlbumId: null,
  newsLanguages: [],
};

function devices(isDoorOpen: boolean): Device[] {
  return [
    {
      id: 'binary_sensor.studio_door',
      name: 'Balcony door',
      room: 'Studio',
      domain: 'binary_sensor',
      capabilities: [{ kind: 'binarySensor', active: isDoorOpen, deviceClass: 'door' }],
    },
    {
      id: 'sensor.studio_temperature',
      name: 'Studio temperature',
      room: 'Studio',
      domain: 'sensor',
      capabilities: [{ kind: 'measurement', value: 21.6, unit: '°C', deviceClass: 'temperature' }],
    },
    {
      id: 'sensor.studio_humidity',
      name: 'Studio humidity',
      room: 'Studio',
      domain: 'sensor',
      capabilities: [{ kind: 'measurement', value: 47, unit: '%', deviceClass: 'humidity' }],
    },
    {
      id: 'sensor.studio_co2',
      name: 'Studio CO2',
      room: 'Studio',
      domain: 'sensor',
      capabilities: [
        { kind: 'measurement', value: 1180, unit: 'ppm', deviceClass: 'carbon_dioxide' },
      ],
    },
    {
      id: 'media_player.studio',
      name: 'Studio speakers',
      room: 'Studio',
      domain: 'media_player',
      capabilities: [
        { kind: 'media', playing: true, volume: 30, title: 'Teardrop', artist: 'Massive Attack' },
      ],
    },
    {
      id: 'weather.home',
      name: 'Home',
      room: null,
      domain: 'weather',
      capabilities: [
        {
          kind: 'weather',
          condition: 'partlycloudy',
          temperature: 14.2,
          temperatureUnit: '°C',
          isNight: false,
        },
      ],
    },
  ];
}

export default function Preview() {
  const { door, rotation } = useLocalSearchParams<{ door?: string; rotation?: string }>();
  const settings: FrameSettings = {
    ...SETTINGS,
    rotation: rotation === '90' ? 90 : rotation === '180' ? 180 : rotation === '270' ? 270 : 0,
  };
  const content = frameContent({
    devices: devices(door === '1'),
    room: 'Studio',
    settings,
    news: {
      id: 'sample-story',
      title: 'Night trains return across Europe as demand for slow travel grows',
      publisher: 'Clarity',
      imageUrl: null,
      imageSeeds: ['#2a9d8f'],
    },
    gallery: { url: gradient('#2a9d8f', '#f4a261', 600, 400), width: 600, height: 400 },
  });
  return (
    <FrameScene
      settings={settings}
      content={content}
      photo={PHOTO}
      onPhotoShown={() => setThemeSeeds(PHOTO_SEEDS)}
      artwork={null}
      isOffline={false}
    />
  );
}
