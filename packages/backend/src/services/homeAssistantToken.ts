/**
 * Home Assistant's `/auth/token` endpoint — the exact HTTP call shape already
 * proven working in `packages/frontend/providers/home-assistant.ts`'s
 * `connect()`, ported here so the backend is the only thing that ever
 * performs it. Same two grants that function supports: `authorization_code`
 * for a first-time OAuth exchange (single-use), `refresh_token` for every
 * exchange after.
 *
 * Deliberately plain `fetch`, not `@oxy.so/core/server`'s `safeFetch`/
 * `assertSafePublicUrl`: those exist to stop a backend being tricked into
 * reaching internal/private network addresses on a caller's behalf (SSRF).
 * Home Assistant instances are, by design, almost always on exactly such an
 * address — a household LAN IP or `*.local` mDNS name — so that guard would
 * block the one destination this call exists to reach. `instanceUrl` here is
 * not attacker-supplied request routing; it is the address of the Home
 * Assistant instance a Home's OWNER configured for their own house (`PUT
 * /homes/:id/connection`, owner-only), which is the same trust boundary the
 * frontend's existing direct `fetch` to `${instanceUrl}/auth/token` already
 * accepted.
 */

export interface HomeAssistantTokenResponse {
  access_token: string;
  refresh_token?: string;
}

export async function exchangeHomeAssistantToken(params: {
  instanceUrl: string;
  clientId: string;
  authCode?: string;
  refreshToken?: string;
}): Promise<HomeAssistantTokenResponse> {
  const { instanceUrl, clientId, authCode, refreshToken } = params;

  const response = await fetch(`${instanceUrl}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(
      refreshToken
        ? { grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId }
        : { grant_type: 'authorization_code', code: authCode ?? '', client_id: clientId }
    ).toString(),
  });

  if (!response.ok) {
    throw new Error(`Home Assistant token exchange failed with status ${response.status}`);
  }

  const data = (await response.json()) as HomeAssistantTokenResponse;
  if (!data.access_token) {
    throw new Error('Home Assistant did not return an access token.');
  }
  return data;
}
