import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon } from './Primitives';
import { TONES, type Device } from './types';

export function DeviceTile({ device, onPress }: { device: Device; onPress?: () => void }) {
  const [isActive, setIsActive] = useState(device.isActive);
  const colors = TONES[isActive ? device.tone : 'neutral'];
  return (
    <Pressable onPress={onPress ?? (() => setIsActive(!isActive))}
      accessibilityRole={onPress ? 'button' : 'switch'}
      accessibilityState={onPress ? undefined : { checked: isActive }}
      accessibilityLabel={`${device.name}, ${isActive ? device.status : device.inactiveStatus}`}
      className={`min-h-[82px] min-w-0 flex-1 flex-row items-center gap-3 overflow-hidden rounded-[24px] px-4 py-4 active:opacity-70 ${colors.background}`}>
      {isActive && device.brightness !== undefined && <View pointerEvents="none"
        className={`absolute bottom-0 left-0 top-0 ${colors.fill}`}
        style={{ width: `${Math.max(0, Math.min(100, device.brightness))}%` }} />}
      <Icon name={device.icon} color={colors.icon} size={23} />
      <View className="min-w-0 flex-1">
        <Text className={`text-[13px] font-medium ${colors.text}`}>{device.name}</Text>
        <Text className={`mt-1 text-xs ${colors.text}`}>{isActive ? device.status : device.inactiveStatus}</Text>
      </View>
      {onPress && <Icon name="chevron-forward" size={16} color={colors.icon} />}
    </Pressable>
  );
}
