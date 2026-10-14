import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import { getProductCopy, uiLanguageFromI18nLanguage } from '../../product/i18n/copy.ts';

const resources = {
  en: { translation: en as Record<string, unknown> },
  zh: { translation: zh as Record<string, unknown> },
};

const detectedLanguage =
  typeof navigator !== 'undefined' && navigator.language?.startsWith('zh') ? 'zh' : 'en';

// Eager + synchronous init — resources are statically bundled. The kit's
// auth page calls useTranslation() at render time and must find resources
// already loaded.
i18n.use(initReactI18next).init({
  resources,
  lng: detectedLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  initAsync: false,
});

// @nimi-authority: rule.shijing.data-model.r011
function syncDocumentBrand(language: string): void {
  if (typeof document === 'undefined') return;
  const uiLanguage = uiLanguageFromI18nLanguage(language);
  document.title = getProductCopy(uiLanguage).brandName;
  document.documentElement.lang = uiLanguage;
}

syncDocumentBrand(i18n.resolvedLanguage ?? i18n.language);
i18n.on('languageChanged', syncDocumentBrand);

export { i18n };
