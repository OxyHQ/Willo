import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, Switch, View } from 'react-native';
import { PageScroll, PageColumns, CardStrip } from '../layout/page-layout';
import { Icon, SectionTitle, type IconName } from '@willo.sh/ui';
import { IconButton, Label } from '@willo.sh/ui';
import { assets } from '../data/assets';
import { type ScreenProps } from '../data/screens';
import { useHome, useHomeActions, useUnitSystem } from '../state/home-context';
import type { UnitSystem } from '../providers/unit-system';
import type { ParseKeys } from 'i18next';
import { useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';
// Written out rather than built as `units.${system}`: `tests/i18n-catalogs.test.ts`
// only sees keys that appear literally in the source, and a key nobody can see
// is a key nobody notices going stale.
const UNIT_SYSTEM_LABEL_KEYS: Record<UnitSystem, ParseKeys> = { metric: 'units.metric', imperial: 'units.imperial' };
export function SettingsScreen({ onNavigate }: ScreenProps) {
  const { setupStage, homeName, demoMode, homes, homeId } = useHome();
  const unitSystem = useUnitSystem();
  const { setSheet, setDemoMode, setUnitSystem, switchHome, startNewHome } = useHomeActions();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState(true);
  // A real Home to show settings FOR, or a preview of what they'd look
  // like once one exists — either way, distinct from the App section below,
  // which is a per-device preference with no Home behind it at all (that's
  // exactly what was confusing about this screen when Settings became
  // reachable before any Home was set up: the Home name/members/devices
  // sections rendered regardless, for a Home that didn't exist yet).
  const hasHomeToShow = setupStage === 'ready' || demoMode;
  const show = (title: string, description: string) => setSheet({ kind: 'message', title, description });
  const chooseUnits = () => setSheet({ kind: 'menu', title: t('units.title'), description: t('units.sharedBy', { home: homeName }), options: (['metric', 'imperial'] as const).map(option => ({
    label: t(UNIT_SYSTEM_LABEL_KEYS[option]),
    selected: option === unitSystem,
    onPress: () => { setUnitSystem(option); setSheet(null); },
  })) });
  // Every Home this person belongs to, the current one selected, plus a way
  // to start another — each one is paired with its own Home Assistant.
  const chooseHome = () => setSheet({ kind: 'menu', title: t('homes.title'), options: [
    ...homes.map(home => ({
      label: home.name ?? t('homes.unnamed'),
      selected: home.id === homeId,
      // Picking the Home you're already on only does something when it isn't
      // paired yet: there's nothing to switch, so take them to pairing.
      onPress: () => {
        setSheet(null);
        if (home.id !== homeId) switchHome(home.id);
        else if (setupStage === 'needs-pairing') onNavigate('onboarding');
      },
    })),
    {
      label: t('homes.createNew'),
      description: t('homes.createNewDescription'),
      onPress: () => { setSheet(null); startNewHome(); onNavigate('onboarding'); },
    },
  ] });
  const section = (title: string, action: () => void) => <Pressable accessibilityRole="button" onPress={action} className="mb-3 mt-7 flex-row items-center justify-between"><Label className="text-[12px]">{title}</Label><View className="h-7 w-7 items-center justify-center rounded-full bg-muted"><Icon name="chevron" size={14} color={themeColors.text}/></View></Pressable>;
  const mini = (title: string, icon: IconName, action: () => void) => <Pressable key={title} accessibilityRole="button" onPress={action} className="h-[101px] w-[99px] justify-between rounded-[23px] bg-muted p-3.5 active:opacity-70"><Icon name={icon} size={18} color={themeColors.text}/><Label className="text-[11px] leading-[15px]">{title}</Label></Pressable>;
  return <View className="flex-1"><PageScroll><PageColumns><View>
    <SectionTitle>{t('settings.home')}</SectionTitle>
    {hasHomeToShow ? <>
      {/* Demo mode's name is the fake "Spring Street" — there are no real Homes behind it to switch between. */}
      <Pressable onPress={demoMode ? () => show(t('settings.homeDetails'), t('settings.noAddress', { home: homeName })) : chooseHome} accessibilityRole="button" accessibilityLabel={demoMode ? homeName : t('homes.switchOrCreate', { home: homeName })} className="mb-2 mt-3 flex-row items-center justify-between"><Label className="text-[34px] font-semibold">{homeName}</Label><View className="h-7 w-7 items-center justify-center rounded-full bg-muted"><Icon name={demoMode ? 'chevron' : 'down'} size={14} color={themeColors.text}/></View></Pressable>
      <View className="mt-5 flex-row items-center gap-2"><View className="h-9 w-9 overflow-hidden rounded-full"><Image source={assets.avatar} style={{ width: '100%', height: '100%' }}/></View><Pressable accessibilityRole="button" accessibilityLabel={t('settings.householdMemberL')} onPress={() => show(t('settings.householdMember'), t('settings.householdMemberDescription'))} className="h-9 w-9 items-center justify-center rounded-full bg-primary-subtle"><Label className="text-[13px] text-primary-text">L</Label></Pressable><IconButton icon="plus" label={t('settings.invite')} size={15} shape="small" className="bg-muted" onPress={() => show(t('settings.inviteTitle'), t('settings.inviteDescription'))}/></View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('units.rowLabel', { value: t(UNIT_SYSTEM_LABEL_KEYS[unitSystem]) })} onPress={chooseUnits} className="mt-5 flex-row items-center gap-3 rounded-[22px] bg-muted p-4 active:opacity-70"><Icon name="thermometer" size={20} color={themeColors.text}/><Label className="flex-1 text-[13px]">{t('units.title')}</Label><Label className="text-[13px] text-muted-foreground">{t(UNIT_SYSTEM_LABEL_KEYS[unitSystem])}</Label><Icon name="chevron" size={15} color={themeColors.text}/></Pressable>
      {section(t('settings.devicesGroupsRooms'), () => onNavigate('devices'))}
      <CardStrip>{mini(t('settings.miniHallwayThermostat'), 'thermometer', () => onNavigate('home'))}{mini(t('settings.miniFrontDoorLock'), 'lock', () => onNavigate('home'))}{mini(t('settings.officeWifi'), 'wifi', () => show(t('settings.officeWifi'), t('settings.officeWifiDescription')))}{mini(t('demo.rooms.livingRoom'), 'light', () => onNavigate('devices'))}</CardStrip>
    </> : (
      <View className="mt-3 items-center gap-3 rounded-[24px] bg-muted p-6">
        <Icon name="home" size={26} color={themeColors.textSecondary}/>
        {/* A Home that exists but was never paired is not "no home": say which one, and that pairing is the missing step. */}
        <Label className="text-center text-[13px] text-muted-foreground">{setupStage === 'needs-pairing' ? t('settings.notPaired', { home: homeName }) : t('settings.noHome')}</Label>
        <Pressable accessibilityRole="button" accessibilityLabel={setupStage === 'needs-pairing' ? t('onboarding.connectTitle') : t('settings.setUpHome')} onPress={() => onNavigate('onboarding')} className="rounded-full bg-primary-subtle px-6 py-3"><Label className="text-[13px] font-medium text-primary-text">{setupStage === 'needs-pairing' ? t('onboarding.connectTitle') : t('settings.setUpHome')}</Label></Pressable>
        {/* Someone who started creating another Home and backed out still has their existing ones. */}
        {homes.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel={t('homes.openOne')} onPress={chooseHome} className="rounded-full px-6 py-3 active:opacity-70"><Label className="text-[13px] font-medium text-primary-text">{t('homes.openOne')}</Label></Pressable>}
      </View>
    )}
    </View><View>{hasHomeToShow && <>{section(t('settings.services'), () => show(t('settings.services'), t('settings.servicesDescription')))}
    <CardStrip>{mini(t('settings.miniSecurity'), 'shield', () => show(t('settings.securityTitle'), t('settings.securityDescription')))}{mini(t('settings.miniWorksWithOxy'), 'link', () => show(t('settings.worksWithOxyTitle'), t('settings.worksWithOxyDescription')))}{mini(t('settings.video'), 'video', () => show(t('settings.video'), t('settings.videoDescription')))}{mini(t('settings.music'), 'speaker', () => show(t('settings.music'), t('settings.musicDescription')))}</CardStrip>
    <View className="mb-3 mt-7 flex-row items-center justify-between"><Label className="text-[12px]">{t('settings.homeFeatures')}</Label><Pressable accessibilityRole="button" accessibilityLabel={t('settings.addHomeFeature')} onPress={() => setSheet({ kind: 'menu', title: t('settings.addToHome'), options: [{ label: t('nav.devices'), onPress: () => { setSheet(null); onNavigate('devices'); } }, { label: t('settings.automation'), onPress: () => { setSheet(null); onNavigate('composer'); } }] })} className="flex-row items-center gap-2 rounded-[13px] bg-info-subtle px-4 py-3"><Icon name="plus" size={18} color={themeColors.info}/><Label className="text-[12px] text-info-text">{t('common.add')}</Label></Pressable></View></>}
    <SectionTitle>{t('settings.app')}</SectionTitle>
    <View className="mt-3 flex-row items-center justify-between rounded-[22px] bg-muted p-4"><View className="flex-row items-center gap-3"><Icon name="bell" size={20} color={themeColors.text}/><Label className="text-[13px]">{t('settings.notifications')}</Label></View><Switch accessibilityLabel={t('settings.enableNotifications')} value={notifications} onValueChange={setNotifications} trackColor={{ false: '#d5d9de', true: themeColors.primarySubtle }} thumbColor={notifications ? themeColors.primary : '#fff'}/></View>
    <View className="mt-2 flex-row items-center justify-between rounded-[22px] bg-muted p-4"><View className="min-w-0 flex-1 flex-row items-center gap-3"><Icon name="sparkle" size={20} color={themeColors.text}/><View className="min-w-0 flex-1"><Label className="text-[13px]">{t('settings.demoMode')}</Label><Label className="text-[11px] text-muted-foreground">{t('settings.demoModeDescription')}</Label></View></View><Switch accessibilityLabel={t('settings.enableDemoMode')} value={demoMode} onValueChange={setDemoMode} trackColor={{ false: '#d5d9de', true: themeColors.primarySubtle }} thumbColor={demoMode ? themeColors.primary : '#fff'}/></View>
    <Pressable accessibilityRole="button" onPress={() => show(t('settings.privacy'), t('settings.privacyDescription'))} className="mt-2 flex-row items-center gap-3 rounded-[22px] bg-muted p-4"><Icon name="shield" size={20} color={themeColors.text}/><Label className="flex-1 text-[13px]">{t('settings.privacy')}</Label><Icon name="chevron" size={15} color={themeColors.text}/></Pressable>
  </View></PageColumns></PageScroll></View>;
}
