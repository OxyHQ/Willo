import React, { createContext, useContext, useState } from 'react';
import { KeyboardAvoidingView, Pressable, TextInput, View } from 'react-native';
import { PageScroll, CardStrip, ContentWidth } from '../layout/page-layout';
import { Icon } from '@willo.sh/ui';
import { IconButton, Label } from '@willo.sh/ui';
import { type ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import { useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';
import type { ParseKeys } from 'i18next';
const suggestions: { titleKey: ParseKeys; textKey: ParseKeys }[] = [
  { titleKey: 'composer.suggestions.seemHomeTitle', textKey: 'composer.suggestions.seemHomeText' },
  { titleKey: 'composer.suggestions.saveEnergyTitle', textKey: 'composer.suggestions.saveEnergyText' },
  { titleKey: 'composer.suggestions.playMusicTitle', textKey: 'composer.suggestions.playMusicText' },
];

// The header's Save action is disabled/enabled by the same draft text the
// body edits, and saving needs to hand off to the body's review toggle —
// header and body are siblings in the layout, so that shared state lives
// here instead of either one owning it.
type ComposerValue = { text: string; setText: (value: string) => void; review: boolean; setReview: (value: boolean) => void; valid: boolean; save: () => void };
const ComposerContext = createContext<ComposerValue | null>(null);
function useComposer(): ComposerValue {
  const value = useContext(ComposerContext);
  if (!value) throw new Error('ComposerHeader/ComposerScreen must be rendered inside ComposerProvider.');
  return value;
}
export function ComposerProvider({ onNavigate, children }: ScreenProps & { children: React.ReactNode }) {
  const { dispatch, notify } = useHome();
  const { t } = useTranslation();
  const [text, setText] = useState(() => t('composer.defaultText'));
  const [review, setReview] = useState(false);
  const valid = text.trim().length >= 8;
  function save() {
    if (!valid) return;
    const title = text.trim();
    dispatch({ type: 'ADD_ROUTINE', routine: { id: `custom-${Date.now()}`, title: title.length > 42 ? title.slice(0, 39) + '…' : title, description: title, icon: 'sparkle' } });
    notify(t('composer.saved'));
    onNavigate('automations');
  }
  return <ComposerContext.Provider value={{ text, setText: value => { setText(value); setReview(false); }, review, setReview, valid, save }}>{children}</ComposerContext.Provider>;
}
export function ComposerHeader({ onNavigate }: ScreenProps) {
  const { valid, save } = useComposer();
  const { t } = useTranslation();
  return <ContentWidth maxWidth={808}><View className="flex-row items-center justify-between pt-2"><IconButton icon="close" label={t('composer.cancel')} onPress={() => onNavigate('automations')}/><Label className="text-[14px]">{t('composer.title')}</Label><Pressable accessibilityRole="button" accessibilityLabel={t('composer.saveLabel')} disabled={!valid} onPress={save} className={`px-3 py-3 ${!valid ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}`}><Label className="text-[14px] font-medium text-info-text">{t('composer.save')}</Label></Pressable></View></ContentWidth>;
}
export function ComposerScreen({ onNavigate: _onNavigate, header }: ScreenProps) {
  const { text, setText, review, setReview, valid } = useComposer();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
  return <KeyboardAvoidingView className="flex-1 bg-card" behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
    <PageScroll maxWidth={808}>
      {header}
      <View className="pb-5 pt-7"><Icon name="sparkle" size={23} color={themeColors.primary}/><TextInput accessibilityLabel={t('composer.describe')} multiline textAlignVertical="top" value={text} onChangeText={setText} placeholder={t('composer.placeholder')} placeholderTextColor={themeColors.textSecondary} maxLength={500} className="mt-5 min-h-[220px] text-[29px] leading-[37px] text-foreground" style={{ fontFamily: 'System' }}/></View>
      <CardStrip>{suggestions.map((item, index) => <Pressable key={item.titleKey} accessibilityRole="button" onPress={() => setText(t(item.textKey))} className={`w-[138px] rounded-[19px] p-3 ${index === 1 ? 'bg-primary-subtle' : 'bg-muted'}`}><Label className={`text-[12px] leading-[17px] ${index === 1 ? 'text-primary-text' : ''}`}>{t(item.titleKey)}</Label></Pressable>)}</CardStrip>
      <View className="mt-7 gap-4"><Pressable disabled={!valid} onPress={() => setReview(!review)} accessibilityRole="button" accessibilityLabel={t('composer.review')} className={`flex-row items-center justify-center gap-2 rounded-full bg-primary-subtle py-4 ${!valid ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}`}><Icon name="sparkle" size={18} color={themeColors.primary}/><Label className="text-[14px] font-medium text-primary-text">{review ? t('composer.hidePreview') : t('composer.review')}</Label></Pressable>
        {review && <View className="gap-3 rounded-[24px] bg-muted p-5"><Label className="text-[13px] font-medium">{t('composer.previewTitle')}</Label><Label className="text-[14px] leading-[21px]">{text}</Label><Label className="text-[12px] leading-[18px] text-muted-foreground">{t('composer.previewNote')}</Label></View>}
        <Label className="text-center text-[11px] leading-[16px] text-muted-foreground">{t('composer.footer')}</Label>
      </View>
    </PageScroll>
  </KeyboardAvoidingView>;
}
