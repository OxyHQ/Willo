import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, Switch, View } from 'react-native';
import { PageScroll, PageColumns, CardStrip } from '../layout/page-layout';
import { Icon, SectionTitle, type IconName } from '@willo/ui';
import { IconButton, Label } from '@willo/ui';
import { assets } from '../data/assets';
import { type ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import type { UnitSystem } from '../providers/unit-system';
import { useTheme } from '@oxy.so/bloom/theme';
const UNIT_SYSTEM_LABELS: Record<UnitSystem, string> = { metric: 'Metric (°C)', imperial: 'Imperial (°F)' };
export function SettingsScreen({ onNavigate, header }: ScreenProps) {
  const { setSheet, setupStage, homeName, demoMode, setDemoMode, unitSystem, setUnitSystem } = useHome();
  const { colors: themeColors } = useTheme();
  const [notifications, setNotifications] = useState(true);
  // A real Home to show settings FOR, or a preview of what they'd look
  // like once one exists — either way, distinct from the App section below,
  // which is a per-device preference with no Home behind it at all (that's
  // exactly what was confusing about this screen when Settings became
  // reachable before any Home was set up: the Home name/members/devices
  // sections rendered regardless, for a Home that didn't exist yet).
  const hasHomeToShow = setupStage === 'ready' || demoMode;
  const show = (title: string, description: string) => setSheet({ kind: 'message', title, description });
  const chooseUnits = () => setSheet({ kind: 'menu', title: 'Units', description: `Shared by everyone in ${homeName}.`, options: (['metric', 'imperial'] as const).map(option => ({
    label: UNIT_SYSTEM_LABELS[option],
    selected: option === unitSystem,
    onPress: () => { setUnitSystem(option); setSheet(null); },
  })) });
  const section = (title: string, action: () => void) => <Pressable accessibilityRole="button" onPress={action} className="mb-3 mt-7 flex-row items-center justify-between"><Label className="text-[12px]">{title}</Label><View className="h-7 w-7 items-center justify-center rounded-full bg-muted"><Icon name="chevron" size={14} color={themeColors.text}/></View></Pressable>;
  const mini = (title: string, icon: IconName, action: () => void) => <Pressable key={title} accessibilityRole="button" onPress={action} className="h-[101px] w-[99px] justify-between rounded-[23px] bg-muted p-3.5 active:opacity-70"><Icon name={icon} size={18} color={themeColors.text}/><Label className="text-[11px] leading-[15px]">{title}</Label></Pressable>;
  return <View className="flex-1 bg-card"><PageScroll>{header}<PageColumns><View>
    <SectionTitle>Home</SectionTitle>
    {hasHomeToShow ? <>
      <Pressable onPress={() => show('Home details', `${homeName}\n\nNo address is stored for this Home yet.`)} accessibilityRole="button" className="mb-2 mt-3 flex-row items-center justify-between"><Label className="text-[34px] font-semibold">{homeName}</Label><View className="h-7 w-7 items-center justify-center rounded-full bg-muted"><Icon name="chevron" size={14} color={themeColors.text}/></View></Pressable>
      <View className="mt-5 flex-row items-center gap-2"><View className="h-9 w-9 overflow-hidden rounded-full"><Image source={assets.avatar} style={{ width: '100%', height: '100%' }}/></View><Pressable accessibilityRole="button" accessibilityLabel="Household member L" onPress={() => show('Household member', 'L is a sample household member from the reference UI.')} className="h-9 w-9 items-center justify-center rounded-full bg-primary-subtle"><Label className="text-[13px] text-primary-text">L</Label></Pressable><IconButton icon="plus" label="Invite household member" size={15} shape="small" className="bg-muted" onPress={() => show('Invite a household member', 'No invitation is sent in this demo. Connect your own household membership service here.')}/></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Units, ${UNIT_SYSTEM_LABELS[unitSystem]}`} onPress={chooseUnits} className="mt-5 flex-row items-center gap-3 rounded-[22px] bg-muted p-4 active:opacity-70"><Icon name="thermometer" size={20} color={themeColors.text}/><Label className="flex-1 text-[13px]">Units</Label><Label className="text-[13px] text-muted-foreground">{UNIT_SYSTEM_LABELS[unitSystem]}</Label><Icon name="chevron" size={15} color={themeColors.text}/></Pressable>
      {section('Devices, groups & rooms', () => onNavigate('devices'))}
      <CardStrip>{mini('Hallway\nthermostat', 'thermometer', () => onNavigate('home'))}{mini('Front door\nlock', 'lock', () => onNavigate('home'))}{mini('Office WiFi', 'wifi', () => show('Office WiFi', 'Wi-Fi settings placeholder. No router or network is connected.'))}{mini('Living room', 'light', () => onNavigate('devices'))}</CardStrip>
    </> : (
      <View className="mt-3 items-center gap-3 rounded-[24px] bg-muted p-6">
        <Icon name="home" size={26} color={themeColors.textSecondary}/>
        <Label className="text-center text-[13px] text-muted-foreground">No home set up yet — finish setup to manage devices, rooms and members here, or turn on Demo mode below to preview it.</Label>
        <Pressable accessibilityRole="button" accessibilityLabel="Set up your home" onPress={() => onNavigate('onboarding')} className="rounded-full bg-primary-subtle px-6 py-3"><Label className="text-[13px] font-medium text-primary-text">Set up your home</Label></Pressable>
      </View>
    )}
    </View><View>{hasHomeToShow && <>{section('Services', () => show('Services', 'Service cards are visual references only. No Oxy or video account is connected.'))}
    <CardStrip>{mini('Willo\nSecurity', 'shield', () => show('Willo Security', 'This is a recreation of the reference service tile — Willo’s own native security monitoring, not a third-party integration.'))}{mini('Works with\nOxy', 'link', () => show('Works with Oxy', 'Your Home signs in with your Oxy account — this reference tile does not link anything further.'))}{mini('Video', 'video', () => show('Video', 'Camera images are local stills cropped from the supplied references.'))}{mini('Music', 'speaker', () => show('Music', 'No music account connected.'))}</CardStrip>
    <View className="mb-3 mt-7 flex-row items-center justify-between"><Label className="text-[12px]">Home features</Label><Pressable accessibilityRole="button" accessibilityLabel="Add home feature" onPress={() => setSheet({ kind: 'menu', title: 'Add to your home', options: [{ label: 'Devices', onPress: () => { setSheet(null); onNavigate('devices'); } }, { label: 'Automation', onPress: () => { setSheet(null); onNavigate('composer'); } }] })} className="flex-row items-center gap-2 rounded-[13px] bg-info-subtle px-4 py-3"><Icon name="plus" size={18} color={themeColors.info}/><Label className="text-[12px] text-info-text">Add</Label></Pressable></View></>}
    <SectionTitle>App</SectionTitle>
    <View className="mt-3 flex-row items-center justify-between rounded-[22px] bg-muted p-4"><View className="flex-row items-center gap-3"><Icon name="bell" size={20} color={themeColors.text}/><Label className="text-[13px]">Notifications</Label></View><Switch accessibilityLabel="Enable demo notifications" value={notifications} onValueChange={setNotifications} trackColor={{ false: '#d5d9de', true: themeColors.primarySubtle }} thumbColor={notifications ? themeColors.primary : '#fff'}/></View>
    <View className="mt-2 flex-row items-center justify-between rounded-[22px] bg-muted p-4"><View className="min-w-0 flex-1 flex-row items-center gap-3"><Icon name="sparkle" size={20} color={themeColors.text}/><View className="min-w-0 flex-1"><Label className="text-[13px]">Demo mode</Label><Label className="text-[11px] text-muted-foreground">Preview a fully-stocked smart home instead of your real devices</Label></View></View><Switch accessibilityLabel="Enable demo mode" value={demoMode} onValueChange={setDemoMode} trackColor={{ false: '#d5d9de', true: themeColors.primarySubtle }} thumbColor={demoMode ? themeColors.primary : '#fff'}/></View>
    <Pressable accessibilityRole="button" onPress={() => show('Privacy', 'This recreation uses local state and static assets only. It does not request camera, microphone or location permissions. Session state resets when the app is restarted.')} className="mt-2 flex-row items-center gap-3 rounded-[22px] bg-muted p-4"><Icon name="shield" size={20} color={themeColors.text}/><Label className="flex-1 text-[13px]">Privacy</Label><Icon name="chevron" size={15} color={themeColors.text}/></Pressable>
  </View></PageColumns></PageScroll></View>;
}
