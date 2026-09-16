import { HomeSetupFlow } from '../components/home-setup';
import { ScreenSurface } from '../components/screen-surface';

export default function Onboarding() {
  return <ScreenSurface screen="onboarding" renderContent={() => <HomeSetupFlow/>}/>;
}
