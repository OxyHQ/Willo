import { TimelineScreen } from '../screens/activity-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Timeline() {
  const onNavigate = useScreenNavigate('timeline');
  return <ScreenSurface screen="timeline" renderContent={() => <TimelineScreen onNavigate={onNavigate}/>}/>;
}
