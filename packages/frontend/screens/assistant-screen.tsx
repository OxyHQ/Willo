import React, { useState } from 'react';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Pressable, TextInput, View } from 'react-native';
import { PageScroll, ContentWidth } from '../layout/page-layout';
import { Icon } from '@willo/ui';
import { IconButton, Label } from '@willo/ui';
import { assets } from '../data/assets';
import { type ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import { colors } from '@willo/ui';
const plantAnswer = 'Yes, rabbits ate plants on September 29th and 28th. On September 29th, two rabbits were seen eating colorful plants in the garden multiple times. One brown and gray rabbit were also seen in the garden on September 29th.';
const clips = [
  { title: 'Rabbits nibble plants', time: '1:17 PM', image: assets.rabbitPlants },
  { title: 'Rabbits in garden', time: '12:17 PM', image: assets.rabbit },
  { title: 'Rabbits eat colorful plants', time: '2:10 PM', image: assets.flowers },
];
export function AssistantScreen({ onNavigate }: ScreenProps) {
  const { setSheet } = useHome();
  const [input, setInput] = useState('');
  const [question, setQuestion] = useState('Did something eat my plants?');
  const [showClips, setShowClips] = useState(true);
  const submit = () => {
    if (!input.trim()) return;
    setQuestion(input.trim());
    setShowClips(/plant|rabbit|garden|eat/i.test(input));
    setInput('');
  };
  const clip = (item: typeof clips[number]) => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => setSheet({ kind: 'camera', title: `${item.title} · Garden Bed`, garden: true })} className="min-h-[75px] flex-row items-center gap-3 rounded-[23px] bg-home-surface p-3"><Icon name="camera" size={20}/><View className="flex-1"><Label className="text-[12px] leading-[17px]">{item.title}</Label><Label className="text-[11px] text-home-muted">{item.time} · Garden Bed</Label></View><View className="h-[55px] w-[55px] overflow-hidden rounded-[16px]"><Image source={item.image} style={{ width: '100%', height: '100%' }} contentFit="cover"/></View></Pressable>;
  return <KeyboardAvoidingView className="flex-1 bg-white" behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
    <ContentWidth maxWidth={808}><View className="flex-row items-center gap-2 pb-2 pt-3"><IconButton icon="back" label="Back to home" onPress={() => onNavigate('home')}/><Label className="text-[13px] text-home-muted">Ask Spring Street</Label></View></ContentWidth>
    <PageScroll maxWidth={808}>
      <View className="mb-6 max-w-[90%] self-end rounded-[22px] rounded-br-[5px] bg-home-sky px-4 py-3"><Label className="text-[13px] text-home-on-sky">{question}</Label></View>
      <View className="mb-5"><Icon name="sparkle" size={22} color="#4285f4" filled/></View>
      <Label selectable className="text-[13px] leading-[20px]">{showClips ? plantAnswer : 'This is a local interface demo, not a connected AI assistant. Try asking about the plants or rabbits to explore the example camera results.'}</Label>
      {showClips && <><Label className="mb-3 mt-6 px-1 text-[13px] font-medium">Mon, Sep 29</Label><View className="gap-2">{clips.map(clip)}</View><Label className="mb-3 mt-5 px-1 text-[13px] font-medium">Sun, Sep 28</Label>{clip({ title: 'Rabbits in the garden', time: '4:35 PM', image: assets.rabbit })}</>}
    </PageScroll>
    <ContentWidth maxWidth={808}><View className="bg-white pb-3 pt-2"><View className="flex-row items-center rounded-full bg-home-surface pl-4 pr-1"><TextInput accessibilityLabel="Ask Spring Street" placeholder="Ask Spring Street" placeholderTextColor={colors.muted} value={input} onChangeText={setInput} onSubmitEditing={submit} returnKeyType="send" maxLength={300} className="h-[48px] flex-1 text-[13px] text-home-ink"/><IconButton icon="send" size={19} label="Send question" disabled={!input.trim()} color={colors.onSky} onPress={submit}/></View><Pressable onPress={() => setSheet({ kind: 'message', title: 'About this preview', description: 'The disclaimer and sample conversation reproduce the supplied reference. This demo does not use Gemini or any other AI service.' })} accessibilityRole="button" className="py-3"><Label className="text-center text-[9px] text-home-muted">Gemini can make mistakes, so double check it. <Label className="text-[9px] text-home-muted underline">Learn more</Label></Label></Pressable></View></ContentWidth>
  </KeyboardAvoidingView>;
}
