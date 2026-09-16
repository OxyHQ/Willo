import { useRouter } from 'expo-router';
import { noTabScreens, type Navigate, type ScreenId } from '../data/screens';
import { SCREEN_ROUTES } from '../data/screen-routes';

/**
 * Shared by every route in `app/` AND `app/_layout.tsx`'s persistent chrome
 * (the nav rail / bottom nav), which needs an identically-behaving
 * `onNavigate` for the SAME current screen without going through a route
 * file's own props — see `screenForPathname`.
 *
 * It lives in its own file rather than beside a screen so that importing it
 * pulls in nothing else: the shell would otherwise drag a screen's whole
 * component graph into the first bundle.
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
