// SJG-DATA-10 — ShiJingCatalog and ViewTemplate.

import type { TimeScope } from './view.ts';

export type RecommendedSubjectPattern = 'self' | 'person';

export type ViewTemplateCategory =
  | 'self_reflection'
  | 'relation'
  | 'decision_support'
  | 'learning';

export const VIEW_TEMPLATE_CATEGORIES: readonly ViewTemplateCategory[] = [
  'self_reflection',
  'relation',
  'decision_support',
  'learning',
] as const;

export interface ViewTemplate {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly default_time_scope: TimeScope;
  readonly default_instructions: string;
  readonly recommended_subjects: readonly RecommendedSubjectPattern[];
  readonly category: ViewTemplateCategory;
}

export interface ShiJingCatalog {
  readonly view_templates: readonly ViewTemplate[];
}

export const VIEW_TEMPLATE_ID_PATTERN = /^[a-z][a-z0-9_-]{1,63}$/;
