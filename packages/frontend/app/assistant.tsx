import { AssistantHeader, AssistantScreen } from '../screens/assistant-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Assistant() {
  const onNavigate = useScreenNavigate('assistant');
  return <ScreenSurface screen="assistant" onNavigate={onNavigate}
    header={<AssistantHeader onNavigate={onNavigate}/>}
    renderContent={() => <AssistantScreen onNavigate={onNavigate}/>}/>;
}
