import { useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';
import { ScreenSurface } from '../components/screen-surface';
import { SCREEN_ROUTES, type ScreenId } from '../data/screens';

export function RoutedScreen({ screen }: { screen: ScreenId }) {
  const router = useRouter();
  const handleNavigate = useCallback((next: ScreenId) => {
    if (next !== screen) router.navigate(SCREEN_ROUTES[next] satisfies Href);
  }, [router, screen]);
  return <ScreenSurface screen={screen} onNavigate={handleNavigate} />;
}
