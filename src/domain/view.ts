// SJG-DATA-06 — View.

import type { SubjectRef } from './subject-ref.ts';

export type TimeScope = 'bounded' | 'open_ended' | 'rolling';

export const TIME_SCOPES: readonly TimeScope[] = ['bounded', 'open_ended', 'rolling'] as const;

export type DisplayState = 'normal' | 'pinned' | 'archived';

export const DISPLAY_STATES: readonly DisplayState[] = ['normal', 'pinned', 'archived'] as const;

export interface BoundedRange {
  readonly start: string;
  readonly end: string;
}

export type ContextItemKind = 'note' | 'document' | 'event_ref';

export interface ContextItem {
  readonly id: string;
  readonly kind: ContextItemKind;
  readonly body: string;
  readonly created_at: string;
}

export interface ViewMemory {
  readonly summary: string;
  readonly updated_at: string;
  readonly locked: boolean;
}

export interface View {
  readonly id: string;
  readonly title: string;
  readonly anchor_subject: SubjectRef;
  readonly subjects: readonly SubjectRef[];
  readonly time_scope: TimeScope;
  readonly bounded_range?: BoundedRange;
  readonly rolling_window_days?: number;
  readonly context_items: readonly ContextItem[];
  readonly instructions: string;
  readonly view_memory: ViewMemory;
  readonly display_state: DisplayState;
}
