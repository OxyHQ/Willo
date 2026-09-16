import { TimelineFilterProvider, TimelineHeader, TimelineScreen } from '../screens/activity-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Timeline() {
  const onNavigate = useScreenNavigate('timeline');
  // The filter pill lives in the header and its state in the body, so the
  // provider wraps both.
  return <TimelineFilterProvider>
    <ScreenSurface screen="timeline" onNavigate={onNavigate}
      header={<TimelineHeader onNavigate={onNavigate}/>}
      renderContent={header => <TimelineScreen onNavigate={onNavigate} header={header}/>}/>
  </TimelineFilterProvider>;
}
