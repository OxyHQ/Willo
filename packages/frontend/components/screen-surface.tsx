import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Navigate, type ScreenId, modernScreens, noTabScreens } from '../data/screens';
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
import { Icon } from '@willo/ui';
import { Label } from '@willo/ui';
import { ResponsiveProvider, useResponsiveLayout } from '../layout/responsive-context';
import { NavigationRail } from './navigation-rail';
import { HouseholdScreen } from '../household/household-screen';
import type { HouseholdSection } from '../household/model';
type SurfaceProps = { screen: ScreenId; onNavigate: Navigate; preview?: boolean; householdSection?: HouseholdSection };
export function ScreenSurface(props: SurfaceProps) {
  const insets = useSafeAreaInsets();
  return <View className="min-h-0 min-w-0 flex-1 bg-home-surface" style={{ paddingLeft: props.preview ? 0 : insets.left, paddingRight: props.preview ? 0 : insets.right }}>
    <ResponsiveProvider preview={props.preview}><ScreenBody {...props}/></ResponsiveProvider>
  </View>;
}
function ScreenBody({ screen, onNavigate, preview = false, householdSection }: SurfaceProps) {
  const insets = useSafeAreaInsets();
  const { compact } = useResponsiveLayout();
  const modern = modernScreens.includes(screen);
  const hasTabs = !noTabScreens.includes(screen);
  let content: React.ReactNode;
  switch (screen) {
    case 'home': content = <HomeScreen onNavigate={onNavigate}/>; break;
    case 'favorites': content = <FavoritesScreen onNavigate={onNavigate}/>; break;
    case 'favorites-assistant': content = <FavoritesScreen withAssistant onNavigate={onNavigate}/>; break;
    case 'devices': content = <DevicesScreen onNavigate={onNavigate}/>; break;
    case 'activity': content = <ActivityScreen onNavigate={onNavigate}/>; break;
    case 'timeline': content = <TimelineScreen onNavigate={onNavigate}/>; break;
    case 'automations': content = <AutomationsScreen onNavigate={onNavigate}/>; break;
    case 'routines': content = <RoutinesScreen onNavigate={onNavigate}/>; break;
    case 'settings': content = <SettingsScreen onNavigate={onNavigate}/>; break;
    case 'assistant': content = <AssistantScreen onNavigate={onNavigate}/>; break;
    case 'composer': content = <ComposerScreen onNavigate={onNavigate}/>; break;
    case 'emergency': content = <EmergencyScreen onNavigate={onNavigate}/>; break;
    case 'household': content = <HouseholdScreen section={householdSection}/>; break;
  }

  const tinted = modern && hasTabs;
  // System bars are only simulated in explicit gallery previews, never in the web app.
  const mockSystemChrome = preview && compact;
  return <View testID="screen-surface" className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-home-surface">
    {mockSystemChrome ? <View className={`relative flex-row items-center justify-between px-6 ${modern ? 'h-[42px]' : 'h-[31px]'} ${tinted ? 'bg-home-surface' : 'bg-white'}`}>
      <Label className="text-[12px] font-semibold">9:30</Label>
      {modern && <View className="absolute left-1/2 top-[11px] -ml-2 h-[17px] w-[17px] rounded-full bg-black"/>}
      <View className="flex-row items-center gap-1"><Icon name="signal" size={14}/><Icon name="wifi" size={13}/><Icon name="battery" size={16}/></View>
    </View> : <View style={{ height: preview ? 0 : insets.top }}/>}
    <View className="min-h-0 min-w-0 flex-1 flex-row">
      {!compact && <NavigationRail screen={screen} modern={modern} onNavigate={onNavigate}/>}
      <View className="min-h-0 min-w-0 flex-1">{content}</View>
    </View>
    {compact && hasTabs ? <BottomNav screen={screen} modern={modern} onNavigate={onNavigate} preview={preview}/>
      : mockSystemChrome ? <View className="items-center bg-white pb-2 pt-1"><View className="h-[3px] w-[95px] rounded-full bg-home-ink"/></View>
      : <View style={{ height: preview ? 0 : insets.bottom }}/>}
  </View>;
}
