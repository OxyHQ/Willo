import { useTranslation } from 'react-i18next';
import { ClassicHeader } from '../components/headers';
import { SettingsScreen } from '../screens/settings-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Settings() {
  const onNavigate = useScreenNavigate('settings');
  const { t } = useTranslation();
  return <ScreenSurface screen="settings" onNavigate={onNavigate}
    header={<ClassicHeader title={t('nav.settings')} onNavigate={onNavigate}/>}
    renderContent={header => <SettingsScreen onNavigate={onNavigate} header={header}/>}/>;
}
