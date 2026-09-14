import { useRouter } from 'expo-router';
import { ScreenSurface } from '../components/screen-surface';
import { noTabScreens, type Navigate, type ScreenId } from '../data/screens';
import { SCREEN_ROUTES } from '../data/screen-routes';

/**
 * Shared by the per-route content (below) AND `app/_layout.tsx`'s persistent
 * chrome (the nav rail / bottom nav), which needs an identically-behaving
 * `onNavigate` for the SAME current screen without going through a route
 * file's own props — see `screenForPathname`.
 */
export function useScreenNavigate(screen: ScreenId): Navigate {
  const router = useRouter();
  return next => {
    if (next === 'gallery' || next === screen) return;
    const destination = SCREEN_ROUTES[next];
    if (noTabScreens.includes(next)) router.push(destination);
    else router.navigate(destination);
  };
}

export function RoutedScreen({ screen }: { screen: ScreenId }) {
  const onNavigate = useScreenNavigate(screen);
  return <ScreenSurface screen={screen} onNavigate={onNavigate} />;
}
