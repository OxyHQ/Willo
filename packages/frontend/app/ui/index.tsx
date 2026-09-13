import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PREVIEW_SCREENS } from '../../components/home-ui/fixtures';
import { Icon } from '../../components/home-ui/Primitives';

export default function UiPreviewGallery() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return <View className="flex-1 bg-willo-faint" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
    <StatusBar barStyle="dark-content" />
    <ScrollView className="w-full max-w-[680px] flex-1 self-center" contentContainerClassName="p-6 pb-10" showsVerticalScrollIndicator={false}>
      <View className="mb-7 mt-5 gap-3">
        <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-willo-sky"><Icon name="home" color="#005478" size={28} /></View>
        <Text accessibilityRole="header" className="text-3xl font-semibold text-willo-ink">Willo</Text>
        <Text className="text-lg text-willo-secondary">Interface previews</Text>
        <Text className="max-w-[440px] text-sm leading-6 text-willo-secondary">Current and classic home layouts. Sample data only. No devices, accounts, cameras or services are connected by these screens.</Text>
      </View>
      <View className="gap-3">{PREVIEW_SCREENS.map((screen) => <Pressable key={screen.id}
        onPress={() => router.push({ pathname: '/ui/[screen]', params: { screen: screen.id } })}
        accessibilityRole="button" className="min-h-[96px] flex-row items-center gap-4 rounded-[24px] bg-white p-5 active:opacity-70">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-willo-surface"><Icon name={screen.icon} /></View>
        <View className="min-w-0 flex-1"><Text className="text-base font-medium text-willo-ink">{screen.title}</Text>
          <Text className="mt-1 text-xs leading-5 text-willo-secondary">{screen.description}</Text></View>
        <Icon name="chevron-forward" size={19} />
      </Pressable>)}</View>
    </ScrollView>
  </View>;
}
