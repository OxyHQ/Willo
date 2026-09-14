import YAML from 'yaml';
import type { Entity } from '../types';
import type { Device, DeviceCapability, SmartHomeProvider } from './types';

const j = JSON.stringify;

type HomeAssistantCredentials = {
  instanceUrl: string;
  authCode?: string | null;
  refreshToken?: string | null;
  clientId: string;
  onRefreshToken: (refreshToken: string) => void;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
};

type TadoYamlConfig = {
  entities: string[];
};

// The subset of Home Assistant's registry fields needed to resolve which
// room (area) each device belongs to.
type RegistryEntity = { entity_id: string; device_id: string | null; area_id: string | null };
type RegistryDevice = { id: string; area_id: string | null };
type RegistryArea = { area_id: string; name: string };

const domainOf = (entityId: string) => entityId.split('.')[0];

const replaceOrAppend = <T extends { id: string }>(list: T[], item: T): T[] => {
  const index = list.findIndex(existing => existing.id === item.id);
  return index === -1 ? [...list, item] : list.map((existing, i) => (i === index ? item : existing));
};

// Every domain this provider knows how to curate. An entity whose domain
// isn't here is dropped rather than shown with no capabilities — curation
// (which domains, which specific entities within them) happens once, in
// Home Assistant's own www/tado.yaml.
const capabilitiesFor = (entity: Entity, instanceUrl: string): DeviceCapability[] | null => {
  switch (domainOf(entity.entity_id)) {
    case 'light':
      return [
        { kind: 'onOff', on: entity.state === 'on' },
        {
          kind: 'brightness',
          percent: entity.attributes.brightness != null ? Math.round((entity.attributes.brightness / 255) * 100) : null,
        },
        {
          kind: 'color',
          color: entity.attributes.rgb_color
            ? `rgb(${entity.attributes.rgb_color[0]}, ${entity.attributes.rgb_color[1]}, ${entity.attributes.rgb_color[2]})`
            : null,
        },
      ];
    case 'fan':
      return [
        { kind: 'onOff', on: entity.state === 'on' },
        { kind: 'fanSpeed', percent: entity.attributes.percentage ?? null },
      ];
    case 'sensor':
      return [
        {
          kind: 'measurement',
          value: entity.state === 'unknown' || entity.state === 'unavailable' ? null : Number(entity.state),
          unit: entity.attributes.unit_of_measurement ?? null,
          deviceClass: entity.attributes.device_class ?? null,
        },
      ];
    case 'camera':
      return [{ kind: 'camera', snapshotUrl: entity.attributes.entity_picture ? `${instanceUrl}${entity.attributes.entity_picture}` : null }];
    default:
      return null;
  }
};

// Home Assistant is the first, and so far only, implementation of
// SmartHomeProvider. This module owns everything HA-specific (its OAuth
// dance, its WebSocket protocol, its entity/area registries); nothing
// outside providers/ should import from here directly.
export function createHomeAssistantProvider(credentials: HomeAssistantCredentials): SmartHomeProvider {
  const { instanceUrl, authCode, refreshToken, clientId, onRefreshToken } = credentials;
  const url = new URL(instanceUrl);

  let ws: WebSocket | null = null;
  let nextMessageId = 1;
  let allowedEntityIds: string[] = [];
  let roomByEntityId = new Map<string, string | null>();
  let devices: Device[] = [];
  const listeners = new Set<(devices: Device[]) => void>();

  const emit = () => listeners.forEach(listener => listener(devices));

  const toDevice = (entity: Entity): Device | null => {
    const capabilities = capabilitiesFor(entity, instanceUrl);
    if (!capabilities) return null;
    return {
      id: entity.entity_id,
      name: entity.attributes.friendly_name ?? entity.entity_id,
      room: roomByEntityId.get(entity.entity_id) ?? null,
      domain: domainOf(entity.entity_id),
      capabilities,
    };
  };

  const setInitialDevices = (entities: Entity[]) => {
    devices = entities.map(toDevice).filter((device): device is Device => device !== null);
  };

  const applyStateChange = (entity: Entity) => {
    const updated = toDevice(entity);
    if (!updated) return;
    devices = replaceOrAppend(devices, updated);
    emit();
  };

  async function connect(): Promise<Device[]> {
    // authCode is single-use (OAuth authorization_code grant): it's only
    // present right after login. Every later connection must reuse the
    // refresh_token that came back from that first exchange instead.
    const tokenResponse = await fetch(`${instanceUrl}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(
        refreshToken
          ? { grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId }
          : { grant_type: 'authorization_code', code: authCode ?? '', client_id: clientId }
      ).toString(),
    });
    const tokenData: TokenResponse = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error('Home Assistant did not return an access token.');
    if (tokenData.refresh_token) onRefreshToken(tokenData.refresh_token);

    const tadoResponse = await fetch(`${instanceUrl}/local/tado.yaml?${Date.now()}`, { cache: 'no-store' });
    const tadoConfig: TadoYamlConfig = YAML.parse(await tadoResponse.text());
    allowedEntityIds = tadoConfig.entities;

    const { access_token: accessToken } = tokenData;

    return new Promise<Device[]>((resolve, reject) => {
      ws = new WebSocket(`${url.protocol === 'https:' ? 'wss' : 'ws'}://${url.host}/api/websocket`);
      const requestIds = { states: 0, entities: 0, devices: 0, areas: 0 };
      const pending: {
        states?: Entity[];
        entities?: RegistryEntity[];
        devices?: RegistryDevice[];
        areas?: RegistryArea[];
      } = {};

      const finishConnecting = () => {
        if (!pending.states || !pending.entities || !pending.devices || !pending.areas) return;
        const areaNameById = new Map(pending.areas.map(area => [area.area_id, area.name]));
        const deviceAreaById = new Map(pending.devices.map(device => [device.id, device.area_id]));
        roomByEntityId = new Map(
          pending.entities.map(entity => {
            const areaId = entity.area_id ?? (entity.device_id ? deviceAreaById.get(entity.device_id) ?? null : null);
            return [entity.entity_id, areaId ? areaNameById.get(areaId) ?? null : null];
          })
        );
        setInitialDevices(pending.states.filter(entity => allowedEntityIds.includes(entity.entity_id)));
        resolve(devices);
      };

      ws.onerror = () => reject(new Error('Could not reach Home Assistant.'));

      ws.onmessage = event => {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'auth_required':
            ws?.send(j({ type: 'auth', access_token: accessToken }));
            break;
          case 'auth_invalid':
            reject(new Error('Home Assistant rejected the stored session.'));
            ws?.close();
            break;
          case 'auth_ok':
            requestIds.states = nextMessageId++;
            ws?.send(j({ id: requestIds.states, type: 'get_states' }));
            requestIds.entities = nextMessageId++;
            ws?.send(j({ id: requestIds.entities, type: 'config/entity_registry/list' }));
            requestIds.devices = nextMessageId++;
            ws?.send(j({ id: requestIds.devices, type: 'config/device_registry/list' }));
            requestIds.areas = nextMessageId++;
            ws?.send(j({ id: requestIds.areas, type: 'config/area_registry/list' }));
            ws?.send(j({ id: nextMessageId++, type: 'subscribe_events', event_type: 'state_changed' }));
            break;
          case 'event': {
            const changed = message.event.data as { entity_id: string; new_state: Entity };
            if (allowedEntityIds.includes(changed.entity_id)) applyStateChange(changed.new_state);
            break;
          }
          case 'result':
            if (message.id === requestIds.states) {
              pending.states = message.result as Entity[];
              finishConnecting();
            } else if (message.id === requestIds.entities) {
              pending.entities = message.result as RegistryEntity[];
              finishConnecting();
            } else if (message.id === requestIds.devices) {
              pending.devices = message.result as RegistryDevice[];
              finishConnecting();
            } else if (message.id === requestIds.areas) {
              pending.areas = message.result as RegistryArea[];
              finishConnecting();
            }
            break;
        }
      };
    });
  }

  const callService = (domain: string, service: string, serviceData: Record<string, unknown>) =>
    ws?.send(j({ id: nextMessageId++, type: 'call_service', domain, service, service_data: serviceData }));

  return {
    connect,
    subscribe(onDevices) {
      listeners.add(onDevices);
      return () => listeners.delete(onDevices);
    },
    sendCommand(id, command) {
      const domain = domainOf(id);
      switch (command.kind) {
        case 'setOnOff':
          callService(domain, command.on ? 'turn_on' : 'turn_off', { entity_id: id });
          break;
        case 'setBrightness':
          callService('light', 'turn_on', { entity_id: id, brightness_pct: Math.round(command.percent) });
          break;
        case 'setFanSpeed':
          callService('fan', 'set_percentage', { entity_id: id, percentage: Math.round(command.percent) });
          break;
      }
    },
  };
}
