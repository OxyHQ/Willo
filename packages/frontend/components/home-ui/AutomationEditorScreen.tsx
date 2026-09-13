import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Icon, IconButton, Sheet } from './Primitives';
import type { ScreenProps } from './types';

const SUGGESTIONS = [
  { title: 'Make it seem like someone’s home', text: 'When no one is home in the evening, turn on the living room lights' },
  { title: 'Save energy while I’m at work', text: 'When no one is home on weekday mornings, turn off all lights' },
  { title: 'Play some music when I get home', text: 'When I get home, play music in the living room' },
];

export function AutomationEditorScreen({ onNavigate }: ScreenProps) {
  const [instruction, setInstruction] = useState('When no one is home on weekday mornings, turn off all lights');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
    <View className="flex-row items-center justify-between px-3 py-2">
      <IconButton icon="close" label="Close automation editor" onPress={() => onNavigate('automations', true)} />
      <Pressable disabled={!instruction.trim()} onPress={() => setIsPreviewOpen(true)} accessibilityRole="button"
        accessibilityState={{ disabled: !instruction.trim() }} className={`min-h-[44px] justify-center rounded-full px-4 ${!instruction.trim() ? 'opacity-40' : ''}`}>
        <Text className="text-sm font-semibold text-willo-on-sky">Preview</Text>
      </Pressable>
    </View>
    <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-6 pt-6" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View className="gap-5 px-5">
        <Icon name="create-outline" color="#376f9f" size={27} />
        <TextInput multiline value={instruction} onChangeText={setInstruction} maxLength={1000}
          accessibilityLabel="Describe your automation" placeholder="Describe what you’d like your home to do"
          placeholderTextColor="#75797e" textAlignVertical="top" scrollEnabled={false}
          className="min-h-[180px] text-[29px] leading-[38px] text-willo-ink" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5" keyboardShouldPersistTaps="handled">
        {SUGGESTIONS.map((suggestion) => <Pressable key={suggestion.title} onPress={() => setInstruction(suggestion.text)} accessibilityRole="button"
          accessibilityState={{ selected: instruction === suggestion.text }}
          className={`min-h-[88px] w-[144px] justify-center rounded-2xl px-3 py-4 active:opacity-70 ${instruction === suggestion.text ? 'bg-willo-sky' : 'bg-willo-surface'}`}>
          <Text className="text-xs leading-5 text-willo-ink">{suggestion.title}</Text>
        </Pressable>)}
      </ScrollView>
      <Text className="px-5 text-xs leading-5 text-willo-secondary">Interface preview. These instructions are not sent, interpreted or scheduled.</Text>
    </ScrollView>
    <Sheet visible={isPreviewOpen} title="Automation preview" onClose={() => setIsPreviewOpen(false)}>
      <View className="gap-3 rounded-[24px] bg-willo-surface p-5"><Icon name="sparkles-outline" color="#005478" />
        <Text selectable className="text-lg leading-7 text-willo-ink">{instruction.trim()}</Text></View>
      <Text className="mt-4 text-sm leading-5 text-willo-secondary">No automation was created. This is a local preview of the editor’s contents.</Text>
    </Sheet>
  </KeyboardAvoidingView>;
}
