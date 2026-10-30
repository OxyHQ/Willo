import test from 'node:test';
import assert from 'node:assert/strict';
import type { Frame } from '@willo.sh/shared-types';
import {
  FRAME_ONLINE_WINDOW_MS,
  isFrameOnline,
  withFrameChange,
} from '../packages/frontend/state/frames.ts';

const NOW = Date.parse('2026-10-30T12:00:00Z');

const FRAME: Frame = {
  id: 'frame-1',
  homeId: 'home-1',
  addedByUserId: 'user-1',
  name: 'Studio',
  room: 'Studio',
  settings: {
    rotation: 90,
    safeArea: { top: 40, bottom: 0 },
    secondsPerPhoto: 45,
    drift: true,
    showClock: true,
    showCards: true,
    cards: { gallery: true, door: true, co2: true, music: true, weather: true, news: true },
    statusIcons: { indoorTemperature: true, outdoorTemperature: true, humidity: true, co2: true },
    backgroundAlbumId: null,
    galleryAlbumId: null,
    newsLanguages: [],
  },
  diagnostics: { platform: 'web', appVersion: '1.0.0', fps: 16 },
  lastSeenAt: new Date(NOW - 30_000).toISOString(),
  createdAt: new Date(NOW - 86_400_000).toISOString(),
};

test('a frame that checked in within the window is online, one that did not is offline', () => {
  assert.equal(isFrameOnline(FRAME, NOW), true);
  const atEdge = new Date(NOW - FRAME_ONLINE_WINDOW_MS).toISOString();
  assert.equal(isFrameOnline({ lastSeenAt: atEdge }, NOW), true);
  const missed = new Date(NOW - FRAME_ONLINE_WINDOW_MS - 1).toISOString();
  assert.equal(isFrameOnline({ lastSeenAt: missed }, NOW), false);
});

test('a frame that never checked in is offline', () => {
  assert.equal(isFrameOnline({ lastSeenAt: null }, NOW), false);
});

test('a change merges nested settings one key at a time, as the backend does', () => {
  const changed = withFrameChange(FRAME, {
    settings: { safeArea: { bottom: 20 }, cards: { news: false } },
  });
  assert.deepEqual(changed.settings.safeArea, { top: 40, bottom: 20 });
  assert.equal(changed.settings.cards.news, false);
  assert.equal(changed.settings.cards.gallery, true);
  assert.equal(changed.settings.rotation, 90);
  assert.equal(changed.name, 'Studio');
});

test('a rename or a move leaves the settings as they were, and null clears the room', () => {
  const moved = withFrameChange(FRAME, { name: 'Hallway', room: null });
  assert.equal(moved.name, 'Hallway');
  assert.equal(moved.room, null);
  assert.equal(moved.settings, FRAME.settings);
});
