import { TimelineScreen } from '../screens/activity-screen';
import { ScreenSurface } from '../components/screen-surface';

export default function Timeline() {
  return <ScreenSurface screen="timeline" renderContent={() => <TimelineScreen/>}/>;
}
