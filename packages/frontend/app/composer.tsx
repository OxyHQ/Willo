import { ComposerHeader, ComposerProvider, ComposerScreen } from '../screens/composer-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Composer() {
  const onNavigate = useScreenNavigate('composer');
  // Save lives in the header and the draft in the body, so the provider wraps both.
  return <ComposerProvider onNavigate={onNavigate}>
    <ScreenSurface screen="composer" onNavigate={onNavigate}
      header={<ComposerHeader onNavigate={onNavigate}/>}
      renderContent={() => <ComposerScreen onNavigate={onNavigate}/>}/>
  </ComposerProvider>;
}
