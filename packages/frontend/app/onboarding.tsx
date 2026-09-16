import { ClassicHeader } from '../components/headers';
import { HomeSetupFlow } from '../components/home-setup';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Onboarding() {
  const onNavigate = useScreenNavigate('onboarding');
  return <ScreenSurface screen="onboarding" onNavigate={onNavigate}
    header={<ClassicHeader title="Willo" onNavigate={onNavigate}/>}
    renderContent={header => <HomeSetupFlow header={header}/>}/>;
}
