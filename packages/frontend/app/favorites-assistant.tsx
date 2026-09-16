import { FavoritesScreen } from '../screens/favorites-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function FavoritesAssistant() {
  const onNavigate = useScreenNavigate('favorites-assistant');
  return <ScreenSurface screen="favorites-assistant" renderContent={() => <FavoritesScreen withAssistant onNavigate={onNavigate}/>}/>;
}
