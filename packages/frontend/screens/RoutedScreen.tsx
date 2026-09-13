import { useRouter } from 'expo-router';
import { ScreenSurface } from '../components/screen-surface';
import { noTabScreens, type ScreenId } from '../data/screens';
import { SCREEN_ROUTES } from '../data/screen-routes';

export function RoutedScreen({ screen }: { screen: ScreenId }) {
  const router = useRouter();
  return (
    <ScreenSurface
      screen={screen}
      onNavigate={next => {
        if (next === 'gallery' || next === screen) return;
        const destination = SCREEN_ROUTES[next];
        if (noTabScreens.includes(next)) router.push(destination);
        else router.navigate(destination);
      }}
    />
  );
}
