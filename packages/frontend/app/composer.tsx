import { ComposerScreen } from '../screens/composer-screen';
import { ScreenSurface } from '../components/screen-surface';

export default function Composer() {
  return <ScreenSurface screen="composer" renderContent={() => <ComposerScreen/>}/>;
}
