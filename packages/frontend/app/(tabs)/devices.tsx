import { useTranslation } from 'react-i18next';
import { ClassicHeader } from '../../components/headers';
import { DevicesScreen } from '../../screens/devices-screen';
import { ScreenSurface } from '../../components/screen-surface';
import { useScreenNavigate } from '../../screens/use-screen-navigate';

export default function Devices() {
  const onNavigate = useScreenNavigate('devices');
  const { t } = useTranslation();
  return <ScreenSurface screen="devices" onNavigate={onNavigate}
    header={<ClassicHeader title={t('nav.devices')} onNavigate={onNavigate}/>}
    renderContent={() => <DevicesScreen onNavigate={onNavigate}/>}/>;
}
