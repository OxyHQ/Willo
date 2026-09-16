import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Icon, type IconName } from '@willo.sh/ui';
import { AddButton, Label, SectionTitle } from '@willo.sh/ui';
import { RoutineRow } from '../components/routine-row';
import { CardStrip, PageColumns, PageScroll } from '../layout/page-layout';
import { useResponsiveLayout } from '../layout/use-responsive-layout';
import type { ScreenProps } from '../data/screens';
import { useDevices, useHome, useHomeActions } from '../state/home-context';
import { useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';
import type { ParseKeys } from 'i18next';
const upcoming: { id: string; hour: number; minute: number; nameKey: ParseKeys; icon: IconName }[] = [
  { id: 'kettle', hour: 10, minute: 0, nameKey: 'automations.demo.morningKettle', icon: 'kettle' },
  { id: 'security', hour: 19, minute: 30, nameKey: 'automations.demo.nighttimeSecurity', icon: 'lock' },
  { id: 'jam', hour: 20, minute: 0, nameKey: 'automations.demo.fridayJam', icon: 'speaker' },
];
/**
 * A routine's time in the UI language, split so the card can show the
 * number large and the day period ("AM"/"PM") small. Languages that use a
 * 24-hour clock (Spanish) have no day period, so `period` is empty there.
 */
function formatRoutineTime(hour: number, minute: number, timeFormat: Intl.DateTimeFormat): { time: string; period: string } {
  const parts = timeFormat.formatToParts(new Date(2000, 0, 1, hour, minute));
  const period = parts.find(part => part.type === 'dayPeriod')?.value ?? '';
  const time = parts.filter(part => part.type !== 'dayPeriod').map(part => part.value).join('').trim();
  return { time, period };
}
export function AutomationsScreen({ onNavigate }: ScreenProps) {
  const { state } = useHome();
  const { dispatch, notify, sendCommand } = useHomeActions();
  const devices = useDevices();
  const { colors: themeColors } = useTheme();
  const { t, i18n } = useTranslation();
  const { compact, split } = useResponsiveLayout();
  // Building an `Intl.DateTimeFormat` costs far more than formatting with one, and this screen re-renders on every device push.
  const timeFormat = useMemo(() => new Intl.DateTimeFormat(i18n.language, { hour: 'numeric', minute: '2-digit' }), [i18n.language]);
  const shown = upcoming.filter(item => !state.dismissedUpcoming.includes(item.id));
  return <View className="min-h-0 flex-1">
    <PageScroll><PageColumns weights={[1, 1.35]}>
      <View><SectionTitle>{t('automations.upcoming')}</SectionTitle><CardStrip gap={12}>
        {shown.length ? shown.map((item, index) => { const { time, period } = formatRoutineTime(item.hour, item.minute, timeFormat); return <View key={item.id}
          className={`min-h-[173px] justify-between rounded-[27px] p-4 ${index === 0 ? 'bg-primary-subtle' : 'bg-muted'}`}
          style={{ width: compact ? 156 : split ? '100%' : 196, gap: 32 }}>
          <View className="flex-row items-center justify-between"><Icon name={item.icon} size={23} color={index === 0 ? themeColors.primary : themeColors.text}/>
            <Pressable accessibilityRole="button" accessibilityLabel={t('automations.dismiss', { name: t(item.nameKey) })} onPress={() => dispatch({ type: 'DISMISS_UPCOMING', id: item.id })}
              className="h-11 w-11 items-center justify-center rounded-full bg-card/80"><Icon name="close" size={16}/></Pressable>
          </View>
          <View><Label className={`text-[33px] leading-[41px] ${index === 0 ? 'text-primary-text' : ''}`}>{time}{period !== '' && <Label className={`text-[12px] ${index === 0 ? 'text-primary-text' : ''}`}> {period}</Label>}</Label>
            <Label className={`mt-1 text-[11px] leading-[15px] ${index === 0 ? 'text-primary-text' : ''}`}>{t('automations.todayItem', { name: t(item.nameKey) })}</Label>
          </View>
        </View>; }) : <View className="w-full rounded-3xl bg-muted p-5"><Label className="text-[13px] text-muted-foreground">{t('automations.noUpcoming')}</Label></View>}
      </CardStrip></View>
      <View><SectionTitle right={t('automations.add')} onPress={() => onNavigate('composer')}>{t('automations.yours')}</SectionTitle><View className="gap-2">
        <RoutineRow title={t('automations.demo.wakeUp')} description={t('automations.demo.wakeUpDescription')} icon="light"/>
        <RoutineRow title={t('automations.demo.morningKettle')} description={t('automations.demo.morningKettleDescription')} icon="kettle"/>
        <RoutineRow title={t('automations.demo.nighttimeSecurity')} description={t('automations.demo.nighttimeSecurityDescription')} icon="lock" onRun={() => { for (const lock of devices.filter(device => device.domain === 'lock')) sendCommand(lock.id, { kind: 'setLocked', locked: true }); notify(t('automations.doorsLocked')); }}/>
        <RoutineRow title={t('automations.demo.fridayJam')} description={t('automations.demo.fridayJamDescription')} icon="speaker"/>
        {state.routines.map(routine => <RoutineRow key={routine.id} {...routine}/>)}
      </View></View>
    </PageColumns></PageScroll>
  </View>;
}
export function RoutinesScreen({ onNavigate }: ScreenProps) {
  const { state } = useHome();
  const { dispatch, notify } = useHomeActions();
  const { t } = useTranslation();
  return <View className="min-h-0 flex-1">
    <PageScroll bottom={96}><PageColumns>
      <View><SectionTitle>{t('automations.household')}</SectionTitle><View className="gap-2">
        <RoutineRow title={t('automations.demo.garageMotionLight')} description={t('automations.demo.oneStarterOneAction')} icon="settings"/>
        <RoutineRow title={t('demo.devices.movieMode')} description={t('automations.demo.oneStarterThreeActions')} icon="light" onRun={() => { dispatch({ type: 'TOGGLE_MOVIE' }); notify(state.movieMode ? t('automations.movieStopped') : t('automations.movieStarted')); }}/>
        <RoutineRow title={t('automations.demo.partyTime')} description={t('automations.demo.oneStarterFourActions')} icon="speaker"/>
        <RoutineRow title={t('automations.demo.home')} description={t('automations.demo.homeDescription')} icon="home" playable={false}/>
        <RoutineRow title={t('automations.demo.away')} description={t('automations.demo.awayDescription')} icon="home" playable={false}/>
        {state.routines.map(routine => <RoutineRow key={routine.id} {...routine}/>)}
      </View></View>
      <View><SectionTitle>{t('automations.personal')}</SectionTitle><View className="gap-2"><RoutineRow title={t('automations.demo.bedtime')} description={t('automations.demo.bedtimeDescription')} icon="moon"/><RoutineRow title={t('automations.demo.goodMorning')} description={t('automations.demo.goodMorningDescription')} icon="sun"/></View></View>
    </PageColumns></PageScroll><AddButton onPress={() => onNavigate('composer')} label={t('common.add')} accessibilityLabel={t('common.addAutomationOrDevice')}/>
  </View>;
}
