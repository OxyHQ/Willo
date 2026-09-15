import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

/**
 * Willo's translated UI. Oxy decides WHICH language (the account's, or the
 * device's while signed out) and tells us through `OxyProvider`'s `language`
 * prop (`app/_layout.tsx`); this file only owns the catalogs. Both are
 * bundled up front: with two small catalogs there's nothing worth
 * lazy-loading, unlike Mention's fifteen.
 */
export const DEFAULT_LANGUAGE = 'en-US';
export const SUPPORTED_LANGUAGES = ['en-US', 'es-ES'] as const;

i18n.use(initReactI18next).init({
  resources: {
    'en-US': { translation: en },
    'es-ES': { translation: es },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  // React already escapes rendered text.
  interpolation: { escapeValue: false },
});

export default i18n;
