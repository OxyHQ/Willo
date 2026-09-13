import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { GARDEN_IMAGE } from './fixtures';
import { CameraCard, CameraImage, Icon, IconButton, Sheet } from './Primitives';
import type { ScreenProps } from './types';

export function AssistantScreen({ onNavigate }: ScreenProps) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  function handleSend() {
    const message = draft.trim();
    if (!message) return;
    setMessages([...messages, message]);
    setDraft('');
  }
  const clips = [
    { title: 'Rabbits nibble plants', time: '1:17 PM' },
    { title: 'Rabbits in garden', time: '12:17 PM' },
    { title: 'Rabbits eat colorful plants', time: '2:10 PM' },
  ];
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
    <View className="flex-row items-center gap-3 px-3 py-2">
      <IconButton icon="arrow-back" label="Back to home" onPress={() => onNavigate('home', true)} />
      <View className="flex-1"><Text className="text-sm font-medium text-willo-ink">Ask Spring Street</Text>
        <Text className="mt-1 text-[10px] text-willo-secondary">Willo · Preview conversation</Text></View>
      <Icon name="sparkles" color="#376f9f" />
    </View>
    <ScrollView ref={scrollRef} className="flex-1" contentContainerClassName="gap-5 px-4 pb-6 pt-4"
      onContentSizeChange={() => { if (messages.length > 0) scrollRef.current?.scrollToEnd({ animated: false }); }}
      keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View className="max-w-[88%] self-end rounded-[22px] rounded-tr-md bg-willo-sky px-4 py-3">
        <Text selectable className="text-sm text-willo-on-sky">Did something eat my plants?</Text>
      </View>
      <Icon name="sparkles" color="#376f9f" size={23} />
      <Text selectable className="text-sm leading-[22px] text-willo-ink">Yes, rabbits ate plants on September 29th and 28th. On September 29th, two rabbits were seen eating colorful plants in the garden multiple times. One brown and gray rabbit were also seen in the garden on September 29th.</Text>
      <Text accessibilityRole="header" className="mt-1 text-sm font-semibold text-willo-ink">Mon, Sep 29</Text>
      <View className="gap-2">{clips.map((clip) => <Pressable key={clip.title} onPress={() => setSelectedClip(clip.title)} accessibilityRole="button"
        className="min-h-[82px] flex-row items-center gap-3 rounded-[22px] bg-willo-surface p-3 active:opacity-70">
        <Icon name="videocam-outline" size={21} /><View className="min-w-0 flex-1"><Text className="text-[13px] text-willo-ink">{clip.title}</Text>
          <Text className="mt-1 text-xs text-willo-secondary">{clip.time} · Garden Bed</Text></View>
        <CameraImage source={GARDEN_IMAGE} className="h-14 w-14 rounded-2xl" />
      </Pressable>)}</View>
      <Text accessibilityRole="header" className="mt-1 text-sm font-semibold text-willo-ink">Sun, Sep 28</Text>
      <Pressable onPress={() => setSelectedClip('Rabbits in garden')} accessibilityRole="button"
        className="flex-row items-center gap-3 rounded-[22px] bg-willo-surface p-3 active:opacity-70">
        <Icon name="videocam-outline" size={21} /><View className="flex-1"><Text className="text-[13px] text-willo-ink">Rabbits in garden</Text>
          <Text className="mt-1 text-xs text-willo-secondary">4:42 PM · Garden Bed</Text></View><CameraImage source={GARDEN_IMAGE} className="h-14 w-14 rounded-2xl" />
      </Pressable>
      {messages.map((message, index) => <View key={index} className="gap-4">
        <View className="max-w-[88%] self-end rounded-[22px] rounded-tr-md bg-willo-sky px-4 py-3"><Text selectable className="text-sm text-willo-on-sky">{message}</Text></View>
        <View className="flex-row items-start gap-3"><Icon name="sparkles" color="#376f9f" size={20} /><Text className="flex-1 text-sm leading-5 text-willo-secondary">This is an interface preview. Your message was not sent to an assistant or to any device.</Text></View>
      </View>)}
    </ScrollView>
    <View className="gap-2 px-4 pb-3 pt-2">
      <View className="min-h-12 flex-row items-center gap-2 rounded-full bg-willo-surface pl-4 pr-1">
        <TextInput value={draft} onChangeText={setDraft} placeholder="Ask Spring Street" placeholderTextColor="#62666b"
          accessibilityLabel="Message for the home assistant preview" className="min-h-12 flex-1 text-sm text-willo-ink"
          maxLength={1000} onSubmitEditing={handleSend} returnKeyType="send" />
        <IconButton icon="send-outline" label="Send preview message" onPress={handleSend} disabled={!draft.trim()} className="bg-transparent" />
      </View>
      <Text className="text-center text-[10px] text-willo-secondary">Sample conversation. No messages leave this screen.</Text>
    </View>
    <Sheet title={selectedClip ?? 'Sample clip'} visible={selectedClip !== null} onClose={() => setSelectedClip(null)}>
      <CameraCard source={GARDEN_IMAGE} label="Garden Bed" /><Text className="mt-4 text-sm text-willo-secondary">Sample thumbnail, not a playable recording.</Text>
    </Sheet>
  </KeyboardAvoidingView>;
}
