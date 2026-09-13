import { Stack } from 'expo-router';

export default function UiPreviewLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
