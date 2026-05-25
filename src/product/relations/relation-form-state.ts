// SJG-DATA-04 — pure-TS Relation draft state machine. Captures
// from_subject, to_subject, relation_kind (closed UI vocabulary), and
// optional notes. The reducer rejects from===to at validate time; the
// space-level validator additionally guarantees both refs resolve in
// the owning ShiJingSpace.

import type { Relation } from '../../domain/relation.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { subjectRefEquals } from '../../domain/subject-ref.ts';

// Closed UI vocabulary for relation_kind. The spec admits
// `relation_kind: string` (SJG-DATA-04 lines 132-141) with example
// values; this app-layer enum pins the user-visible set so the form
// cannot emit unbounded free text.
export const RELATION_KIND_OPTIONS = ['亲属', '伴侣', '同事', '朋友', '其他'] as const;
export type RelationKindOption = (typeof RELATION_KIND_OPTIONS)[number];

export interface RelationDraft {
  readonly id: string | null;
  readonly from_subject_key: string;
  readonly to_subject_key: string;
  readonly relation_kind: RelationKindOption | '';
  readonly notes: string;
}

export type RelationDraftAction =
  | { type: 'reset' }
  | { type: 'hydrate'; relation: Relation }
  | { type: 'assign_id'; id: string }
  | { type: 'set_from_subject_key'; value: string }
  | { type: 'set_to_subject_key'; value: string }
  | { type: 'set_relation_kind'; value: RelationKindOption | '' }
  | { type: 'set_notes'; value: string };

export function createEmptyRelationDraft(): RelationDraft {
  return {
    id: null,
    from_subject_key: '',
    to_subject_key: '',
    relation_kind: '',
    notes: '',
  };
}

function subjectKey(ref: SubjectRef): string {
  return ref === 'self' ? 'self' : `person:${ref.id}`;
}

function isRelationKindOption(value: string): value is RelationKindOption {
  return (RELATION_KIND_OPTIONS as readonly string[]).includes(value);
}

function hydrateFromRelation(relation: Relation): RelationDraft {
  return {
    id: relation.id,
    from_subject_key: subjectKey(relation.from_subject),
    to_subject_key: subjectKey(relation.to_subject),
    relation_kind: isRelationKindOption(relation.relation_kind) ? relation.relation_kind : '其他',
    notes: relation.notes ?? '',
  };
}

export function relationDraftReducer(state: RelationDraft, action: RelationDraftAction): RelationDraft {
  switch (action.type) {
    case 'reset':
      return createEmptyRelationDraft();
    case 'hydrate':
      return hydrateFromRelation(action.relation);
    case 'assign_id':
      return { ...state, id: action.id };
    case 'set_from_subject_key':
      return { ...state, from_subject_key: action.value };
    case 'set_to_subject_key':
      return { ...state, to_subject_key: action.value };
    case 'set_relation_kind':
      return { ...state, relation_kind: action.value };
    case 'set_notes':
      return { ...state, notes: action.value };
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}

export type RelationDraftValidationError =
  | { code: 'relation_id_missing' }
  | { code: 'relation_from_subject_missing' }
  | { code: 'relation_to_subject_missing' }
  | { code: 'relation_kind_unspecified' }
  | { code: 'relation_self_loop' };

export type RelationDraftValidationOutcome =
  | { ok: true }
  | { ok: false; error: RelationDraftValidationError };

export function validateRelationDraft(draft: RelationDraft): RelationDraftValidationOutcome {
  if (!draft.id || draft.id.length === 0) {
    return { ok: false, error: { code: 'relation_id_missing' } };
  }
  if (draft.from_subject_key.length === 0) {
    return { ok: false, error: { code: 'relation_from_subject_missing' } };
  }
  if (draft.to_subject_key.length === 0) {
    return { ok: false, error: { code: 'relation_to_subject_missing' } };
  }
  if (draft.relation_kind === '') {
    return { ok: false, error: { code: 'relation_kind_unspecified' } };
  }
  if (draft.from_subject_key === draft.to_subject_key) {
    return { ok: false, error: { code: 'relation_self_loop' } };
  }
  return { ok: true };
}

export interface BuildRelationFromDraftInputs {
  readonly from_subject: SubjectRef;
  readonly to_subject: SubjectRef;
}

export function buildRelationFromDraft(
  draft: RelationDraft,
  refs: BuildRelationFromDraftInputs,
): Relation {
  if (!draft.id) throw new Error('Relation.id must be assigned before building a Relation');
  if (draft.relation_kind === '') {
    throw new Error('Relation.relation_kind must be chosen before building a Relation');
  }
  if (subjectRefEquals(refs.from_subject, refs.to_subject)) {
    throw new Error('Relation.from_subject and to_subject must not refer to the same subject');
  }
  return {
    id: draft.id,
    from_subject: refs.from_subject,
    to_subject: refs.to_subject,
    relation_kind: draft.relation_kind,
    ...(draft.notes.length > 0 ? { notes: draft.notes } : {}),
  };
}
