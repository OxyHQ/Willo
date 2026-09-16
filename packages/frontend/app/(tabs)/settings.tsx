import { SettingsScreen } from '../../screens/settings-screen';
import { ScreenSurface } from '../../components/screen-surface';
import { useScreenNavigate } from '../../screens/use-screen-navigate';

export default function Settings() {
  const onNavigate = useScreenNavigate('settings');
  return <ScreenSurface screen="settings" renderContent={() => <SettingsScreen onNavigate={onNavigate}/>}/>;
}
