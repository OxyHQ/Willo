import URL from 'url-parse';
import YAML from 'yaml';
const j = JSON.stringify;

export default async ({
  instanceUrl,
  authCode,
  refreshToken,
  clientId,
  onRefreshToken,
  getEntities,
  getUpdatedState,
  getConfig,
}) => {
  const url = new URL(instanceUrl);

  // authCode is single-use (OAuth authorization_code grant): it's only
  // present right after login. Every later connection must reuse the
  // refresh_token that came back from that first exchange instead.
  const res = await fetch(`${instanceUrl}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(
      refreshToken
        ? {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
          }
        : {
            grant_type: 'authorization_code',
            code: authCode,
            client_id: clientId,
          }
    ).toString(),
  });

  const data = await res.json();
  if (data.refresh_token) {
    onRefreshToken(data.refresh_token);
  }

  const res2 = await fetch(`${instanceUrl}/local/tado.yaml?${Date.now()}`, {
    cache: 'no-store',
  });
  const ui = YAML.parse(await res2.text());

  const { access_token: accessToken } = data;

  const ws = new WebSocket(
    `${url.protocol === 'https:' ? 'wss' : 'ws'}://${
      url.hostname
    }/api/websocket`
  );

  let id = 1;

  ws.onmessage = e => {
    const data = JSON.parse(e.data);
    switch (data.type) {
      case 'auth_required':
        ws.send(
          j({
            type: 'auth',
            access_token: accessToken,
          })
        );
        break;
      case 'auth_invalid':
        console.log('Invalid authentication');
        ws.close();
        break;
      case 'auth_ok':
        ws.send(
          j({
            id: id++,
            type: 'subscribe_events',
            event_type: 'state_changed',
          })
        );
        ws.send(
          j({
            id: id++,
            type: 'get_states',
          })
        );
        ws.send(
          j({
            id: id++,
            type: 'get_config',
          })
        );
        break;
      case 'event':
        const event = data.event.data;
        if (ui.entities.includes(event.entity_id)) {
          getUpdatedState(event.new_state);
        }
        break;
      case 'result':
        switch (data.id) {
          case 2:
            getEntities(
              ui.entities
                .map(entity => data.result.find(e => e.entity_id === entity))
                .filter(Boolean)
            );
            break;
          case 3:
            getConfig(data.result);
            break;
        }
        break;
      default:
        console.log(data.type);
    }
  };

  return (temperature, entity_id) =>
    ws.send(
      j({
        id: id++,
        type: 'call_service',
        domain: 'climate',
        service: 'set_temperature',
        service_data: {
          entity_id,
          temperature,
        },
      })
    );
};
