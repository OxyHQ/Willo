import { RoutinesScreen } from '../screens/automations-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Routines() {
  const onNavigate = useScreenNavigate('routines');
  return <ScreenSurface screen="routines" renderContent={() => <RoutinesScreen onNavigate={onNavigate}/>}/>;
}
