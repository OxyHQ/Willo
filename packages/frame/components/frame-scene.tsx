/**
 * The frame: a photo filling the screen, the readings along the top (or the
 * alert panel when a door is open), the clock and the row of cards along the
 * bottom. Everything it shows comes in as props, so the signed-in frame and
 * the preview draw exactly the same scene.
 */

import { View, useWindowDimensions } from 'react-native';
import Animated, { SlideInUp } from 'react-native-reanimated';
import { AmbientPhoto } from '@oxy.so/bloom/ambient-photo';
import { useTheme } from '@oxy.so/bloom/theme';
import { Text } from '@oxy.so/bloom/typography';
import type { FrameSettings } from '@willo.sh/shared-types';
import { useTranslation } from 'react-i18next';
import type { FrameContent, StatusReading } from '../lib/cards';
import { useTick } from '../lib/use-tick';
import { AlertPanel, CardRow, type Artwork } from './frame-cards';
import { FrameIcon, StatusIcon } from './frame-icons';

/** How long each open-door panel stays before the next, when several are open. */
const ALERT_TURN_MS = 14_000;

export interface FrameSceneProps {
  settings: FrameSettings;
  content: FrameContent;
  /** The background photo showing now; `null` when the frame has none to show. */
  photo: string | null;
  /** Called as each photo starts to appear, so the theme can follow it. */
  onPhotoShown?: (uri: string) => void;
  /** The artwork of what is playing, when the screen has fetched it. */
  artwork: Artwork | null;
  isOffline: boolean;
}

function StatusRow({ status, vh, ink }: { status: StatusReading[]; vh: number; ink?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 2.2 * vh, alignItems: 'center' }}>
      {status.map((reading) => {
        const color = ink ?? (reading.isAlert ? colors.warning : colors.text);
        const text = { fontSize: 2.4 * vh, fontWeight: '400' as const, color };
        return (
          <View
            key={reading.icon}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 0.7 * vh }}
          >
            {reading.icon === 'co2' ? (
              <Text className="font-display" style={text}>
                {t('readings.co2')}
              </Text>
            ) : (
              <StatusIcon icon={reading.icon} size={2.9 * vh} color={color} />
            )}
            <Text className="font-display" style={text}>
              {`${reading.value}${reading.unit === '%' ? '%' : reading.unit === 'ppm' ? '' : '°'}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** The clock: re-renders once a minute, on the minute. */
function Clock({ vh, beside }: { vh: number; beside: boolean }) {
  const minute = useTick(60_000);
  const now = new Date(minute * 60_000);
  const two = (value: number) => (value < 10 ? '0' : '') + value;
  // With no cards the clock stays large and centred; with them, smaller and
  // aligned with the row.
  const size = (beside ? 10 : 15) * vh;
  return (
    <View style={{ paddingHorizontal: 3.5 * vh, alignItems: beside ? 'flex-start' : 'center' }}>
      <Text
        className="font-display"
        style={{
          fontSize: size,
          lineHeight: size * 0.95,
          // Bold: in the regular cut the time did not stand out over the photo.
          fontWeight: '700',
          letterSpacing: -0.02 * size,
          fontVariant: ['tabular-nums'],
        }}
      >
        {`${two(now.getHours())}:${two(now.getMinutes())}`}
      </Text>
    </View>
  );
}

export function FrameScene({
  settings,
  content,
  photo,
  onPhotoShown,
  artwork,
  isOffline,
}: FrameSceneProps) {
  const { t } = useTranslation();
  const window = useWindowDimensions();
  const turn = useTick(ALERT_TURN_MS);

  // A panel turned on its side draws upright (the window's height wide, its
  // width tall) and is rotated to fill the screen.
  const isUpright = settings.rotation === 90 || settings.rotation === 270;
  const width = isUpright ? window.height : window.width;
  const height = isUpright ? window.width : window.height;
  const vh = (height - settings.safeArea.top - settings.safeArea.bottom) / 100;
  const alert = content.alerts.length > 0 ? content.alerts[turn % content.alerts.length] : null;
  const hasRow = content.row.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#000', overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          width,
          height,
          left: (window.width - width) / 2,
          top: (window.height - height) / 2,
          transform: [{ rotate: `${settings.rotation}deg` }],
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: settings.safeArea.top,
            bottom: settings.safeArea.bottom,
            overflow: 'hidden',
          }}
        >
          <AmbientPhoto
            source={photo}
            fadeMs={2500}
            drift={settings.drift}
            onShown={onPhotoShown}
          />

          {photo === null ? (
            <View
              style={{
                position: 'absolute',
                inset: 0,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 8 * vh,
              }}
            >
              <Text
                className="font-display"
                style={{ fontSize: 3 * vh, opacity: 0.6, textAlign: 'center' }}
              >
                {t('noPhotos')}
              </Text>
            </View>
          ) : null}

          {settings.showClock || hasRow ? (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: '42%',
                backgroundImage:
                  'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 38%, rgba(0,0,0,0) 100%)',
              }}
            />
          ) : null}

          {alert ? (
            <Animated.View
              key={`${alert.deviceId}:${turn}`}
              entering={SlideInUp.duration(500)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
            >
              <AlertPanel
                alert={alert}
                vh={vh}
                status={(ink) => <StatusRow status={content.status} vh={vh} ink={ink} />}
              />
            </Animated.View>
          ) : (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                paddingTop: 2.4 * vh,
                paddingHorizontal: 3.5 * vh,
                paddingBottom: 4.5 * vh,
                backgroundImage:
                  'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 100%)',
              }}
            >
              <StatusRow status={content.status} vh={vh} />
            </View>
          )}

          <View
            style={{ position: 'absolute', left: 0, right: 0, bottom: 2.6 * vh, gap: 1.6 * vh }}
          >
            {settings.showClock ? <Clock vh={vh} beside={hasRow} /> : null}
            {hasRow ? <CardRow cards={content.row} artwork={artwork} vh={vh} /> : null}
          </View>

          {isOffline ? (
            <View
              accessibilityLabel={t('offline')}
              style={{ position: 'absolute', right: 3 * vh, bottom: 1.5 * vh, opacity: 0.5 }}
            >
              <FrameIcon name="offline" size={2.4 * vh} color="#ffffff" />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
