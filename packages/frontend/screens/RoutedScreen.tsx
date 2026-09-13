import { useRouter } from 'expo-router';
import { ScreenSurface } from '../components/screen-surface';
import { noTabScreens, type ScreenId } from '../data/screens';
import { SCREEN_ROUTES } from '../data/screen-routes';
import type { HouseholdSection } from '../household/model';

export function RoutedScreen({ screen, householdSection }: { screen: ScreenId; householdSection?: HouseholdSection }) {
  const router = useRouter();
  return (
    <ScreenSurface
      screen={screen}
      householdSection={householdSection}
      onNavigate={next => {
        if (next === 'gallery' || (next === screen && !householdSection)) return;
        const destination = SCREEN_ROUTES[next];
        if (noTabScreens.includes(next)) router.push(destination);
        else router.navigate(destination);
      }}
    />
  );
}
