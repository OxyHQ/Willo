import React from 'react';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { type HomeEvent } from '../data/events';
import { useHome } from '../state/home-context';
import { Icon } from '@willo/ui';
import { Label } from '@willo/ui';
export function EventRow({ event, card = false }: { event: HomeEvent; card?: boolean }) {
  const { setSheet } = useHome();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${event.title}, ${event.time}`} onPress={() => event.image ? setSheet({ kind: 'camera', title: event.location, garden: event.garden }) : setSheet({ kind: 'message', title: event.title, description: `${event.time} · ${event.day}\nThis is a sample security event from the reference UI.` })} className={`flex-row items-center gap-3 ${card ? 'mb-2 min-h-[82px] rounded-[22px] bg-home-surface px-3 py-3' : 'min-h-[87px] py-2'}`}>
    <Icon name={event.category === 'security' ? 'home' : 'camera'} size={18}/><View className={`min-w-0 flex-1 flex-row items-center gap-2 ${!card ? 'border-b border-border pb-3 pt-1' : ''}`}><View className="min-w-0 flex-1 gap-1"><Label className="text-[12px] leading-[16px]">{event.title}</Label><Label className="text-[10px] leading-[14px] text-muted-foreground">{event.time}{event.location ? ` · ${event.location}` : ''}</Label></View>{event.image && <View className={`overflow-hidden ${card ? 'h-[54px] w-[54px] rounded-[14px]' : 'h-[70px] w-[102px] rounded-lg'}`}><Image source={event.image} style={{ width: '100%', height: '100%' }} contentFit="cover"/></View>}</View>
  </Pressable>;
}
