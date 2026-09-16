import { useTranslation } from 'react-i18next';
import { ClassicHeader } from '../components/headers';
import { RoutinesScreen } from '../screens/automations-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Routines() {
  const onNavigate = useScreenNavigate('routines');
  const { t } = useTranslation();
  return <ScreenSurface screen="routines" onNavigate={onNavigate}
    header={<ClassicHeader title={t('nav.automations')} onNavigate={onNavigate}/>}
    renderContent={header => <RoutinesScreen onNavigate={onNavigate} header={header}/>}/>;
}
