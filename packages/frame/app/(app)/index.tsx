import { View } from 'react-native';
import { Button } from '@oxy.so/bloom/button';
import { Text } from '@oxy.so/bloom/typography';
import { useOxy } from '@oxy.so/services/ui/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Frame } from '@willo.sh/shared-types';
import { useTranslation } from 'react-i18next';
import { FrameScene } from '../../components/frame-scene';
import { frameContent } from '../../lib/cards';
import { useHomeLive } from '../../lib/home-live';
import { useCurrentStory } from '../../lib/news';
import {
  useChooseHome,
  useFrameSession,
  useHeartbeat,
  willoClient,
  type HomeChoice,
} from '../../lib/willo';

/** A line of the frame's own copy over black, for the moments before the frame. */
function Notice({ text }: { text: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
      }}
    >
      <Text className="font-display" style={{ fontSize: 28, opacity: 0.7, textAlign: 'center' }}>
        {text}
      </Text>
    </View>
  );
}

/** Several Homes: the person picks the one this frame is in, with a remote or a finger. */
function ChooseHome({ homes }: { homes: HomeChoice[] }) {
  const { t } = useTranslation();
  const choose = useChooseHome(t('defaultName'));
  if (homes.length === 0) return <Notice text={t('chooseHome.none')} />;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 48,
      }}
    >
      <Text
        className="font-display"
        style={{ fontSize: 36, fontWeight: '700', textAlign: 'center' }}
      >
        {t('chooseHome.title')}
      </Text>
      <View style={{ gap: 12, minWidth: 280 }}>
        {homes.map((home, index) => (
          <Button
            key={home.id}
            size="lg"
            autoFocus={index === 0}
            disabled={choose.isPending}
            onPress={() => choose.mutate(home.id)}
          >
            {home.name ?? t('chooseHome.unnamed')}
          </Button>
        ))}
      </View>
    </View>
  );
}

function ShowingFrame({ frame }: { frame: Frame }) {
  const { i18n } = useTranslation();
  const { oxyServices, logout } = useOxy();
  const queryClient = useQueryClient();
  const live = useHomeLive({
    client: willoClient(oxyServices),
    homeId: frame.homeId,
    frameId: frame.id,
    queryClient,
    signOut: () => {
      void logout();
    },
  });
  useHeartbeat(frame.id);
  // The frame's chosen news languages, or its own language.
  const languages =
    frame.settings.newsLanguages.length > 0
      ? frame.settings.newsLanguages
      : [i18n.language.split('-')[0] ?? 'en'];
  const news = useCurrentStory(languages);
  const content = frameContent({
    devices: live.devices,
    room: frame.room,
    settings: frame.settings,
    news,
    gallery: null,
  });
  return (
    <FrameScene
      settings={frame.settings}
      content={content}
      photo={null}
      artwork={null}
      isOffline={!live.isOnline}
    />
  );
}

export default function FrameScreen() {
  const { t } = useTranslation();
  const session = useFrameSession(t('defaultName'));
  if (session.isPending) return <Notice text={t('registering')} />;
  if (session.isError) return <Notice text={t('loadFailed')} />;
  if (session.data.kind === 'choose-home') return <ChooseHome homes={session.data.homes} />;
  return <ShowingFrame frame={session.data.frame} />;
}
