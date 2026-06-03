// SJG-DATA-06 — PlanItem.

import type { SubjectRef } from './subject-ref.ts';

export type PlanItemSource = 'manual' | 'yuejing' | 'shijing';

export const PLAN_ITEM_SOURCES: readonly PlanItemSource[] = [
  'manual',
  'yuejing',
  'shijing',
] as const;

export interface PlanItem {
  readonly id: string;
  readonly planned_for: string;
  readonly body: string;
  readonly person_refs: readonly SubjectRef[];
  readonly concern_tag_refs: readonly string[];
  readonly source: PlanItemSource;
  readonly created_at: string;
  readonly updated_at: string;
}
