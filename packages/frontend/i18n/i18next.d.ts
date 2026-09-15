import 'i18next';
import type en from './locales/en.json';

// Types every `t('…')` key against the English catalog, so a missing or
// misspelled key is a compile error instead of raw key text on screen.
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en };
  }
}
