import type { ReactNode } from 'react';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, type ImageSource } from 'expo-image';
import { styled } from 'nativewind';
import { ROOM_IMAGE } from './fixtures';
import { TONES, type IconName, type Navigate, type ScreenId, type Tone } from './types';

const StyledImage = styled(Image);

export function Icon({ name, size = 22, color = '#444746' }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} accessible={false} />;
}

export function IconButton({ icon, label, onPress, className = 'bg-white', color, disabled = false }: {
  icon: IconName; label: string; onPress: () => void; className?: string; color?: string; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
      disabled={disabled} onPress={onPress}
      className={`h-[44px] w-[44px] items-center justify-center rounded-full active:opacity-60 ${disabled ? 'opacity-40' : ''} ${className}`}>
      <Icon name={icon} color={color} />
    </Pressable>
  );
}

export function Avatar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Open home settings"
      className="h-[44px] w-[44px] items-center justify-center rounded-full active:opacity-60">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-willo-peach">
        <Text className="text-xs font-semibold text-willo-on-peach">W</Text>
      </View>
    </Pressable>
  );
}

export function Header({ onNavigate, title, classic = false, action }: {
  onNavigate: Navigate; title?: string; classic?: boolean; action?: ReactNode;
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  return (
    <>
      <View className={`flex-row items-center gap-2 px-4 pb-4 pt-3 ${classic || title ? 'bg-white' : 'bg-willo-surface'}`}>
        {title ? <Text accessibilityRole="header" className="flex-1 text-lg text-willo-ink">{title}</Text> : (
          <Pressable onPress={() => onNavigate(classic ? 'settings' : 'ask')} accessibilityRole="button"
            accessibilityLabel={classic ? 'Open Spring Street Home settings' : 'Ask Spring Street'}
            className={`min-h-12 min-w-0 flex-1 flex-row items-center gap-3 rounded-full px-4 ${classic ? '' : 'bg-white'}`}>
            <View className="h-7 w-7 items-center justify-center rounded-full bg-willo-surface">
              <Icon name="home" size={16} color={classic ? '#0046ae' : '#444746'} />
            </View>
            <Text numberOfLines={1} className="flex-1 text-base text-willo-ink">{classic ? 'Spring Street Home' : 'Ask Spring Street'}</Text>
            {classic && <Icon name="chevron-down" size={14} />}
          </Pressable>
        )}
        {action ?? (!title && <IconButton icon={classic ? 'notifications-outline' : 'add'}
          label={classic ? 'Open activity' : 'Add to home'} onPress={() => classic ? onNavigate('activity-classic') : setIsAddOpen(true)} />)}
        <Avatar onPress={() => onNavigate('settings')} />
      </View>
      <Sheet title="Add to home" visible={isAddOpen} onClose={() => setIsAddOpen(false)}>
        <Text className="mb-4 text-sm leading-5 text-willo-secondary">Interface preview. Nothing will be connected or scheduled.</Text>
        {([['devices', 'Device', 'apps-outline'], ['create-automation', 'Automation', 'sparkles-outline']] as const).map(([screen, label, icon]) => (
          <Pressable key={screen} onPress={() => { setIsAddOpen(false); onNavigate(screen); }}
            accessibilityRole="button" className="mb-2 flex-row items-center gap-4 rounded-2xl bg-willo-surface p-4 active:opacity-60">
            <Icon name={icon} /><Text className="flex-1 text-base text-willo-ink">{label}</Text><Icon name="chevron-forward" size={18} />
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <View className="mb-3 mt-5 flex-row items-center justify-between gap-3">
    <Text accessibilityRole="header" className="text-sm font-medium text-willo-ink">{children}</Text>{action}
  </View>;
}

export function CameraImage({ source, className }: { source: ImageSource; className: string }) {
  return <StyledImage source={source} contentFit="cover" className={className} accessible={false} />;
}

export function CameraCard({ source = ROOM_IMAGE, label, onPress }: { source?: ImageSource; label?: string; onPress?: () => void }) {
  const [isMuted, setIsMuted] = useState(true);
  return (
    <View className="aspect-video w-full overflow-hidden rounded-[28px] bg-willo-muted">
      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityLabel={`${label ?? 'Living room'} sample camera image, not a live stream`}
        className="absolute inset-0">
        <CameraImage source={source} className="h-full w-full" />
      </Pressable>
      <View pointerEvents="none" className="absolute left-4 top-4 flex-row items-center gap-2 rounded-full bg-black/25 px-2 py-1">
        <View className="h-2 w-2 rounded-full bg-[#72e329]" /><Text className="text-xs font-semibold text-white">Live</Text>
      </View>
      {label && <View pointerEvents="none" className="absolute bottom-3 left-3 rounded-xl bg-black/30 px-3 py-2">
        <Text className="text-xs font-medium text-white">{label}</Text>
      </View>}
      <View className="absolute bottom-2 right-2">
        <IconButton icon={isMuted ? 'volume-mute-outline' : 'volume-high-outline'} label={isMuted ? 'Unmute sample camera' : 'Mute sample camera'}
          onPress={() => setIsMuted(!isMuted)} color="#ffffff" className="bg-black/25" />
      </View>
    </View>
  );
}

export function ActionTile({ icon, title, subtitle, tone = 'neutral', onPress }: {
  icon: IconName; title: string; subtitle?: string; tone?: Tone; onPress: () => void;
}) {
  const colors = TONES[tone];
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      className={`min-h-[82px] min-w-0 flex-1 flex-row items-center gap-3 rounded-[24px] px-4 py-4 active:opacity-70 ${colors.background}`}>
      <Icon name={icon} color={colors.icon} size={21} />
      <View className="min-w-0 flex-1"><Text className={`text-[13px] font-medium ${colors.text}`}>{title}</Text>
        {subtitle && <Text className={`mt-1 text-xs ${colors.text}`}>{subtitle}</Text>}</View>
    </Pressable>
  );
}

export function BottomBar({ screen, onNavigate }: { screen: ScreenId; onNavigate: Navigate }) {
  const isClassic = ['favorites', 'devices', 'routines', 'activity-classic', 'settings'].includes(screen);
  const tabs: { screen: ScreenId; title: string; icon: IconName }[] = isClassic ? [
    { screen: 'favorites', title: 'Favorites', icon: 'heart-outline' },
    { screen: 'devices', title: 'Devices', icon: 'apps-outline' },
    { screen: 'routines', title: 'Automations', icon: 'sparkles-outline' },
    { screen: 'activity-classic', title: 'Activity', icon: 'time-outline' },
    { screen: 'settings', title: 'Settings', icon: 'settings-outline' },
  ] : [
    { screen: 'home', title: 'Home', icon: 'home-outline' },
    { screen: 'activity', title: 'Activity', icon: 'reorder-two-outline' },
    { screen: 'automations', title: 'Automations', icon: 'sparkles-outline' },
  ];
  return (
    <View accessibilityRole="tablist" className="flex-row items-stretch bg-willo-surface px-2 pb-2 pt-2">
      {tabs.map((tab) => {
        const isSelected = screen === tab.screen;
        return <Pressable key={tab.screen} onPress={() => onNavigate(tab.screen, true)}
          accessibilityRole="tab" accessibilityState={{ selected: isSelected }} accessibilityLabel={tab.title}
          className="min-h-14 min-w-0 flex-1 items-center justify-center gap-1 active:opacity-60">
          <View className={`h-8 w-14 items-center justify-center rounded-full ${isSelected ? 'bg-willo-sky' : ''}`}>
            <Icon name={isSelected && tab.screen === 'home' ? 'home' : tab.icon} color={isSelected ? '#005478' : '#444746'} size={21} />
          </View>
          <Text className={`${isClassic ? 'text-[10px]' : 'text-xs'} ${isSelected ? 'font-semibold text-willo-on-sky' : 'text-willo-secondary'}`}>{tab.title}</Text>
        </Pressable>;
      })}
    </View>
  );
}

export function Sheet({ title, visible, onClose, children }: { title: string; visible: boolean; onClose: () => void; children: ReactNode }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View className="flex-1 justify-end bg-black/30">
      <Pressable accessibilityRole="button" accessibilityLabel="Close dialog" onPress={onClose} className="absolute inset-0" />
      <View accessibilityViewIsModal onAccessibilityEscape={onClose}
        className="max-h-[85%] w-full max-w-[520px] self-center rounded-t-[32px] bg-white p-6 pb-10">
        <View className="mb-4 flex-row items-center justify-between gap-3">
          <Text accessibilityRole="header" className="flex-1 text-xl text-willo-ink">{title}</Text>
          <IconButton icon="close" label="Close dialog" onPress={onClose} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}
