import type React from 'react';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '@oxy.so/services/ui/client';
import { SignInPrompt } from './sign-in-prompt';
import { useHome } from '../state/home-context';
import type { ScreenId } from '../data/screens';
import { Screen } from '@oxy.so/bloom/screen';
import { useTheme } from '@oxy.so/bloom/theme';
import { screenForPathname } from '../data/screen-routes';

/** Routes own their auth/setup policy; AppShell owns their shared surface. */
export function ScreenSurface({
  screen,
  renderContent,
  renderSetupPrompt,
}: {
  screen: ScreenId;
  renderContent: () => React.ReactNode;
  /** Shown instead of the screen when this Home isn't set up yet. Only the screens that have something to say about setup pass one; the rest get a spinner. */
  renderSetupPrompt?: () => React.ReactNode;
}) {
  const { colors } = useTheme();
  const { isAuthenticated, isAuthResolved } = useAuth();
  const { setupStage, demoMode } = useHome();
  const router = useRouter();
  const active = screenForPathname(usePathname()) === screen;
  // Setup lives at its own `/onboarding` route (`app/onboarding.tsx`), not a
  // modal over whatever the user happened to be on — landing there straight
  // after sign-in is a normal navigation, not an interruption. `home` and
  // `settings` are the two exceptions that never redirect: home shows
  // `HomeSetupPrompt` inline instead (see that component's doc comment), and
  // settings has to stay reachable pre-setup or there would be no way to
  // reach its Demo mode toggle — the one thing a Home with nothing set up
  // yet can still turn on. Demo mode is a THIRD, broader exception: every
  // screen already knows how to render its own mock catalog without a real
  // Home (see `useHome()`'s `demoMode` doc comment), so nothing needs to
  // redirect anywhere while it's on. Once setup finishes, a Home sitting on
  // `/onboarding` itself gets sent back to `/`.
  useEffect(() => {
    if (!isAuthResolved || !isAuthenticated || setupStage === 'resolving') return;
    if (setupStage === 'ready') {
      if (screen === 'onboarding') router.replace('/');
      return;
    }
    if (demoMode) return;
    if (screen !== 'home' && screen !== 'onboarding' && screen !== 'settings')
      router.replace('/onboarding');
  }, [isAuthResolved, isAuthenticated, setupStage, demoMode, screen, router]);
  let content: React.ReactNode = renderContent();

  // Auth and setup replace only route content. The shell's panel, header and
  // navigation remain mounted while the account resolves or setup changes.
  const spinner = (
    <View className="min-h-0 min-w-0 flex-1 items-center justify-center">
      <ActivityIndicator color={colors.primary} />
    </View>
  );
  const awaitingSetup = !demoMode && setupStage !== 'ready' && setupStage !== 'resolving';
  if (!isAuthResolved) {
    content = spinner;
  } else if (!isAuthenticated) {
    content = <SignInPrompt />;
  } else if (awaitingSetup && renderSetupPrompt) {
    content = renderSetupPrompt();
  } else if (awaitingSetup && screen !== 'onboarding' && screen !== 'settings') {
    content = spinner;
  }

  return (
    <Screen scroll="content" documentScroll active={active} contentClearance={0}>
      {content}
    </Screen>
  );
}
