import { EmergencyScreen } from '../screens/emergency-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Emergency() {
  const onNavigate = useScreenNavigate('emergency');
  return <ScreenSurface screen="emergency" renderContent={() => <EmergencyScreen onNavigate={onNavigate}/>}/>;
}
