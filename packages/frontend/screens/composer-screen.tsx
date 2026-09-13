import { Icon, IconButton, Label, colors } from '@willo/ui';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Pressable, TextInput, View } from 'react-native';
import { PageScroll, CardStrip, ContentWidth } from '../layout/page-layout';
import { type ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
const suggestions = [
  { title: 'Make it seem like someone’s home', text: 'When no one is home in the evening, turn on the living room lights' },
  { title: 'Save energy while I’m at work', text: 'When no one is home on weekday mornings, turn off all lights' },
  { title: 'Play something when I get home', text: 'When I arrive home, play my favorite music' },
];
export function ComposerScreen({ onNavigate }: ScreenProps) {
  const { dispatch, notify } = useHome();
  const [text, setText] = useState('When no one is home on weekday mornings, turn off all lights');
  const [review, setReview] = useState(false);
  const valid = text.trim().length >= 8;
  function save() {
    if (!valid) return;
    const title = text.trim();
    dispatch({ type: 'ADD_ROUTINE', routine: { id: `custom-${Date.now()}`, title: title.length > 42 ? title.slice(0, 39) + '…' : title, description: title, icon: 'sparkle' } });
    notify('Automation saved in this demo session');
    onNavigate('automations');
  }
  return <KeyboardAvoidingView className="flex-1 bg-white" behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
    <ContentWidth maxWidth={808}><View className="flex-row items-center justify-between pb-2 pt-3"><IconButton icon="close" label="Cancel automation" onPress={() => onNavigate('automations')}/><Label className="text-[14px]">Create automation</Label><Pressable accessibilityRole="button" accessibilityLabel="Save automation" disabled={!valid} onPress={save} className={`px-3 py-3 ${!valid ? 'opacity-30' : ''}`}><Label className="text-[14px] font-medium text-home-on-blue">Save</Label></Pressable></View></ContentWidth>
    <PageScroll maxWidth={808}>
      <View className="pb-5 pt-7"><Icon name="sparkle" size={23} color={colors.onSky}/><TextInput accessibilityLabel="Describe your automation" multiline textAlignVertical="top" value={text} onChangeText={value => { setText(value); setReview(false); }} placeholder="Describe what you want your home to do" placeholderTextColor={colors.muted} maxLength={500} className="mt-5 min-h-[220px] text-[29px] leading-[37px] text-home-ink" style={{ fontFamily: 'System' }}/></View>
      <CardStrip>{suggestions.map((item, index) => <Pressable key={item.title} accessibilityRole="button" onPress={() => { setText(item.text); setReview(false); }} className={`w-[138px] rounded-[19px] p-3 ${index === 1 ? 'bg-home-sky' : 'bg-home-surface'}`}><Label className={`text-[12px] leading-[17px] ${index === 1 ? 'text-home-on-sky' : ''}`}>{item.title}</Label></Pressable>)}</CardStrip>
      <View className="mt-7 gap-4"><Pressable disabled={!valid} onPress={() => setReview(value => !value)} accessibilityRole="button" accessibilityLabel="Review automation" className={`flex-row items-center justify-center gap-2 rounded-full bg-home-sky py-4 ${!valid ? 'opacity-30' : ''}`}><Icon name="sparkle" size={18} color={colors.onSky}/><Label className="text-[14px] font-medium text-home-on-sky">{review ? 'Hide preview' : 'Review automation'}</Label></Pressable>
        {review && <View className="gap-3 rounded-[24px] bg-home-surface p-5"><Label className="text-[13px] font-medium">Automation preview</Label><Label className="text-[14px] leading-[21px]">{text}</Label><Label className="text-[12px] leading-[18px] text-home-muted">This is a local draft, not an AI-generated or scheduled automation. Save adds it to Your automations.</Label></View>}
        <Label className="text-center text-[11px] leading-[16px] text-home-muted">Preview only. No devices or scheduling services are connected.</Label>
      </View>
    </PageScroll>
  </KeyboardAvoidingView>;
}
