import { AssistantScreen } from '../screens/assistant-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Assistant() {
  const onNavigate = useScreenNavigate('assistant');
  return <ScreenSurface screen="assistant" renderContent={() => <AssistantScreen onNavigate={onNavigate}/>}/>;
}
