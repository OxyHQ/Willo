import React, { useEffect } from 'react';
import { BackHandler, View } from 'react-native';
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
import { Overlays } from './overlays';
import { Icon, Label } from '@willo/ui';
export function ScreenSurface({ screen, onNavigate, preview = false }: { screen: ScreenId; onNavigate: Navigate; preview?: boolean }) {
  const insets = useSafeAreaInsets();
  const modern = modernScreens.includes(screen);
  const hasTabs = !noTabScreens.includes(screen);
  useEffect(() => {
    if (hasTabs) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onNavigate(screen === 'composer' ? 'automations' : 'home');
      return true;
    });
    return () => subscription.remove();
  }, [hasTabs, onNavigate, screen]);
  const mockSystemChrome = preview || process.env.EXPO_OS === 'web';
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
  }
  const tinted = modern && hasTabs;
  return <View className="relative flex-1 overflow-hidden bg-white">
    {mockSystemChrome ? <View className={`relative flex-row items-center justify-between px-6 ${modern ? 'h-[42px]' : 'h-[31px]'} ${tinted ? 'bg-home-surface' : 'bg-white'}`}><Label className={`${modern ? 'text-[12px] font-semibold' : 'text-[10px]'}`}>9:30</Label>{modern && <View className="absolute left-1/2 top-[11px] -ml-2 h-[17px] w-[17px] rounded-full bg-black"/>}<View className="flex-row items-center gap-1"><Icon name="signal" size={14}/><Icon name="wifi" size={13}/><Icon name="battery" size={16}/></View></View> : <View style={{ height: insets.top }} className={tinted ? 'bg-home-surface' : 'bg-white'}/>}
    {content}
    {hasTabs ? <BottomNav screen={screen} modern={modern} onNavigate={onNavigate} preview={preview}/> : mockSystemChrome ? <View className="items-center bg-white pb-2 pt-1"><View className="h-[3px] w-[95px] rounded-full bg-home-ink"/></View> : <View style={{ height: insets.bottom }}/>}<Overlays/>
  </View>;
}
