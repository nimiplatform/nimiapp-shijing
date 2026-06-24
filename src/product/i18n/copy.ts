// Public i18n facade for ShiJing product copy.

import { useTranslation } from 'react-i18next';
import type { ConsentState } from '../../domain/person.ts';
import type { UiLanguage } from '../../domain/settings.ts';
import { EN_COPY } from './copy.en.ts';
import { ZH_COPY } from './copy.zh.ts';
import type { ProductCopy } from './copy-types.ts';

export type { ProductCopy } from './copy-types.ts';

export const PRODUCT_COPY: Record<UiLanguage, ProductCopy> = {
  zh: ZH_COPY,
  en: EN_COPY,
};

export function uiLanguageFromI18nLanguage(language: string | undefined): UiLanguage {
  return language?.startsWith('en') ? 'en' : 'zh';
}

export function getProductCopy(language: UiLanguage): ProductCopy {
  return PRODUCT_COPY[language];
}

export function useProductCopy(): ProductCopy {
  const { i18n } = useTranslation();
  return getProductCopy(uiLanguageFromI18nLanguage(i18n.resolvedLanguage ?? i18n.language));
}

// Display order for the consent-source dropdown; subject-provided comes first.
export const CONSENT_STATE_ORDER: readonly ConsentState[] = [
  'subject_consented',
  'owner_recorded',
  'withheld',
];

// Static zh copy exports for non-hook code paths and explicitly tracked known-debt surfaces.
export const BRAND_NAME = ZH_COPY.brandName;
export const BRAND_SUB = ZH_COPY.brandSub;
export const MIRROR_KIND_LABELS = ZH_COPY.mirrorKindLabels;
export const TAB_LABELS = ZH_COPY.tabLabels;
export const TENDENCY_CLASS_LABELS = ZH_COPY.tendencyClassLabels;
export const NIANJING_INFLECTION_KIND_LABELS = ZH_COPY.nianjingInflectionKindLabels;
export const CALENDAR_SYSTEM_LABELS = ZH_COPY.calendarSystemLabels;
export const BIRTH_PRECISION_LABELS = ZH_COPY.birthPrecisionLabels;
export const CALCULATION_SEX_LABELS = ZH_COPY.calculationSexLabels;
export const CONSENT_STATE_LABELS = ZH_COPY.consentStateLabels;
export const RESPONSE_TONE_LABELS = ZH_COPY.responseToneLabels;
export const RESPONSE_LENGTH_LABELS = ZH_COPY.responseLengthLabels;
export const RESPONSE_LANGUAGE_LABELS = ZH_COPY.responseLanguageLabels;
export const CONVERSATION_ROLE_LABELS = ZH_COPY.conversationRoleLabels;
export const CONCERN_TAG_STATUS_LABELS = ZH_COPY.concernTagStatusLabels;
export const RECORD_SOURCE_LABELS = ZH_COPY.recordSourceLabels;
export const MEMORY_USE_LABELS = ZH_COPY.memoryUseLabels;
export const SETTINGS_SURFACE_LABELS = ZH_COPY.settingsSurfaceLabels;
export const SETTINGS_PAGE_LABELS = ZH_COPY.settingsPageLabels;
export const READINESS_BLOCKER_LABELS = ZH_COPY.readinessBlockerLabels;
export const UI_LANGUAGE_LABELS = ZH_COPY.uiLanguageLabels;
