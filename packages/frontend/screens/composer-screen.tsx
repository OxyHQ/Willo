import React, { createContext, useContext, useState } from 'react';
import { KeyboardAvoidingView, Pressable, TextInput, View } from 'react-native';
import { PageScroll, CardStrip, ContentWidth } from '../layout/page-layout';
import { Icon } from '@willo.sh/ui';
import { IconButton, Label } from '@willo.sh/ui';
import { type ScreenProps } from '../data/screens';
import { useHomeActions } from '../state/home-context';
import { useComposer } from './composer-draft';
import { useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';
import type { ParseKeys } from 'i18next';
const suggestions: { titleKey: ParseKeys; textKey: ParseKeys }[] = [
  { titleKey: 'composer.suggestions.seemHomeTitle', textKey: 'composer.suggestions.seemHomeText' },
  { titleKey: 'composer.suggestions.saveEnergyTitle', textKey: 'composer.suggestions.saveEnergyText' },
  { titleKey: 'composer.suggestions.playMusicTitle', textKey: 'composer.suggestions.playMusicText' },
];

export function ComposerScreen({ onNavigate: _onNavigate }: ScreenProps) {
  const { text, setText, review, setReview, valid } = useComposer();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
  return <KeyboardAvoidingView className="flex-1" behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
    <PageScroll maxWidth={808}>
            <View className="pb-5 pt-7"><Icon name="sparkle" size={23} color={themeColors.primary}/><TextInput accessibilityLabel={t('composer.describe')} multiline textAlignVertical="top" value={text} onChangeText={setText} placeholder={t('composer.placeholder')} placeholderTextColor={themeColors.textSecondary} maxLength={500} className="mt-5 min-h-[220px] text-[29px] leading-[37px] text-foreground" style={{ fontFamily: 'System' }}/></View>
      <CardStrip>{suggestions.map((item, index) => <Pressable key={item.titleKey} accessibilityRole="button" onPress={() => setText(t(item.textKey))} className={`w-[138px] rounded-[19px] p-3 ${index === 1 ? 'bg-primary-subtle' : 'bg-muted'}`}><Label className={`text-[12px] leading-[17px] ${index === 1 ? 'text-primary-text' : ''}`}>{t(item.titleKey)}</Label></Pressable>)}</CardStrip>
      <View className="mt-7 gap-4"><Pressable disabled={!valid} onPress={() => setReview(!review)} accessibilityRole="button" accessibilityLabel={t('composer.review')} className={`flex-row items-center justify-center gap-2 rounded-full bg-primary-subtle py-4 ${!valid ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}`}><Icon name="sparkle" size={18} color={themeColors.primary}/><Label className="text-[14px] font-medium text-primary-text">{review ? t('composer.hidePreview') : t('composer.review')}</Label></Pressable>
        {review && <View className="gap-3 rounded-[24px] bg-muted p-5"><Label className="text-[13px] font-medium">{t('composer.previewTitle')}</Label><Label className="text-[14px] leading-[21px]">{text}</Label><Label className="text-[12px] leading-[18px] text-muted-foreground">{t('composer.previewNote')}</Label></View>}
        <Label className="text-center text-[11px] leading-[16px] text-muted-foreground">{t('composer.footer')}</Label>
      </View>
    </PageScroll>
  </KeyboardAvoidingView>;
}
