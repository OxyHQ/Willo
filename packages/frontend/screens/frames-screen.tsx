import React, { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertDialog } from '@oxy.so/bloom/alert-dialog';
import { GroupedSection, GroupedSectionItem } from '@oxy.so/bloom/grouped-section';
import {
  SegmentedControl,
  SegmentedControlItem,
  SegmentedControlItemText,
} from '@oxy.so/bloom/segmented-control';
import { Stepper } from '@oxy.so/bloom/stepper';
import { Switch } from '@oxy.so/bloom/switch';
import { TextField, TextFieldInput } from '@oxy.so/bloom/text-field';
import { useTheme } from '@oxy.so/bloom/theme';
import {
  FRAME_CARDS,
  FRAME_ROTATIONS,
  FRAME_STATUS_ICONS,
  type Frame,
  type FrameCard,
  type FrameRotation,
  type FrameStatusIcon,
  type UpdateFrameRequest,
} from '@willo.sh/shared-types';
import { useOxy } from '@oxy.so/services/ui/client';
import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Icon, Label, SectionTitle } from '@willo.sh/ui';
import { PageColumns, PageScroll } from '../layout/page-layout';
import type { ScreenProps } from '../data/screens';
import { isFrameOnline, withFrameChange } from '../state/frames';
import { FRAMES_QUERY_KEY, useDevices, useFrames, useHomeActions } from '../state/home-context';

// Written out rather than built as `frames.cards.${card}`: the i18n catalog
// test only sees keys that appear literally in the source.
const CARD_LABEL_KEYS: Record<FrameCard, ParseKeys> = {
  gallery: 'frames.cards.gallery',
  door: 'frames.cards.door',
  co2: 'frames.cards.co2',
  music: 'frames.cards.music',
  weather: 'frames.cards.weather',
  news: 'frames.cards.news',
};
const STATUS_ICON_LABEL_KEYS: Record<FrameStatusIcon, ParseKeys> = {
  indoorTemperature: 'frames.readings.indoorTemperature',
  outdoorTemperature: 'frames.readings.outdoorTemperature',
  humidity: 'frames.readings.humidity',
  co2: 'frames.readings.co2',
};
/** How long each photo stays, offered as a short list rather than free entry. */
const SECONDS_PER_PHOTO_OPTIONS = [15, 30, 45, 60, 120, 300] as const;
/** News languages a frame can follow; an empty choice follows the frame's own language. */
const NEWS_LANGUAGE_OPTIONS: { languages: string[]; labelKey: ParseKeys }[] = [
  { languages: [], labelKey: 'frames.news.followFrame' },
  { languages: ['es'], labelKey: 'frames.news.spanish' },
  { languages: ['en'], labelKey: 'frames.news.english' },
  { languages: ['es', 'en'], labelKey: 'frames.news.spanishAndEnglish' },
];
/** Pixels a step of the safe-area steppers moves, and the most either edge keeps clear. */
const SAFE_AREA_STEP_PX = 10;
const SAFE_AREA_MAX_PX = 400;

/**
 * The Frame by Willo screens in this Home: which are on, and everything each
 * one shows. A change appears on the frame at once (the backend tells it over
 * its socket); here it shows straight away and rolls back if the save fails.
 */
export function FramesScreen(_props: ScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const frames = useFrames();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Online is judged as of when the list was fetched (every half minute, see
  // `useFrames`), not the moment of rendering: a render must not read the clock.
  const list = frames.data ?? [];
  const selected = list.find((frame) => frame.id === selectedId) ?? list[0] ?? null;

  if (frames.isError) {
    return (
      <PageScroll>
        <View className="mt-3 items-center gap-3 rounded-[24px] bg-muted p-6">
          <Icon name="tv" size={26} color={colors.textSecondary} />
          <Label className="text-center text-[13px] text-muted-foreground">
            {t('frames.loadFailed')}
          </Label>
        </View>
      </PageScroll>
    );
  }

  if (frames.isSuccess && list.length === 0) {
    return (
      <PageScroll>
        <SectionTitle>{t('frames.title')}</SectionTitle>
        <View className="mt-3 items-center gap-3 rounded-[24px] bg-muted p-6">
          <Icon name="tv" size={26} color={colors.textSecondary} />
          <Label className="text-center text-[15px] font-semibold">{t('frames.emptyTitle')}</Label>
          <Label className="text-center text-[13px] text-muted-foreground">
            {t('frames.emptyDescription')}
          </Label>
        </View>
      </PageScroll>
    );
  }

  return (
    <PageScroll>
      <PageColumns weights={[2, 3]}>
        <View>
          <SectionTitle>{t('frames.title')}</SectionTitle>
          <GroupedSection>
            {list.map((frame) => (
              <GroupedSectionItem
                key={frame.id}
                icon={<Icon name="tv" size={18} color={colors.text} />}
                title={frame.name}
                description={[
                  frame.room ?? t('frames.noRoom'),
                  isFrameOnline(frame, frames.dataUpdatedAt) ? t('frames.online') : t('frames.offline'),
                ].join(' · ')}
                accessibilityState={{ selected: frame.id === selected?.id }}
                onPress={() => setSelectedId(frame.id)}
              />
            ))}
          </GroupedSection>
        </View>
        {selected ? <FrameSettings key={selected.id} frame={selected} /> : null}
      </PageColumns>
    </PageScroll>
  );
}

function FrameSettings({ frame }: { frame: Frame }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const devices = useDevices();
  const { updateFrame, removeFrame, setSheet, notify } = useHomeActions();
  const { user: oxyUser } = useOxy();
  const queryClient = useQueryClient();
  const [name, setName] = useState(frame.name);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const settings = frame.settings;
  const rooms = [...new Set(devices.flatMap((device) => (device.room ? [device.room] : [])))].sort(
    (a, b) => a.localeCompare(b),
  );

  /** Show the change at once on every cached list of frames, and undo it if the save fails. */
  const save = useMutation({
    mutationFn: (change: UpdateFrameRequest) => updateFrame(frame.id, change),
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: [FRAMES_QUERY_KEY] });
      const previous = queryClient.getQueriesData<Frame[]>({ queryKey: [FRAMES_QUERY_KEY] });
      queryClient.setQueriesData<Frame[]>({ queryKey: [FRAMES_QUERY_KEY] }, (cached) =>
        cached?.map((each) => (each.id === frame.id ? withFrameChange(each, change) : each)),
      );
      return { previous };
    },
    onError: (error, change, context) => {
      console.error(`Failed to save a change to frame ${frame.id}:`, change, error);
      for (const [key, cached] of context?.previous ?? []) queryClient.setQueryData(key, cached);
      notify(t('frames.saveFailed'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [FRAMES_QUERY_KEY] }),
  });

  const remove = useMutation({
    mutationFn: () => removeFrame(frame),
    onSuccess: ({ deviceSignedOut }) =>
      notify(deviceSignedOut ? t('frames.removed') : t('frames.removedKeptSignedIn')),
    onError: (error) => {
      console.error(`Failed to remove frame ${frame.id}:`, error);
      notify(t('frames.removeFailed'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [FRAMES_QUERY_KEY] }),
  });

  const handleNameSubmit = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== frame.name) save.mutate({ name: trimmed });
    else setName(frame.name);
  };

  const chooseRoom = () =>
    setSheet({
      kind: 'menu',
      title: t('frames.room'),
      description: t('frames.roomDescription'),
      options: [
        ...rooms.map((room) => ({
          label: room,
          selected: room === frame.room,
          onPress: () => {
            setSheet(null);
            save.mutate({ room });
          },
        })),
        {
          label: t('frames.noRoom'),
          selected: frame.room === null,
          onPress: () => {
            setSheet(null);
            save.mutate({ room: null });
          },
        },
      ],
    });

  const chooseSecondsPerPhoto = () =>
    setSheet({
      kind: 'menu',
      title: t('frames.secondsPerPhoto'),
      options: SECONDS_PER_PHOTO_OPTIONS.map((seconds) => ({
        label: t('frames.seconds', { seconds }),
        selected: seconds === settings.secondsPerPhoto,
        onPress: () => {
          setSheet(null);
          save.mutate({ settings: { secondsPerPhoto: seconds } });
        },
      })),
    });

  const newsLanguages =
    NEWS_LANGUAGE_OPTIONS.find(
      (option) => option.languages.join() === settings.newsLanguages.join(),
    ) ?? NEWS_LANGUAGE_OPTIONS[0];
  const chooseNewsLanguages = () =>
    setSheet({
      kind: 'menu',
      title: t('frames.news.languages'),
      options: NEWS_LANGUAGE_OPTIONS.map((option) => ({
        label: t(option.labelKey),
        selected: option === newsLanguages,
        onPress: () => {
          setSheet(null);
          save.mutate({ settings: { newsLanguages: option.languages } });
        },
      })),
    });

  const isMine = frame.addedByUserId === oxyUser?.id;
  const diagnostics = [
    frame.diagnostics.platform,
    frame.diagnostics.appVersion,
    frame.diagnostics.fps !== null
      ? t('frames.fps', { fps: Math.round(frame.diagnostics.fps) })
      : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <View className="gap-6">
      <GroupedSection title={t('frames.frame')}>
        <View className="p-4">
          <TextField>
            <TextFieldInput
              label={t('frames.name')}
              value={name}
              onValueChange={setName}
              onSubmitEditing={handleNameSubmit}
              onBlur={handleNameSubmit}
              maxLength={100}
              returnKeyType="done"
            />
          </TextField>
        </View>
        <GroupedSectionItem
          icon={<Icon name="home" size={18} color={colors.text} />}
          title={t('frames.room')}
          value={frame.room ?? t('frames.noRoom')}
          onPress={chooseRoom}
        />
      </GroupedSection>

      <GroupedSection title={t('frames.picture')}>
        <View className="p-4">
          <SegmentedControl
            label={t('frames.rotation')}
            type="radio"
            value={String(settings.rotation)}
            onValueChange={(value) => {
              const rotation = FRAME_ROTATIONS.find((option) => String(option) === value);
              if (rotation !== undefined) save.mutate({ settings: { rotation } });
            }}
          >
            {FRAME_ROTATIONS.map((rotation: FrameRotation) => (
              <SegmentedControlItem key={rotation} value={String(rotation)}>
                <SegmentedControlItemText>
                  {t('frames.degrees', { degrees: rotation })}
                </SegmentedControlItemText>
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </View>
        <GroupedSectionItem
          title={t('frames.secondsPerPhoto')}
          value={t('frames.seconds', { seconds: settings.secondsPerPhoto })}
          onPress={chooseSecondsPerPhoto}
        />
        <GroupedSectionItem
          title={t('frames.drift')}
          description={t('frames.driftDescription')}
          rightElement={
            <Switch
              checked={settings.drift}
              onCheckedChange={(drift) => save.mutate({ settings: { drift } })}
              accessibilityLabel={t('frames.drift')}
            />
          }
        />
        <GroupedSectionItem
          title={t('frames.clock')}
          rightElement={
            <Switch
              checked={settings.showClock}
              onCheckedChange={(showClock) => save.mutate({ settings: { showClock } })}
              accessibilityLabel={t('frames.clock')}
            />
          }
        />
      </GroupedSection>

      <GroupedSection title={t('frames.safeArea')} footer={t('frames.safeAreaDescription')}>
        {(['top', 'bottom'] as const).map((edge) => (
          <GroupedSectionItem
            key={edge}
            title={edge === 'top' ? t('frames.safeAreaTop') : t('frames.safeAreaBottom')}
            rightElement={
              <Stepper
                value={settings.safeArea[edge]}
                min={0}
                max={SAFE_AREA_MAX_PX}
                step={SAFE_AREA_STEP_PX}
                formatValue={(pixels) => t('frames.pixels', { pixels })}
                onValueChange={(pixels) =>
                  save.mutate({ settings: { safeArea: { [edge]: pixels } } })
                }
              />
            }
          />
        ))}
      </GroupedSection>

      <GroupedSection title={t('frames.cards.title')}>
        <GroupedSectionItem
          title={t('frames.cards.show')}
          rightElement={
            <Switch
              checked={settings.showCards}
              onCheckedChange={(showCards) => save.mutate({ settings: { showCards } })}
              accessibilityLabel={t('frames.cards.show')}
            />
          }
        />
        {FRAME_CARDS.map((card) => (
          <GroupedSectionItem
            key={card}
            title={t(CARD_LABEL_KEYS[card])}
            disabled={!settings.showCards}
            rightElement={
              <Switch
                checked={settings.cards[card]}
                disabled={!settings.showCards}
                onCheckedChange={(shown) => save.mutate({ settings: { cards: { [card]: shown } } })}
                accessibilityLabel={t(CARD_LABEL_KEYS[card])}
              />
            }
          />
        ))}
      </GroupedSection>

      <GroupedSection title={t('frames.readings.title')}>
        {FRAME_STATUS_ICONS.map((icon) => (
          <GroupedSectionItem
            key={icon}
            title={t(STATUS_ICON_LABEL_KEYS[icon])}
            rightElement={
              <Switch
                checked={settings.statusIcons[icon]}
                onCheckedChange={(shown) =>
                  save.mutate({ settings: { statusIcons: { [icon]: shown } } })
                }
                accessibilityLabel={t(STATUS_ICON_LABEL_KEYS[icon])}
              />
            }
          />
        ))}
      </GroupedSection>

      <GroupedSection title={t('frames.news.title')}>
        <GroupedSectionItem
          title={t('frames.news.languages')}
          value={t(newsLanguages.labelKey)}
          onPress={chooseNewsLanguages}
        />
      </GroupedSection>

      <GroupedSection footer={diagnostics.length > 0 ? diagnostics.join(' · ') : undefined}>
        <GroupedSectionItem
          title={t('frames.remove')}
          destructive
          disabled={remove.isPending}
          onPress={() => setIsConfirmingRemove(true)}
        />
      </GroupedSection>

      <AlertDialog
        open={isConfirmingRemove}
        onOpenChange={setIsConfirmingRemove}
        title={t('frames.removeTitle', { name: frame.name })}
        description={isMine ? t('frames.removeDescription') : t('frames.removeDescriptionOther')}
        confirmLabel={t('frames.remove')}
        destructive
        onConfirm={() => remove.mutate()}
      />
    </View>
  );
}
