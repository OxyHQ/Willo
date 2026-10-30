/**
 * The frame's cards, with Bloom's own pieces. `lib/cards.ts` decides which
 * there are and what they say; this only draws them. Every size is a share of
 * the scene's height (`vh`), so the frame looks the same on a phone, a TV and
 * a Chromecast.
 */

import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { resolveBloomColors } from '@oxy.so/bloom/appearance';
import { Card, CardDescription, CardTitle } from '@oxy.so/bloom/card';
import { AmbientPhoto } from '@oxy.so/bloom/ambient-photo';
import * as Shapes from '@oxy.so/bloom/shapes';
import { BloomSeedScope, useTheme } from '@oxy.so/bloom/theme';
import { Text } from '@oxy.so/bloom/typography';
import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';
import type {
  Co2Card,
  GalleryCard,
  MusicCard,
  NewsCard,
  OpeningAlert,
  RowCard,
  WeatherCard,
} from '../lib/cards';
import { FrameIcon, WeatherIcon, type OtherIconName } from './frame-icons';

/** Height of every card in the row, in vh. */
const CARD_HEIGHT = 20;

/** Artwork the screen fetched for a music card, with its seed colours. */
export interface Artwork {
  uri: string;
  seeds: string[];
}

function Label({ text, vh }: { text: string | null | undefined; vh: number }) {
  if (!text) return null;
  return (
    <CardDescription
      numberOfLines={1}
      className="font-display"
      style={{ fontSize: 2 * vh, lineHeight: 2.6 * vh }}
    >
      {text}
    </CardDescription>
  );
}

function Main({
  text,
  vh,
  size = 2.9,
  lines = 2,
}: {
  text: string;
  vh: number;
  size?: number;
  lines?: number;
}) {
  return (
    <CardTitle
      numberOfLines={lines}
      className="font-display"
      style={{ fontSize: size * vh, lineHeight: size * 1.2 * vh, fontWeight: '400' }}
    >
      {text}
    </CardTitle>
  );
}

/**
 * A row card in the theme's primary container (tone `accent`, appearance
 * `subtle`), or red for an alert (tone `danger`).
 */
function Capsule({
  vh,
  isAlert = false,
  children,
}: {
  vh: number;
  isAlert?: boolean;
  children: ReactNode;
}) {
  return (
    <Card
      tone={isAlert ? 'danger' : 'accent'}
      appearance={isAlert ? 'solid' : 'subtle'}
      radius="radius-28"
      style={{
        height: CARD_HEIGHT * vh,
        maxWidth: 52 * vh,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1.8 * vh,
        paddingHorizontal: 2.4 * vh,
      }}
    >
      {children}
    </Card>
  );
}

/**
 * A card with a picture (what is playing, a news story): the picture in
 * Bloom's squircle, and the card in its own scheme seeded from the picture,
 * so it always has colour even when the picture is nearly grey.
 */
function WithPicture({
  vh,
  picture,
  seeds,
  fallbackIcon,
  label,
  main,
  isMusic,
}: {
  vh: number;
  picture: string | null;
  seeds: string[];
  fallbackIcon: OtherIconName;
  label: string | null;
  main: string;
  isMusic: boolean;
}) {
  const side = Math.round(15 * vh);
  const [seed, secondarySeed, tertiarySeed] = seeds;
  return (
    <BloomSeedScope seed={seed} secondarySeed={secondarySeed} tertiarySeed={tertiarySeed}>
      <Capsule vh={vh}>
        {/* Its own layer: without it the card's material painted over the picture. */}
        <View style={{ width: side, height: side, alignItems: 'center', justifyContent: 'center' }}>
          {picture ? (
            <Shapes.Image shape="squircle" size={side} source={{ uri: picture }} alt={main} />
          ) : (
            <FrameIcon name={fallbackIcon} size={7 * vh} />
          )}
        </View>
        <View style={{ flexShrink: 1, gap: 0.3 * vh }}>
          <Label text={label} vh={vh} />
          {/* What is playing leads: larger than the text of the other cards. */}
          <Main text={main} vh={vh} size={isMusic ? 4 : 2.9} lines={isMusic ? 2 : 3} />
        </View>
      </Capsule>
    </BloomSeedScope>
  );
}

function Music({ card, artwork, vh }: { card: MusicCard; artwork: Artwork | null; vh: number }) {
  const { t } = useTranslation();
  return (
    <WithPicture
      vh={vh}
      picture={artwork?.uri ?? null}
      seeds={artwork?.seeds ?? []}
      fallbackIcon="music"
      label={card.artist ?? t('cards.nowPlaying')}
      main={card.title}
      isMusic
    />
  );
}

function News({ card, vh }: { card: NewsCard; vh: number }) {
  return (
    <WithPicture
      vh={vh}
      picture={card.imageUrl}
      seeds={card.imageSeeds}
      fallbackIcon="news"
      label={card.publisher}
      main={card.title}
      isMusic={false}
    />
  );
}

/** Written out: the i18n catalog test only sees keys that appear literally. */
const WEATHER_LABEL_KEYS: Record<string, ParseKeys> = {
  'clear-night': 'weather.clear-night',
  cloudy: 'weather.cloudy',
  exceptional: 'weather.exceptional',
  fog: 'weather.fog',
  hail: 'weather.hail',
  lightning: 'weather.lightning',
  'lightning-rainy': 'weather.lightning-rainy',
  partlycloudy: 'weather.partlycloudy',
  pouring: 'weather.pouring',
  rainy: 'weather.rainy',
  snowy: 'weather.snowy',
  'snowy-rainy': 'weather.snowy-rainy',
  sunny: 'weather.sunny',
  windy: 'weather.windy',
  'windy-variant': 'weather.windy-variant',
};

/** The weather: a pill (`radius-max`) with the condition's glyph, in the theme's primary. */
function Weather({ card, vh }: { card: WeatherCard; vh: number }) {
  const { t } = useTranslation();
  const labelKey = WEATHER_LABEL_KEYS[card.condition];
  return (
    <Card
      tone="accent"
      appearance="subtle"
      radius="radius-max"
      style={{
        height: CARD_HEIGHT * vh,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2.4 * vh,
        paddingLeft: 3.6 * vh,
        paddingRight: 4.6 * vh,
      }}
    >
      <WeatherIcon condition={card.condition} isNight={card.isNight} size={8 * vh} />
      <View>
        <Label text={labelKey ? t(labelKey) : t('weather.outside')} vh={vh} />
        <Text
          className="font-display"
          style={{ fontSize: 5.5 * vh, lineHeight: 6.2 * vh, fontWeight: '400' }}
        >
          {t('cards.degrees', { degrees: card.temperature })}
        </Text>
      </View>
    </Card>
  );
}

function Co2({ card, vh }: { card: Co2Card; vh: number }) {
  const { t } = useTranslation();
  return (
    <Capsule vh={vh} isAlert>
      <FrameIcon name="air" size={3.8 * vh} />
      <View style={{ flexShrink: 1, gap: 0.3 * vh }}>
        <Label text={t('cards.stuffyAir')} vh={vh} />
        <Main text={t('cards.ppm', { ppm: card.ppm })} vh={vh} />
      </View>
    </Capsule>
  );
}

/**
 * The gallery: the photo fills the card, ringed in the theme's primary like a
 * focused element. The card's width follows the photo's shape.
 */
function Gallery({ card, vh }: { card: GalleryCard; vh: number }) {
  const { colors } = useTheme();
  const inner = 18.2 * vh;
  const ratio = card.width > 0 && card.height > 0 ? card.width / card.height : 1;
  return (
    <Card
      radius="radius-28"
      appearance="plain"
      border="medium"
      style={{ height: CARD_HEIGHT * vh, borderColor: colors.primary, padding: 0.6 * vh }}
    >
      {/* AmbientPhoto: a new gallery photo cross-fades in over the last. */}
      <View
        style={{
          height: inner,
          width: Math.round(inner * ratio),
          borderRadius: 2.2 * vh,
          overflow: 'hidden',
        }}
      >
        <AmbientPhoto source={card.url} drift={false} fadeMs={800} />
      </View>
    </Card>
  );
}

function RowCardView({
  card,
  artwork,
  vh,
}: {
  card: RowCard;
  artwork: Artwork | null;
  vh: number;
}) {
  switch (card.kind) {
    case 'music':
      return <Music card={card} artwork={artwork} vh={vh} />;
    case 'news':
      return <News card={card} vh={vh} />;
    case 'weather':
      return <Weather card={card} vh={vh} />;
    case 'co2':
      return <Co2 card={card} vh={vh} />;
    case 'gallery':
      return <Gallery card={card} vh={vh} />;
  }
}

/** What makes a card new: a different song or story enters as a new card, with its animation. */
function cardKey(card: RowCard): string {
  switch (card.kind) {
    case 'music':
      return `music:${card.title}`;
    case 'news':
      return `news:${card.id}`;
    case 'weather':
      return `weather:${card.condition}:${card.temperature}`;
    case 'co2':
      return `co2:${card.ppm}`;
    case 'gallery':
      return `gallery:${card.url}`;
  }
}

/**
 * The row along the bottom. It runs off the right edge on purpose: the last
 * card is cut by the frame's edge, as an ambient screen does.
 */
export function CardRow({
  cards,
  artwork,
  vh,
}: {
  cards: RowCard[];
  artwork: Artwork | null;
  vh: number;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'flex-end',
        gap: 1.6 * vh,
        paddingLeft: 3.5 * vh,
      }}
    >
      {cards.map((card) => (
        <Animated.View
          key={cardKey(card)}
          entering={FadeInDown.duration(450)}
          style={{ flexShrink: 0 }}
        >
          <RowCardView card={card} artwork={card.kind === 'music' ? artwork : null} vh={vh} />
        </Animated.View>
      ))}
    </View>
  );
}

/**
 * The alert panel (an open door): it drops from the top edge across the
 * whole width, with the readings inside it. Square at the top, where it
 * belongs to the frame's edge; rounded at the bottom.
 */
export function AlertPanel({
  alert,
  vh,
  status,
}: {
  alert: OpeningAlert;
  vh: number;
  /** The readings row, drawn in the panel's own text colour. */
  status: (color: string) => ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // The text colour Bloom pairs with the panel's red.
  const ink = resolveBloomColors(colors, 'danger', 'solid').foreground;
  return (
    <View
      style={{
        borderBottomLeftRadius: 7 * vh,
        borderBottomRightRadius: 7 * vh,
        overflow: 'hidden',
      }}
    >
      <Card
        tone="danger"
        appearance="solid"
        radius="radius-0"
        elevation="none"
        style={{
          width: '100%',
          gap: 3 * vh,
          paddingTop: 2.4 * vh,
          paddingBottom: 4.5 * vh,
          paddingHorizontal: 3.5 * vh,
        }}
      >
        {status(ink)}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 * vh }}>
          <FrameIcon
            name={alert.deviceClass === 'window' ? 'window' : 'door'}
            size={13 * vh}
            color={ink}
          />
          <View style={{ flexShrink: 1 }}>
            <CardDescription
              className="font-display"
              style={{ fontSize: 2.8 * vh, lineHeight: 3.4 * vh, color: ink }}
            >
              {alert.name}
            </CardDescription>
            <CardTitle
              numberOfLines={3}
              className="font-display"
              style={{
                fontSize: 6 * vh,
                lineHeight: 7 * vh,
                fontWeight: '700',
                marginTop: 0.6 * vh,
                color: ink,
              }}
            >
              {t('cards.openDoor')}
            </CardTitle>
          </View>
        </View>
      </Card>
    </View>
  );
}
