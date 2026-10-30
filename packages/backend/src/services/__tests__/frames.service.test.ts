/**
 * Runs against a REAL Postgres — set DATABASE_URL (see `.env.example`) before
 * running `bun test src`. `bun run db:up` starts one locally.
 */

import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import type { Namespace } from 'socket.io';
import { closePostgres, connectPostgres, getDb } from '../../db/postgres';
import { frames, homes } from '../../db/schema';
import { NotFoundError } from '../../errors';
import { setHomesNamespace } from '../../realtime/socketRegistry';
import { createHome } from '../homes.service';
import { acceptInvite, inviteMember, removeMember } from '../homeMembers.service';
import {
  DEFAULT_FRAME_SETTINGS,
  getOwnFrame,
  listFrames,
  recordHeartbeat,
  registerFrame,
  removeFrame,
  resolveFrameSettings,
  updateFrame,
} from '../frames.service';

/** Every event the services emitted, in order. */
const emitted: { room: string; event: string; payload: unknown }[] = [];
const recorder = {
  to: (room: string) => ({
    emit: (event: string, payload: unknown) => {
      emitted.push({ room, event, payload });
      return true;
    },
  }),
};

before(async () => {
  await connectPostgres();
  setHomesNamespace(recorder as unknown as Namespace);
});

beforeEach(() => {
  emitted.length = 0;
});

after(async () => {
  await closePostgres();
});

const newUserId = (label: string): string => `user-${label}-${crypto.randomUUID()}`;
const newSessionId = (): string => `session-${crypto.randomUUID()}`;

const FRAME = {
  name: 'Studio',
  room: 'Studio',
  oxyDeviceId: 'device-1',
  platform: 'web',
  appVersion: '1.0.0',
};

async function withHome(run: (homeId: string, owner: string) => Promise<void>): Promise<void> {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    await run(home.id, owner);
  } finally {
    // ON DELETE CASCADE takes the frames with the Home.
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
}

test('a frame registers in a Home and reads itself back, every setting filled in', async () => {
  await withHome(async (homeId, owner) => {
    const session = newSessionId();
    const registered = await registerFrame(homeId, owner, session, FRAME);
    assert.equal(registered.name, 'Studio');
    assert.deepEqual(registered.settings, DEFAULT_FRAME_SETTINGS);
    assert.deepEqual(
      emitted.map((entry) => [entry.room, entry.event]),
      [[`home:${homeId}`, 'home:frame-updated']],
    );

    const own = await getOwnFrame(owner, session);
    assert.equal(own.id, registered.id);
    assert.equal(own.addedByUserId, owner);
    assert.equal(own.room, 'Studio');
  });
});

test('registering again from the same session keeps the frame and its settings', async () => {
  await withHome(async (homeId, owner) => {
    const session = newSessionId();
    const first = await registerFrame(homeId, owner, session, FRAME);
    await updateFrame(homeId, owner, first.id, { settings: { rotation: 90 } });

    const again = await registerFrame(homeId, owner, session, { ...FRAME, appVersion: '1.0.1' });
    assert.equal(again.id, first.id);
    assert.equal(again.settings.rotation, 90);
    assert.equal(again.diagnostics.appVersion, '1.0.1');
    assert.equal((await listFrames(homeId, owner)).length, 1);
  });
});

test('only an active member can register a frame in a Home', async () => {
  await withHome(async (homeId) => {
    await assert.rejects(
      registerFrame(homeId, newUserId('stranger'), newSessionId(), FRAME),
      NotFoundError,
    );
  });
});

test('a session that never registered, or belongs to someone else, finds no frame', async () => {
  await withHome(async (homeId, owner) => {
    // Someone else in the SAME Home: membership alone must not make another
    // person's frame theirs.
    const member = newUserId('member');
    const invite = await inviteMember(homeId, owner, member);
    await acceptInvite(homeId, invite.id, member);
    const session = newSessionId();
    await registerFrame(homeId, owner, session, FRAME);
    await assert.rejects(getOwnFrame(owner, newSessionId()), NotFoundError);
    await assert.rejects(getOwnFrame(member, session), NotFoundError);
    await assert.rejects(recordHeartbeat(member, session, {}), NotFoundError);
  });
});

test('a frame set up by someone who left the Home no longer finds itself', async () => {
  await withHome(async (homeId, owner) => {
    const member = newUserId('member');
    const invite = await inviteMember(homeId, owner, member);
    await acceptInvite(homeId, invite.id, member);
    const session = newSessionId();
    await registerFrame(homeId, member, session, FRAME);
    assert.ok(await getOwnFrame(member, session));

    await removeMember(homeId, owner, invite.id);
    await assert.rejects(getOwnFrame(member, session), NotFoundError);
  });
});

test('a change merges into what was chosen, one nested key at a time, and is announced', async () => {
  await withHome(async (homeId, owner) => {
    const frame = await registerFrame(homeId, owner, newSessionId(), FRAME);
    await updateFrame(homeId, owner, frame.id, {
      settings: { safeArea: { top: 40 }, cards: { news: false } },
    });
    emitted.length = 0;
    const updated = await updateFrame(homeId, owner, frame.id, {
      name: 'Hallway',
      settings: { safeArea: { bottom: 12 }, cards: { door: false } },
    });

    assert.equal(updated.name, 'Hallway');
    assert.deepEqual(updated.settings.safeArea, { top: 40, bottom: 12 });
    assert.equal(updated.settings.cards.news, false);
    assert.equal(updated.settings.cards.door, false);
    assert.equal(updated.settings.cards.gallery, true);
    assert.deepEqual(
      emitted.map((entry) => entry.event),
      ['home:frame-updated'],
    );
    // Only what was chosen is stored, so a later default still reaches the rest.
    const [row] = await getDb().select().from(frames).where(eq(frames.id, frame.id));
    assert.deepEqual(row?.settings, {
      safeArea: { top: 40, bottom: 12 },
      cards: { news: false, door: false },
    });
  });
});

test("a frame cannot be changed or removed through another Home's id", async () => {
  await withHome(async (homeId, owner) => {
    const frame = await registerFrame(homeId, owner, newSessionId(), FRAME);
    const { home: otherHome } = await createHome(owner);
    try {
      await assert.rejects(
        updateFrame(otherHome.id, owner, frame.id, { name: 'Moved' }),
        NotFoundError,
      );
      await assert.rejects(removeFrame(otherHome.id, owner, frame.id), NotFoundError);
    } finally {
      await getDb().delete(homes).where(eq(homes.id, otherHome.id));
    }
  });
});

test('a heartbeat marks the frame online with how it is running', async () => {
  await withHome(async (homeId, owner) => {
    const session = newSessionId();
    await registerFrame(homeId, owner, session, FRAME);
    await recordHeartbeat(owner, session, { fps: 16.5 });
    const frame = await getOwnFrame(owner, session);
    assert.equal(frame.diagnostics.fps, 16.5);
    assert.equal(frame.diagnostics.platform, 'web');
    assert.ok(frame.lastSeenAt);
  });
});

test('removing a frame answers its Oxy device, for the app to sign it out', async () => {
  await withHome(async (homeId, owner) => {
    const session = newSessionId();
    const frame = await registerFrame(homeId, owner, session, FRAME);
    emitted.length = 0;
    assert.deepEqual(await removeFrame(homeId, owner, frame.id), { oxyDeviceId: 'device-1' });
    assert.deepEqual(
      emitted.map((entry) => entry.event),
      ['home:frame-removed'],
    );
    await assert.rejects(getOwnFrame(owner, session), NotFoundError);
  });
});

test('stored settings a release no longer accepts fall back to the defaults', () => {
  assert.deepEqual(resolveFrameSettings({ rotation: 45 }), DEFAULT_FRAME_SETTINGS);
  assert.deepEqual(resolveFrameSettings({ greeting: true }), DEFAULT_FRAME_SETTINGS);
  assert.equal(resolveFrameSettings({ rotation: 270 }).rotation, 270);
});
