import { FavoritesScreen } from '../screens/favorites-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Favorites() {
  const onNavigate = useScreenNavigate('favorites');
  return <ScreenSurface screen="favorites" renderContent={() => <FavoritesScreen onNavigate={onNavigate}/>}/>;
}
