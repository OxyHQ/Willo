import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useHomeActions } from '../state/home-context';

/** Owns one browser/native image resource outside React render. */
function cameraImageResource(blob: Blob | undefined) {
  let uri: string | undefined;
  return {
    snapshot: () => uri,
    subscribe: (changed: () => void) => {
      if (!blob) return () => {};
      if (Platform.OS === 'web') {
        const objectUrl = URL.createObjectURL(blob);
        uri = objectUrl;
        changed();
        return () => {
          uri = undefined;
          URL.revokeObjectURL(objectUrl);
        };
      }
      const reader = new FileReader();
      let current = true;
      reader.onload = () => {
        if (current && typeof reader.result === 'string') {
          uri = reader.result;
          changed();
        }
      };
      reader.onerror = () => console.error('Could not render the camera snapshot');
      reader.readAsDataURL(blob);
      return () => {
        current = false;
        uri = undefined;
        reader.abort();
      };
    },
  };
}

/** Private snapshots never pass a bearer to Image or survive their owning view/session. */
export function useCameraSnapshot(
  url: string | null | undefined,
  refreshKey = 0,
): string | undefined {
  const { fetchSnapshot, sessionEpoch } = useHomeActions();
  const query = useQuery({
    queryKey: ['willo-camera', sessionEpoch, url, refreshKey],
    queryFn: ({ signal }) => {
      if (!url) throw new Error('Camera URL is missing');
      return fetchSnapshot(url, signal);
    },
    enabled: Boolean(url),
    gcTime: 0,
    retry: false,
    meta: { persist: false },
  });
  const image = useMemo(() => cameraImageResource(query.data), [query.data]);
  const uri = useSyncExternalStore(image.subscribe, image.snapshot, () => undefined);
  useEffect(() => {
    if (query.error) console.error('Could not load the camera snapshot:', query.error);
  }, [query.error]);
  return url ? uri : undefined;
}
