import { eq } from 'drizzle-orm';
import { getDb } from '../db/postgres';
import { homeConnections } from '../db/schema';
import { HOME_CONNECTION_DISPLAY_COLUMNS, type HomeConnectionDisplayRow } from '../db/homeConnectionColumns';
import { BadRequestError, NotFoundError } from '../errors';
import { assertActiveMember, assertActiveOwner } from './homes.service';
import { exchangeHomeAssistantToken } from './homeAssistantToken';

export interface SetConnectionInput {
  instanceUrl: string;
  clientId: string;
  authCode?: string;
  refreshToken?: string;
}

/**
 * Set/replace a Home's Home Assistant connection. Owner only — this is
 * credential-level access. Supports both of the frontend's existing flows: a
 * first-time OAuth `authCode` exchange, or an already-known `refreshToken`
 * (re-pointing at a different instance without redoing OAuth).
 *
 * Either way, the exchange runs immediately: it proves the credentials
 * actually work before they're stored, and — because Home Assistant rotates
 * the refresh_token on every exchange — it is also what makes the row we
 * persist the CURRENT token rather than a value that may already be stale by
 * the time anyone calls the broker endpoint below.
 */
export async function setConnection(homeId: string, userId: string, input: SetConnectionInput): Promise<HomeConnectionDisplayRow> {
  await assertActiveOwner(homeId, userId);

  const tokenData = await exchangeHomeAssistantToken(input);

  // HA's refresh_token grant does not always return a new refresh_token; the
  // frontend's own connect() only persists one when present
  // (`if (tokenData.refresh_token) onRefreshToken(...)`) and otherwise keeps
  // using the one it already had. Mirrored here: fall back to whatever the
  // caller supplied.
  const refreshTokenToStore = tokenData.refresh_token ?? input.refreshToken;
  if (!refreshTokenToStore) {
    throw new BadRequestError('Home Assistant did not return a refresh token.');
  }

  const values = {
    provider: 'home_assistant' as const,
    instanceUrl: input.instanceUrl,
    clientId: input.clientId,
    refreshToken: refreshTokenToStore,
  };

  const [row] = await getDb()
    .insert(homeConnections)
    .values({ homeId, ...values })
    .onConflictDoUpdate({ target: [homeConnections.homeId], set: values })
    .returning(HOME_CONNECTION_DISPLAY_COLUMNS);
  if (!row) throw new Error('Failed to save the Home Assistant connection.');
  return row;
}

/** Connection info WITHOUT the raw refresh token. Any active member. */
export async function getConnectionForDisplay(homeId: string, userId: string): Promise<HomeConnectionDisplayRow | null> {
  await assertActiveMember(homeId, userId);
  const [row] = await getDb()
    .select(HOME_CONNECTION_DISPLAY_COLUMNS)
    .from(homeConnections)
    .where(eq(homeConnections.homeId, homeId))
    .limit(1);
  return row ?? null;
}

/**
 * The token broker: exchange the stored refresh_token for a fresh HA
 * access_token, persist whatever new refresh_token HA returns, and hand back
 * only the ephemeral access_token. Any active member may call this — it is
 * how every member's client gets to open its own direct HA WebSocket without
 * any client ever holding the refresh_token itself.
 *
 * THIS IS THE ONLY FUNCTION IN THIS CODEBASE ALLOWED TO SELECT
 * `homeConnections.refreshToken`. Everything else that needs to know a Home
 * merely HAS a connection goes through `getConnectionForDisplay` above.
 *
 * Row-locked (`for('update')`) inside a transaction: this is what makes the
 * backend an actual single writer rather than just a single call site. Home
 * Assistant invalidates the previous refresh_token the moment a new one is
 * issued, so two members racing this endpoint for the SAME home must not
 * both read the same refresh_token and both try to exchange it — the second
 * exchange would fail against HA with a token that already rotated out from
 * under it. The row lock serializes them instead: the second call's SELECT
 * blocks until the first transaction commits its rotated token, then reads
 * THAT fresh value rather than the one that is already stale.
 */
export async function brokerAccessToken(homeId: string, userId: string): Promise<{ accessToken: string; instanceUrl: string }> {
  await assertActiveMember(homeId, userId);

  return getDb().transaction(async (tx) => {
    const [connection] = await tx
      .select()
      .from(homeConnections)
      .where(eq(homeConnections.homeId, homeId))
      .for('update')
      .limit(1);
    if (!connection) throw new NotFoundError('This Home has no Home Assistant connection.');

    const tokenData = await exchangeHomeAssistantToken({
      instanceUrl: connection.instanceUrl,
      clientId: connection.clientId,
      refreshToken: connection.refreshToken,
    });

    if (tokenData.refresh_token && tokenData.refresh_token !== connection.refreshToken) {
      await tx.update(homeConnections).set({ refreshToken: tokenData.refresh_token }).where(eq(homeConnections.id, connection.id));
    }

    return { accessToken: tokenData.access_token, instanceUrl: connection.instanceUrl };
  });
}
