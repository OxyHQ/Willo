import YAML from 'yaml';
import type { Entity, HomeAssistantConfig } from './types';

const j = JSON.stringify;

type ConnectParams = {
  instanceUrl: string;
  authCode?: string | null;
  refreshToken?: string | null;
  clientId: string;
  onRefreshToken: (refreshToken: string) => void;
  getEntities: (entities: Entity[]) => void;
  getUpdatedState: (entity: Entity) => void;
  getConfig: (config: HomeAssistantConfig) => void;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
};

type TadoYamlConfig = {
  entities: string[];
};

export default async function connect({
  instanceUrl,
  authCode,
  refreshToken,
  clientId,
  onRefreshToken,
  getEntities,
  getUpdatedState,
  getConfig,
}: ConnectParams) {
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
            code: authCode ?? '',
            client_id: clientId,
          }
    ).toString(),
  });

  const data: TokenResponse = await res.json();
  if (data.refresh_token) {
    onRefreshToken(data.refresh_token);
  }

  const res2 = await fetch(`${instanceUrl}/local/tado.yaml?${Date.now()}`, {
    cache: 'no-store',
  });
  const ui: TadoYamlConfig = YAML.parse(await res2.text());

  const { access_token: accessToken } = data;

  const ws = new WebSocket(
    `${url.protocol === 'https:' ? 'wss' : 'ws'}://${url.host}/api/websocket`
  );

  let id = 1;

  ws.onmessage = e => {
    const message = JSON.parse(e.data);
    switch (message.type) {
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
      case 'event': {
        const event = message.event.data as { entity_id: string; new_state: Entity };
        if (ui.entities.includes(event.entity_id)) {
          getUpdatedState(event.new_state);
        }
        break;
      }
      case 'result':
        switch (message.id) {
          case 2: {
            const states = message.result as Entity[];
            getEntities(
              ui.entities
                .map(entityId => states.find(e => e.entity_id === entityId))
                .filter((entity): entity is Entity => Boolean(entity))
            );
            break;
          }
          case 3:
            getConfig(message.result as HomeAssistantConfig);
            break;
        }
        break;
      default:
        console.log(message.type);
    }
  };

  return (temperature: number | string, entityId: string) =>
    ws.send(
      j({
        id: id++,
        type: 'call_service',
        domain: 'climate',
        service: 'set_temperature',
        service_data: {
          entity_id: entityId,
          temperature,
        },
      })
    );
}
