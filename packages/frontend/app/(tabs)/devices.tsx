import { DevicesScreen } from '../../screens/devices-screen';
import { ScreenSurface } from '../../components/screen-surface';
import { useScreenNavigate } from '../../screens/use-screen-navigate';

export default function Devices() {
  const onNavigate = useScreenNavigate('devices');
  return <ScreenSurface screen="devices" renderContent={() => <DevicesScreen onNavigate={onNavigate}/>}/>;
}
