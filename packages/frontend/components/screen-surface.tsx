import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Navigate, type ScreenId, modernScreens, noTabScreens } from '../data/screens';
import { ResponsiveProvider, useResponsiveLayout } from '../layout/responsive-context';
import { HomeScreen } from '../screens/home-screen';
import { FavoritesScreen } from '../screens/favorites-screen';
import { DevicesScreen } from '../screens/devices-screen';
import { AutomationsScreen, RoutinesScreen } from '../screens/automations-screen';
import { ActivityScreen, TimelineScreen } from '../screens/activity-screen';
import { SettingsScreen } from '../screens/settings-screen';
import { AssistantScreen } from '../screens/assistant-screen';
import { ComposerScreen } from '../screens/composer-screen';
import { EmergencyScreen } from '../screens/emergency-screen';
import { BottomNav } from './bottom-nav';
import { NavigationRail } from './navigation-rail';

type SurfaceProps = { screen: ScreenId; onNavigate: Navigate };

export function ScreenSurface(props: SurfaceProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="min-h-0 min-w-0 flex-1 bg-home-surface"
      style={{ paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }}>
      <ResponsiveProvider><ScreenBody {...props} /></ResponsiveProvider>
    </View>
  );
}

function ScreenBody({ screen, onNavigate }: SurfaceProps) {
  const { compact } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const isModern = modernScreens.includes(screen);
  const hasTabs = !noTabScreens.includes(screen);
  let content: ReactNode;
  switch (screen) {
    case 'home': content = <HomeScreen onNavigate={onNavigate} />; break;
    case 'favorites': content = <FavoritesScreen onNavigate={onNavigate} />; break;
    case 'favorites-assistant': content = <FavoritesScreen withAssistant onNavigate={onNavigate} />; break;
    case 'devices': content = <DevicesScreen onNavigate={onNavigate} />; break;
    case 'activity': content = <ActivityScreen onNavigate={onNavigate} />; break;
    case 'timeline': content = <TimelineScreen onNavigate={onNavigate} />; break;
    case 'automations': content = <AutomationsScreen onNavigate={onNavigate} />; break;
    case 'routines': content = <RoutinesScreen onNavigate={onNavigate} />; break;
    case 'settings': content = <SettingsScreen onNavigate={onNavigate} />; break;
    case 'assistant': content = <AssistantScreen onNavigate={onNavigate} />; break;
    case 'composer': content = <ComposerScreen onNavigate={onNavigate} />; break;
    case 'emergency': content = <EmergencyScreen onNavigate={onNavigate} />; break;
  }
  // Content stays in the same parent at every width, preserving local state and focus.
  return <View testID="screen-surface" className="min-h-0 min-w-0 flex-1 overflow-hidden bg-home-surface">
    <View className="min-h-0 min-w-0 flex-1 flex-row">
      {!compact && <NavigationRail screen={screen} modern={isModern} onNavigate={onNavigate} />}
      <View className="min-h-0 min-w-0 flex-1">{content}</View>
    </View>
    {compact && hasTabs
      ? <BottomNav screen={screen} modern={isModern} onNavigate={onNavigate} />
      : <View style={{ height: insets.bottom }} />}
  </View>;
}
