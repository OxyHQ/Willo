import test from 'node:test';
import assert from 'node:assert/strict';
import type { Device, FrameSettings } from '@willo.sh/shared-types';
import { CO2_ALERT_PPM, frameContent } from '../packages/frame/lib/cards.ts';

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

const door = (room: string, active: boolean): Device => ({
  id: `binary_sensor.${room}_door`,
  name: `${room} door`,
  room,
  domain: 'binary_sensor',
  capabilities: [{ kind: 'binarySensor', active, deviceClass: 'door' }],
});
const sensor = (room: string, deviceClass: string, value: number, unit: string): Device => ({
  id: `sensor.${room}_${deviceClass}`,
  name: `${room} ${deviceClass}`,
  room,
  domain: 'sensor',
  capabilities: [{ kind: 'measurement', value, unit, deviceClass }],
});
const speaker = (room: string, playing: boolean): Device => ({
  id: `media_player.${room}`,
  name: `${room} speakers`,
  room,
  domain: 'media_player',
  capabilities: [
    {
      kind: 'media',
      playing,
      volume: 40,
      title: 'Teardrop',
      artist: 'Massive Attack',
      artworkKey: 'abc',
    },
  ],
});
const WEATHER: Device = {
  id: 'weather.home',
  name: 'Home',
  room: null,
  domain: 'weather',
  capabilities: [
    {
      kind: 'weather',
      condition: 'partlycloudy',
      temperature: 14.6,
      temperatureUnit: '°C',
      isNight: true,
    },
  ],
};
const NEWS = { id: 'n1', title: 'Story', publisher: 'Example', imageUrl: null, imageSeeds: [] };
const GALLERY = { url: 'https://example/photo.jpg', width: 400, height: 300 };

const content = (devices: Device[], overrides: Partial<Parameters<typeof frameContent>[0]> = {}) =>
  frameContent({
    devices,
    room: 'Studio',
    settings: SETTINGS,
    news: null,
    gallery: null,
    ...overrides,
  });

test("an open door in the frame's room drops the alert panel; one elsewhere does not", () => {
  const { alerts } = content([door('Studio', true), door('Kitchen', true), door('Hall', false)]);
  assert.deepEqual(
    alerts.map((alert) => alert.name),
    ['Studio door'],
  );
});

test('stuffy air is an alert card only above the threshold, rounded to 25 ppm', () => {
  assert.deepEqual(content([sensor('Studio', 'carbon_dioxide', CO2_ALERT_PPM, 'ppm')]).row, []);
  const [card] = content([sensor('Studio', 'carbon_dioxide', 1312, 'ppm')]).row;
  assert.deepEqual(card, { kind: 'co2', ppm: 1300 });
});

test('the row puts music first, then gallery, news, weather and stuffy air', () => {
  const { row } = content(
    [sensor('Studio', 'carbon_dioxide', 1400, 'ppm'), WEATHER, speaker('Studio', true)],
    { news: NEWS, gallery: GALLERY },
  );
  assert.deepEqual(
    row.map((card) => card.kind),
    ['music', 'gallery', 'news', 'weather', 'co2'],
  );
});

test('music shows only while a player in the room plays something with a title', () => {
  assert.equal(content([speaker('Studio', false)]).row.length, 0);
  assert.equal(content([speaker('Kitchen', true)]).row.length, 0);
  assert.deepEqual(content([speaker('Studio', true)]).row[0], {
    kind: 'music',
    deviceId: 'media_player.Studio',
    title: 'Teardrop',
    artist: 'Massive Attack',
    artworkKey: 'abc',
  });
});

test('the weather comes from any room, in whole degrees, with night', () => {
  assert.deepEqual(content([WEATHER]).row[0], {
    kind: 'weather',
    condition: 'partlycloudy',
    isNight: true,
    temperature: 15,
    unit: '°C',
  });
});

test('each card follows its setting, and hiding cards hides them all, alerts included', () => {
  const devices = [door('Studio', true), WEATHER, speaker('Studio', true)];
  const noWeather = content(devices, {
    settings: { ...SETTINGS, cards: { ...SETTINGS.cards, weather: false } },
  });
  assert.deepEqual(
    noWeather.row.map((card) => card.kind),
    ['music'],
  );
  const hidden = content(devices, { settings: { ...SETTINGS, showCards: false }, news: NEWS });
  assert.deepEqual(hidden.row, []);
  assert.deepEqual(hidden.alerts, []);
});

test('the readings come from the room (outside from the weather) and follow their settings', () => {
  const devices = [
    sensor('Studio', 'temperature', 21.4, '°C'),
    sensor('Studio', 'humidity', 48.6, '%'),
    sensor('Studio', 'carbon_dioxide', 1100, 'ppm'),
    sensor('Kitchen', 'temperature', 25, '°C'),
    WEATHER,
  ];
  assert.deepEqual(content(devices).status, [
    { icon: 'indoorTemperature', value: 21, unit: '°C', isAlert: false },
    { icon: 'outdoorTemperature', value: 15, unit: '°C', isAlert: false },
    { icon: 'humidity', value: 49, unit: '%', isAlert: false },
    { icon: 'co2', value: 1100, unit: 'ppm', isAlert: true },
  ]);
  const onlyInside = content(devices, {
    settings: {
      ...SETTINGS,
      statusIcons: {
        indoorTemperature: true,
        outdoorTemperature: false,
        humidity: false,
        co2: false,
      },
    },
  });
  assert.deepEqual(
    onlyInside.status.map((reading) => reading.icon),
    ['indoorTemperature'],
  );
});

test('a frame with no room counts no room devices', () => {
  const { alerts, status } = content(
    [door('Studio', true), sensor('Studio', 'temperature', 21, '°C')],
    {
      room: null,
    },
  );
  assert.deepEqual(alerts, []);
  assert.deepEqual(status, []);
});
