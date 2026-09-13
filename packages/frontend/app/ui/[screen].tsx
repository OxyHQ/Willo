import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityScreen } from '../../components/home-ui/ActivityScreen';
import { AssistantScreen } from '../../components/home-ui/AssistantScreen';
import { AutomationEditorScreen } from '../../components/home-ui/AutomationEditorScreen';
import { AutomationsScreen } from '../../components/home-ui/AutomationsScreen';
import { DevicesScreen } from '../../components/home-ui/DevicesScreen';
import { EmergencyScreen } from '../../components/home-ui/EmergencyScreen';
import { HomeScreen } from '../../components/home-ui/HomeScreen';
import { SettingsScreen } from '../../components/home-ui/SettingsScreen';
import { PREVIEW_SCREENS } from '../../components/home-ui/fixtures';
import { BottomBar, Icon } from '../../components/home-ui/Primitives';
import type { Navigate, ScreenId } from '../../components/home-ui/types';

function PreviewContent({ screen, onNavigate }: { screen: ScreenId; onNavigate: Navigate }) {
  switch (screen) {
    case 'home': return <HomeScreen onNavigate={onNavigate} />;
    case 'favorites': return <HomeScreen classic onNavigate={onNavigate} />;
    case 'devices': return <DevicesScreen onNavigate={onNavigate} />;
    case 'activity': return <ActivityScreen onNavigate={onNavigate} />;
    case 'activity-classic': return <ActivityScreen classic onNavigate={onNavigate} />;
    case 'automations': return <AutomationsScreen onNavigate={onNavigate} />;
    case 'routines': return <AutomationsScreen classic onNavigate={onNavigate} />;
    case 'settings': return <SettingsScreen onNavigate={onNavigate} />;
    case 'ask': return <AssistantScreen onNavigate={onNavigate} />;
    case 'emergency': return <EmergencyScreen onNavigate={onNavigate} />;
    case 'create-automation': return <AutomationEditorScreen onNavigate={onNavigate} />;
  }
}

export default function UiPreviewScreen() {
  const { screen: screenParam } = useLocalSearchParams<{ screen: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const screen = PREVIEW_SCREENS.find((item) => item.id === screenParam)?.id;
  const handleNavigate: Navigate = (destination, replace = false) => {
    const route = { pathname: '/ui/[screen]' as const, params: { screen: destination } };
    if (replace) router.replace(route);
    else router.push(route);
  };
  return <View className="flex-1 bg-willo-surface" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
    <StatusBar barStyle="dark-content" />
    <View className="w-full max-w-[480px] flex-1 self-center bg-white">
      <View className="min-h-[44px] flex-row items-center justify-between gap-3 bg-willo-surface px-4">
        <Text className="text-[10px] text-willo-secondary">UI preview · Sample home</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to all interface previews" onPress={() => router.replace('/ui')}
          className="min-h-[44px] flex-row items-center gap-1 px-2">
          <Icon name="apps-outline" size={13} color="#005478" /><Text className="text-[10px] font-medium text-willo-on-sky">All screens</Text>
        </Pressable>
      </View>
      {screen ? <>
        <PreviewContent key={screen} screen={screen} onNavigate={handleNavigate} />
        {!['ask', 'emergency', 'create-automation'].includes(screen) && <BottomBar screen={screen} onNavigate={handleNavigate} />}
      </> : <View className="flex-1 items-center justify-center gap-3 p-8">
        <Text accessibilityRole="header" className="text-xl text-willo-ink">Preview not found</Text>
        <Text className="text-center text-sm leading-6 text-willo-secondary">Choose a screen from the preview gallery above.</Text>
      </View>}
    </View>
  </View>;
}
