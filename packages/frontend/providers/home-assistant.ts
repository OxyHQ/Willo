import YAML from 'yaml';
import type { Entity } from '../types';
import type { CameraDevice, DeviceSnapshot, FanDevice, LightDevice, SensorReading, SmartHomeProvider } from './types';

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
  let snapshot: DeviceSnapshot = { lights: [], cameras: [], fans: [], sensors: [] };
  const listeners = new Set<(snapshot: DeviceSnapshot) => void>();

  const emit = () => listeners.forEach(listener => listener(snapshot));

  const toLightDevice = (entity: Entity): LightDevice => ({
    id: entity.entity_id,
    name: entity.attributes.friendly_name ?? entity.entity_id,
    room: roomByEntityId.get(entity.entity_id) ?? null,
    on: entity.state === 'on',
    brightness:
      entity.attributes.brightness != null
        ? Math.round((entity.attributes.brightness / 255) * 100)
        : null,
    color: entity.attributes.rgb_color
      ? `rgb(${entity.attributes.rgb_color[0]}, ${entity.attributes.rgb_color[1]}, ${entity.attributes.rgb_color[2]})`
      : null,
  });

  const toCameraDevice = (entity: Entity): CameraDevice => ({
    id: entity.entity_id,
    name: entity.attributes.friendly_name ?? entity.entity_id,
    room: roomByEntityId.get(entity.entity_id) ?? null,
    snapshotUrl: entity.attributes.entity_picture ? `${instanceUrl}${entity.attributes.entity_picture}` : null,
  });

  const toFanDevice = (entity: Entity): FanDevice => ({
    id: entity.entity_id,
    name: entity.attributes.friendly_name ?? entity.entity_id,
    room: roomByEntityId.get(entity.entity_id) ?? null,
    on: entity.state === 'on',
    percentage: entity.attributes.percentage ?? null,
  });

  const toSensorReading = (entity: Entity): SensorReading => ({
    id: entity.entity_id,
    name: entity.attributes.friendly_name ?? entity.entity_id,
    value: entity.state === 'unknown' || entity.state === 'unavailable' ? null : Number(entity.state),
    unit: entity.attributes.unit_of_measurement ?? null,
  });

  const setInitialSnapshot = (entities: Entity[]) => {
    snapshot = {
      lights: entities.filter(entity => domainOf(entity.entity_id) === 'light').map(toLightDevice),
      cameras: entities.filter(entity => domainOf(entity.entity_id) === 'camera').map(toCameraDevice),
      fans: entities.filter(entity => domainOf(entity.entity_id) === 'fan').map(toFanDevice),
      sensors: entities.filter(entity => domainOf(entity.entity_id) === 'sensor').map(toSensorReading),
    };
  };

  const applyStateChange = (entity: Entity) => {
    switch (domainOf(entity.entity_id)) {
      case 'light':
        snapshot = { ...snapshot, lights: replaceOrAppend(snapshot.lights, toLightDevice(entity)) };
        break;
      case 'camera':
        snapshot = { ...snapshot, cameras: replaceOrAppend(snapshot.cameras, toCameraDevice(entity)) };
        break;
      case 'fan':
        snapshot = { ...snapshot, fans: replaceOrAppend(snapshot.fans, toFanDevice(entity)) };
        break;
      case 'sensor':
        snapshot = { ...snapshot, sensors: replaceOrAppend(snapshot.sensors, toSensorReading(entity)) };
        break;
      default:
        return;
    }
    emit();
  };

  async function connect(): Promise<DeviceSnapshot> {
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

    return new Promise<DeviceSnapshot>((resolve, reject) => {
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
        setInitialSnapshot(pending.states.filter(entity => allowedEntityIds.includes(entity.entity_id)));
        resolve(snapshot);
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
    subscribe(onSnapshot) {
      listeners.add(onSnapshot);
      return () => listeners.delete(onSnapshot);
    },
    toggleLight(id, on) {
      callService('light', on ? 'turn_on' : 'turn_off', { entity_id: id });
    },
    setLightBrightness(id, percent) {
      callService('light', 'turn_on', { entity_id: id, brightness_pct: Math.round(percent) });
    },
    toggleFan(id, on) {
      callService('fan', on ? 'turn_on' : 'turn_off', { entity_id: id });
    },
    setFanPercentage(id, percent) {
      callService('fan', 'set_percentage', { entity_id: id, percentage: Math.round(percent) });
    },
  };
}
