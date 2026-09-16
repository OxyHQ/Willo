import React, { createContext, useContext, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { IconButton, Label } from '@willo.sh/ui';
import { ContentWidth } from '../layout/page-layout';
import { type Navigate } from '../data/screens';
import { useHomeActions } from '../state/home-context';

/**
 * The composer's draft, shared between its header and its body.
 *
 * Save lives in the header and the text it saves is edited in the body, and
 * the two are siblings in the layout — the header is the app shell's, the body
 * is the route's — so neither can own it. Its own file, away from the screen,
 * so the shell can mount the provider for the header without pulling the
 * composer screen in behind it.
 */
type ComposerValue = { text: string; setText: (value: string) => void; review: boolean; setReview: (value: boolean) => void; valid: boolean; save: () => void };
const ComposerContext = createContext<ComposerValue | null>(null);
export function useComposer(): ComposerValue {
  const value = useContext(ComposerContext);
  if (!value) throw new Error('ComposerHeader/ComposerScreen must be rendered inside ComposerProvider.');
  return value;
}
export function ComposerProvider({ onNavigate, children }: { onNavigate: Navigate; children: React.ReactNode }) {
  const { dispatch, notify } = useHomeActions();
  const { t } = useTranslation();
  const [text, setText] = useState(() => t('composer.suggestions.saveEnergyText'));
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
export function ComposerHeader({ onNavigate }: { onNavigate: Navigate }) {
  const { valid, save } = useComposer();
  const { t } = useTranslation();
  return <ContentWidth maxWidth={808}><View className="flex-row items-center justify-between pt-2"><IconButton icon="close" label={t('composer.cancel')} onPress={() => onNavigate('automations')}/><Label className="text-[14px]">{t('composer.title')}</Label><Pressable accessibilityRole="button" accessibilityLabel={t('composer.saveLabel')} disabled={!valid} onPress={save} className={`px-3 py-3 ${!valid ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}`}><Label className="text-[14px] font-medium text-info-text">{t('composer.save')}</Label></Pressable></View></ContentWidth>;
}
