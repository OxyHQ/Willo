import { useAuth } from '@oxy.so/services';
import LoginView from '../LoginView';
import { RoutedScreen } from '../screens/RoutedScreen';
import { useHome } from '../state/home-context';

export default function Index() {
  const { unauthenticated, login } = useHome();
  const { isAuthenticated, isAuthResolved } = useAuth();

  // The Home Assistant instance gate only matters once there's an Oxy
  // identity to gate FOR — signed out (or still resolving), `RoutedScreen`
  // (via `ScreenSurface`) shows the Oxy sign-in prompt itself instead,
  // properly wrapped in the same `ContentPanel` every other screen gets.
  if (isAuthResolved && isAuthenticated && unauthenticated !== false) {
    return <LoginView onAuthSucceeded={login} />;
  }

  return <RoutedScreen screen="home" />;
}
