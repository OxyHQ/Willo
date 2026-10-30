import { FramesScreen } from '../screens/frames-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Frames() {
  const onNavigate = useScreenNavigate('frames');
  return (
    <ScreenSurface screen="frames" renderContent={() => <FramesScreen onNavigate={onNavigate} />} />
  );
}
