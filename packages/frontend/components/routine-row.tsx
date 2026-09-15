import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon, type IconName } from '@willo/ui';
import { Label } from '@willo/ui';
import { useHome } from '../state/home-context';
import { useTheme } from '@oxy.so/bloom/theme';
export function RoutineRow({ title, description, icon, playable = true, onRun }: { title: string; description: string; icon: IconName; playable?: boolean; onRun?: () => void }) {
  const { notify, setSheet } = useHome();
  const { colors: themeColors } = useTheme();
  const run = onRun ?? (() => notify(`${title} started in demo`));
  return <View className="min-h-[75px] flex-row items-center gap-3 rounded-[23px] bg-muted px-4 py-3">
    <Icon name={icon} size={20} color={themeColors.text}/><Pressable accessibilityRole="button" accessibilityLabel={`View ${title}`} onPress={() => setSheet({ kind: 'message', title, description: `${description}\n\nReference routine. This demo does not schedule or control real devices.` })} className="min-w-0 flex-1 gap-1"><Label className="text-[13px] font-medium">{title}</Label><Label className="text-[10px] leading-[14px]" numberOfLines={1}>{description}</Label></Pressable>
    {playable && <Pressable onPress={run} accessibilityRole="button" accessibilityLabel={`Run ${title}`} className="h-10 w-10 items-center justify-center rounded-full bg-white active:opacity-60"><Icon name="play" size={16}/></Pressable>}
  </View>;
}
