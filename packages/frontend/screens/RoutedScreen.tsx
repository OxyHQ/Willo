import { useRouter } from 'expo-router';
import { ScreenSurface } from '../components/screen-surface';
import type { ScreenId } from '../data/screens';

export function RoutedScreen({ screen }: { screen: ScreenId }) {
  const router = useRouter();
  return (
    <ScreenSurface
      screen={screen}
      onNavigate={next => {
        if (next === 'gallery') return;
        router.push(`/${next}`);
      }}
    />
  );
}
