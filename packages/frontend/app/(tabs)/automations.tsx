import { AutomationsScreen } from '../../screens/automations-screen';
import { ScreenSurface } from '../../components/screen-surface';
import { useScreenNavigate } from '../../screens/use-screen-navigate';

export default function Automations() {
  const onNavigate = useScreenNavigate('automations');
  return <ScreenSurface screen="automations" renderContent={() => <AutomationsScreen onNavigate={onNavigate}/>}/>;
}
