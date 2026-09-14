/**
 * Runs against a REAL Postgres — set DATABASE_URL (see `.env.example`) before
 * running `bun test src`. Home Assistant's `/auth/token` endpoint is mocked
 * via `global.fetch` rather than requiring a real HA instance.
 */

import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { closePostgres, connectPostgres, getDb } from '../../db/postgres';
import { homeConnections, homes } from '../../db/schema';
import { createHome } from '../homes.service';
import { brokerAccessToken, getConnectionForDisplay } from '../homeConnection.service';
import { NotFoundError } from '../../errors';

before(async () => {
  await connectPostgres();
});

after(async () => {
  await closePostgres();
});

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function newUserId(label: string): string {
  return `user-${label}-${crypto.randomUUID()}`;
}

/**
 * A fake Home Assistant `/auth/token` that only accepts the refresh_token it
 * currently considers valid — exactly HA's real rotation behaviour, where the
 * previous refresh_token stops working the moment a new one is issued. Each
 * accepted exchange returns a NEW refresh_token and moves what it accepts
 * next to that new value, so a second call with the OLD token fails.
 */
function mockRotatingHomeAssistant(initialRefreshToken: string): { calls: string[] } {
  const calls: string[] = [];
  let currentValidRefreshToken = initialRefreshToken;
  let rotation = 0;

  global.fetch = (async (_url: string, init?: RequestInit) => {
    const body = new URLSearchParams(String(init?.body ?? ''));
    const suppliedToken = body.get('refresh_token') ?? '';
    calls.push(suppliedToken);

    if (body.get('grant_type') !== 'refresh_token' || suppliedToken !== currentValidRefreshToken) {
      return { ok: false, status: 400, json: async () => ({ error: 'invalid_grant' }) } as Response;
    }

    rotation += 1;
    const nextRefreshToken = `rotated-${rotation}-${initialRefreshToken}`;
    currentValidRefreshToken = nextRefreshToken;

    return {
      ok: true,
      status: 200,
      json: async () => ({ access_token: `access-${rotation}-${initialRefreshToken}`, refresh_token: nextRefreshToken }),
    } as Response;
  }) as typeof fetch;

  return { calls };
}

async function seedConnection(homeId: string, refreshToken: string): Promise<void> {
  await getDb().insert(homeConnections).values({
    homeId,
    provider: 'home_assistant',
    instanceUrl: 'http://homeassistant.local:8123',
    clientId: 'test-client',
    refreshToken,
  });
}

async function rawRefreshToken(homeId: string): Promise<string | undefined> {
  const [row] = await getDb().select().from(homeConnections).where(eq(homeConnections.homeId, homeId)).limit(1);
  return row?.refreshToken;
}

test('brokerAccessToken persists the ROTATED refresh_token, not the stale one', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    await seedConnection(home.id, 'initial-refresh-token');
    const ha = mockRotatingHomeAssistant('initial-refresh-token');

    const first = await brokerAccessToken(home.id, owner);
    assert.equal(first.accessToken, 'access-1-initial-refresh-token');
    assert.equal(first.instanceUrl, 'http://homeassistant.local:8123');

    // The row must now hold the ROTATED token, not what was seeded.
    const afterFirst = await rawRefreshToken(home.id);
    assert.equal(afterFirst, 'rotated-1-initial-refresh-token');
    assert.notEqual(afterFirst, 'initial-refresh-token');

    // Calling again proves the persistence, not just the return value: the
    // mock only accepts its CURRENT token, so a second broker call only
    // succeeds if the first call's rotation was actually written back. If the
    // code under test had reused the stale seeded token instead of the
    // persisted one, this call would hit the mock's `ok:false` branch.
    const second = await brokerAccessToken(home.id, owner);
    assert.equal(second.accessToken, 'access-2-initial-refresh-token');

    const afterSecond = await rawRefreshToken(home.id);
    assert.equal(afterSecond, 'rotated-2-initial-refresh-token');

    assert.deepEqual(ha.calls, ['initial-refresh-token', 'rotated-1-initial-refresh-token']);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('a Home with no connection answers NotFound from the broker', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    await assert.rejects(() => brokerAccessToken(home.id, owner), NotFoundError);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('getConnectionForDisplay never returns the raw refresh token', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    await seedConnection(home.id, 'super-secret-refresh-token');
    const connection = await getConnectionForDisplay(home.id, owner);
    assert.ok(connection);
    assert.equal('refreshToken' in connection, false);
    assert.equal(connection.instanceUrl, 'http://homeassistant.local:8123');
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});
