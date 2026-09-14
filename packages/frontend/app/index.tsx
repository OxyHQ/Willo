import LoginView from '../LoginView';
import { RoutedScreen } from '../screens/RoutedScreen';
import { useHome } from '../state/home-context';

export default function Index() {
  const { unauthenticated, login } = useHome();

  if (unauthenticated !== false) {
    return <LoginView onAuthSucceeded={login} />;
  }

  return <RoutedScreen screen="home" />;
}
