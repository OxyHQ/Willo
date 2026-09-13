import { Redirect, useLocalSearchParams } from 'expo-router';
import { isHouseholdSection } from '../../household/model';
import { RoutedScreen } from '../../screens/RoutedScreen';

export default function HouseholdSectionRoute() {
  const { section } = useLocalSearchParams<{ section: string }>();
  if (!isHouseholdSection(section)) return <Redirect href="/household" />;
  return <RoutedScreen screen="household" householdSection={section} />;
}
