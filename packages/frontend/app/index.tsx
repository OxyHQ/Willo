import { useCallback, useEffect, useState } from 'react';
import LoginView from '../LoginView';
import EntitiesView from '../EntitiesView';
import connect from '../connect';
import * as storage from '../storage';
import type { Entity, HomeAssistantConfig, ProviderControls } from '../types';

// Prevents a duplicate Home Assistant connection from Effects running twice
// in StrictMode.
let hasInitialized = false;

export default function Index() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [unauthenticated, setUnauthenticated] = useState<boolean | null>(null);
  const [locationName, setLocationName] = useState('My home');
  const [controls, setControls] = useState<ProviderControls | null>(null);

  const getEntities = useCallback((newEntities: Entity[]) => setEntities(newEntities), []);

  const getUpdatedState = useCallback((entity: Entity) => {
    setEntities(prev =>
      prev.map(e => (e.entity_id !== entity.entity_id ? e : entity))
    );
  }, []);

  const getConfig = useCallback((config: HomeAssistantConfig) => {
    setLocationName(config.location_name);
  }, []);

  const onRefreshToken = useCallback((refreshToken: string) => {
    storage.setItemAsync('refreshToken', refreshToken);
    storage.deleteItemAsync('authCode');
  }, []);

  const onAuthSucceeded = useCallback(
    async ({ instanceUrl }: { instanceUrl: string }) => {
      const authCode = await storage.getItemAsync('authCode');
      const clientId = await storage.getItemAsync('clientId');
      if (!clientId) return;

      const providerControls = await connect({
        instanceUrl,
        authCode,
        clientId,
        onRefreshToken,
        getEntities,
        getUpdatedState,
        getConfig,
      });
      setControls(providerControls);
    },
    [onRefreshToken, getEntities, getUpdatedState, getConfig]
  );

  useEffect(() => {
    if (hasInitialized) return;
    hasInitialized = true;

    (async () => {
      const refreshToken = await storage.getItemAsync('refreshToken');
      const instanceUrl = await storage.getItemAsync('instanceUrl');
      const clientId = await storage.getItemAsync('clientId');
      if (!refreshToken || !instanceUrl || !clientId) {
        setUnauthenticated(true);
        return;
      }

      const providerControls = await connect({
        refreshToken,
        instanceUrl,
        clientId,
        onRefreshToken,
        getEntities,
        getUpdatedState,
        getConfig,
      });
      setControls(providerControls);
    })();
  }, [onRefreshToken, getEntities, getUpdatedState, getConfig]);

  if (unauthenticated === true || !entities.length || !controls) {
    return <LoginView onAuthSucceeded={onAuthSucceeded} />;
  }

  return (
    <EntitiesView locationName={locationName} entities={entities} controls={controls} />
  );
}
