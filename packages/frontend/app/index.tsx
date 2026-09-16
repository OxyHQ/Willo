import { AskHeader } from '../components/headers';
import { HomeSetupPrompt } from '../components/home-setup';
import { HomeScreen } from '../screens/home-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Index() {
  const onNavigate = useScreenNavigate('home');
  return <ScreenSurface screen="home" onNavigate={onNavigate}
    header={<AskHeader onNavigate={onNavigate}/>}
    renderContent={header => <HomeScreen onNavigate={onNavigate} header={header}/>}
    // Home says what's missing inline rather than bouncing to /onboarding — see `HomeSetupPrompt`.
    renderSetupPrompt={() => <HomeSetupPrompt onNavigate={onNavigate}/>}/>;
}
