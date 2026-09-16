import { AssistantScreen } from '../screens/assistant-screen';
import { ScreenSurface } from '../components/screen-surface';

export default function Assistant() {
  return <ScreenSurface screen="assistant" renderContent={() => <AssistantScreen/>}/>;
}
