import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { PageScroll, ContentWidth } from '../layout/page-layout';
import { useResponsiveLayout } from '../layout/responsive-context';
import { CameraCard } from '../components/camera-card';
import { Icon } from '@willo.sh/ui';
import { IconButton, Label } from '@willo.sh/ui';
import { type ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import { useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';
export function EmergencyHeader({ onNavigate }: ScreenProps) {
  const { t } = useTranslation();
  return <ContentWidth maxWidth={1200}><View className="items-start pt-2"><IconButton icon="close" label={t('emergency.close')} onPress={() => onNavigate('home')}/></View></ContentWidth>;
}
export function EmergencyScreen({ onNavigate, header }: ScreenProps) {
  const { state, dispatch, setSheet } = useHome();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
  const { compact, gutter } = useResponsiveLayout();
  const [width, setWidth] = useState(320);
  const [page, setPage] = useState(0);
  const cameraWidth = compact ? Math.max(230, width - 46) : Math.max(100, (Math.min(width, 1200) - gutter * 2 - 12) / 2);
  return <View className="flex-1 bg-card" onLayout={event => setWidth(event.nativeEvent.layout.width)}><PageScroll maxWidth={1200}>
    {header}
    <Label className="pb-5 pt-1 text-[21px] leading-[29px]">{t('emergency.title')}</Label><View className="mb-4 flex-row items-center gap-3 rounded-full bg-muted px-3 py-3"><Icon name="alert" size={20} color={themeColors.error}/><Label className="flex-1 text-[12px]">{t('emergency.caution')}</Label></View>
    <ScrollView horizontal scrollEnabled={compact} showsHorizontalScrollIndicator={false} snapToInterval={compact ? cameraWidth + 12 : undefined} decelerationRate="fast" onScroll={event => setPage(Math.round(event.nativeEvent.contentOffset.x / (cameraWidth + 12)))} scrollEventThrottle={80} contentContainerStyle={{ gap: 12 }}><CameraCard label={t('demo.rooms.livingRoom')} height={compact ? 176 : 300} width={cameraWidth}/><CameraCard garden height={compact ? 176 : 300} width={cameraWidth}/></ScrollView>
    {compact && <View className="flex-row justify-center gap-2 py-4">{[0, 1].map(index => <View key={index} className={`h-1.5 w-1.5 rounded-full ${page === index ? 'bg-home-muted' : 'bg-border'}`}/>)}</View>}
    <View className="mt-4 gap-2"><Pressable accessibilityRole="button" accessibilityLabel={state.kitchenSilenced ? t('emergency.restoreKitchen') : t('emergency.silenceKitchen')} onPress={() => dispatch({ type: 'TOGGLE_SILENCE' })} className="min-h-[82px] flex-row items-center gap-3 rounded-[24px] bg-muted px-4"><Icon name="waves" size={21} color={themeColors.text}/><View className="flex-1"><Label className="text-[13px]">{t('emergency.kitchen')}</Label><Label className="mt-0.5 text-[11px]">{state.kitchenSilenced ? t('emergency.silenced') : t('emergency.sounding')}</Label></View><Icon name={state.kitchenSilenced ? 'volume-off' : 'speaker'} size={20} color={themeColors.text}/></Pressable><Pressable accessibilityRole="button" onPress={() => setSheet({ kind: 'message', title: t('emergency.diningRoom'), description: t('emergency.diningDescription') })} className="min-h-[82px] flex-row items-center gap-3 rounded-[24px] bg-muted px-4"><Icon name="climate" size={21} color={themeColors.text}/><View className="flex-1"><Label className="text-[13px]">{t('emergency.diningRoom')}</Label><Label className="mt-0.5 text-[11px]">{t('emergency.noLongerHeard')}</Label></View></Pressable></View>
    <Label className="mt-8 px-5 text-center text-[11px] leading-[17px] text-muted-foreground">{t('emergency.footer')}</Label>
  </PageScroll></View>;
}
