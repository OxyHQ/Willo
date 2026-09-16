import React, { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Pressable, TextInput, View } from 'react-native';
import { PageScroll, ContentWidth } from '../layout/page-layout';
import { Icon } from '@willo.sh/ui';
import { IconButton, Label } from '@willo.sh/ui';
import { assets } from '../data/assets';
import { type ScreenProps } from '../data/screens';
import { useHome, useHomeActions } from '../state/home-context';
import { useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';
import type { ParseKeys } from 'i18next';
import type { ImageSource } from 'expo-image';
type Clip = { titleKey: ParseKeys; hour: number; minute: number; image: ImageSource };
const clips: Clip[] = [
  { titleKey: 'assistant.clips.nibble', hour: 13, minute: 17, image: assets.rabbitPlants },
  { titleKey: 'assistant.clips.inGarden', hour: 12, minute: 17, image: assets.rabbit },
  { titleKey: 'assistant.clips.colorful', hour: 14, minute: 10, image: assets.flowers },
];
// Whether a question is about the demo's plants/rabbits, in either language — the only question this local demo has example results for.
const PLANT_QUESTION = /plant|rabbit|garden|eat|planta|conejo|jard[ií]n|com(e|ido|ieron|i[oó])/i;
export function AssistantHeader({ onNavigate }: ScreenProps) {
  const { homeName } = useHome();
  const { t } = useTranslation();
  return <ContentWidth maxWidth={808}><View className="flex-row items-center gap-2 pt-2"><IconButton icon="back" label={t('assistant.back')} onPress={() => onNavigate('home')}/><Label className="text-[13px] text-muted-foreground">{t('header.ask', { home: homeName })}</Label></View></ContentWidth>;
}
export function AssistantScreen({ onNavigate }: ScreenProps) {
  const { homeName } = useHome();
  const { setSheet } = useHomeActions();
  const { colors: themeColors } = useTheme();
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  // `null` is the demo's own opening question, so it follows the UI language until the person asks their own.
  const [question, setQuestion] = useState<string | null>(null);
  const [showClips, setShowClips] = useState(true);
  const submit = () => {
    if (!input.trim()) return;
    setQuestion(input.trim());
    setShowClips(PLANT_QUESTION.test(input));
    setInput('');
  };
  // Same reasoning as `AutomationsScreen`'s: one formatter per language, not one per clip per render.
  const timeFormat = useMemo(() => new Intl.DateTimeFormat(i18n.language, { hour: 'numeric', minute: '2-digit' }), [i18n.language]);
  const clip = (item: Clip) => { const title = t(item.titleKey); const time = timeFormat.format(new Date(2000, 0, 1, item.hour, item.minute)); return <Pressable key={item.titleKey} accessibilityRole="button" accessibilityLabel={title} onPress={() => setSheet({ kind: 'camera', title: t('assistant.clipTitle', { title }), garden: true })} className="min-h-[75px] flex-row items-center gap-3 rounded-[23px] bg-muted p-3"><Icon name="camera" size={20} color={themeColors.text}/><View className="flex-1"><Label className="text-[12px] leading-[17px]">{title}</Label><Label className="text-[11px] text-muted-foreground">{t('assistant.clipTime', { time })}</Label></View><View className="h-[55px] w-[55px] overflow-hidden rounded-[16px]"><Image source={item.image} style={{ width: '100%', height: '100%' }} contentFit="cover"/></View></Pressable>; };
  return <KeyboardAvoidingView className="flex-1" behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
    <PageScroll maxWidth={808}>
            <View className="mb-6 max-w-[90%] self-end rounded-[22px] rounded-br-[5px] bg-primary-subtle px-4 py-3"><Label className="text-[13px] text-primary-text">{question ?? t('assistant.defaultQuestion')}</Label></View>
      <View className="mb-5"><Icon name="sparkle" size={22} color="#4285f4" filled/></View>
      <Label selectable className="text-[13px] leading-[20px]">{showClips ? t('assistant.plantAnswer') : t('assistant.notConnected')}</Label>
      {showClips && <><Label className="mb-3 mt-6 px-1 text-[13px] font-medium">{t('assistant.dateSep29')}</Label><View className="gap-2">{clips.map(clip)}</View><Label className="mb-3 mt-5 px-1 text-[13px] font-medium">{t('assistant.dateSep28')}</Label>{clip({ titleKey: 'assistant.clips.inTheGarden', hour: 16, minute: 35, image: assets.rabbit })}</>}
    </PageScroll>
    <ContentWidth maxWidth={808}><View className="bg-card pb-3 pt-2"><View className="flex-row items-center rounded-full bg-muted pl-4 pr-1"><TextInput accessibilityLabel={t('header.ask', { home: homeName })} placeholder={t('header.ask', { home: homeName })} placeholderTextColor={themeColors.textSecondary} value={input} onChangeText={setInput} onSubmitEditing={submit} returnKeyType="send" maxLength={300} className="h-[48px] flex-1 text-[13px] text-foreground"/><IconButton icon="send" size={19} label={t('assistant.send')} disabled={!input.trim()} color={themeColors.primary} onPress={submit}/></View><Pressable onPress={() => setSheet({ kind: 'message', title: t('assistant.aboutTitle'), description: t('assistant.aboutDescription') })} accessibilityRole="button" className="py-3"><Label className="text-center text-[9px] text-muted-foreground">{t('assistant.disclaimer')} <Label className="text-[9px] text-muted-foreground underline">{t('assistant.learnMore')}</Label></Label></Pressable></View></ContentWidth>
  </KeyboardAvoidingView>;
}
