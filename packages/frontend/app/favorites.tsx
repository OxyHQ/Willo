import { ClassicHeader } from '../components/headers';
import { FavoritesScreen } from '../screens/favorites-screen';
import { ScreenSurface } from '../components/screen-surface';
import { useHome } from '../state/home-context';
import { useScreenNavigate } from '../screens/use-screen-navigate';

export default function Favorites() {
  const onNavigate = useScreenNavigate('favorites');
  const { homeName } = useHome();
  return <ScreenSurface screen="favorites" onNavigate={onNavigate}
    header={<ClassicHeader title={homeName} home notifications onNavigate={onNavigate}/>}
    renderContent={header => <FavoritesScreen onNavigate={onNavigate} header={header}/>}/>;
}
