import { ClassicHeader } from '../components/headers';
import { FavoritesScreen } from '../screens/favorites-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useHome } from '../state/home-context';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function FavoritesAssistant() {
  const onNavigate = useScreenNavigate('favorites-assistant');
  const { homeName } = useHome();
  return <ScreenSurface screen="favorites-assistant" onNavigate={onNavigate}
    header={<ClassicHeader title={homeName} home onNavigate={onNavigate}/>}
    renderContent={() => <FavoritesScreen withAssistant onNavigate={onNavigate}/>}/>;
}
