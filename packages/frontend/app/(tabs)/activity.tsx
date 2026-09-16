import { AskHeader } from '../../components/headers';
import { ActivityScreen } from '../../screens/activity-screen';
import { ScreenSurface } from '../../components/screen-surface';
import { useScreenNavigate } from '../../screens/use-screen-navigate';

export default function Activity() {
  const onNavigate = useScreenNavigate('activity');
  return <ScreenSurface screen="activity" onNavigate={onNavigate}
    header={<AskHeader onNavigate={onNavigate}/>}
    renderContent={() => <ActivityScreen onNavigate={onNavigate}/>}/>;
}
