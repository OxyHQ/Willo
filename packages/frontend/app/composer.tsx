import { ComposerScreen } from '../screens/composer-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Composer() {
  const onNavigate = useScreenNavigate('composer');
  return <ScreenSurface screen="composer" renderContent={() => <ComposerScreen onNavigate={onNavigate}/>}/>;
}
