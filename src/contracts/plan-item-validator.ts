// SJG-DATA-06 — PlanItem validator.

import { PLAN_ITEM_SOURCES, type PlanItem } from '../domain/plan-item.ts';
import { validateSubjectRef } from './subject-ref-validator.ts';

const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

const FORBIDDEN_PLAN_ITEM_FIELDS: readonly string[] = [
  'status',
  'task_status',
  'due',
  'due_date',
  'overdue',
  'deadline',
  'priority',
  'priorities',
  'dependency',
  'dependencies',
  'progress',
  'assignee',
  'board',
  'boards',
  'milestone',
  'gantt',
  'workflow',
  'project',
  'projects',
  'task',
  'tasks',
];

export type PlanItemValidationError =
  | { code: 'plan_item_id_empty' }
  | { code: 'plan_item_planned_for_not_iso_utc' }
  | { code: 'plan_item_created_at_not_iso_utc' }
  | { code: 'plan_item_updated_at_not_iso_utc' }
  | { code: 'plan_item_body_empty' }
  | { code: 'plan_item_source_invalid'; received: unknown }
  | { code: 'plan_item_person_ref_invalid'; index: number; reason: string }
  | { code: 'plan_item_concern_tag_ref_empty'; index: number }
  | { code: 'plan_item_forbidden_field_present'; field: string };

export type PlanItemValidationResult =
  | { ok: true }
  | { ok: false; error: PlanItemValidationError };

export function validatePlanItem(plan: PlanItem): PlanItemValidationResult {
  if (typeof plan.id !== 'string' || plan.id.length === 0) {
    return { ok: false, error: { code: 'plan_item_id_empty' } };
  }
  if (!ISO_UTC_PATTERN.test(plan.planned_for)) {
    return { ok: false, error: { code: 'plan_item_planned_for_not_iso_utc' } };
  }
  if (!ISO_UTC_PATTERN.test(plan.created_at)) {
    return { ok: false, error: { code: 'plan_item_created_at_not_iso_utc' } };
  }
  if (!ISO_UTC_PATTERN.test(plan.updated_at)) {
    return { ok: false, error: { code: 'plan_item_updated_at_not_iso_utc' } };
  }
  if (typeof plan.body !== 'string' || plan.body.length === 0) {
    return { ok: false, error: { code: 'plan_item_body_empty' } };
  }
  if (!PLAN_ITEM_SOURCES.includes(plan.source)) {
    return { ok: false, error: { code: 'plan_item_source_invalid', received: plan.source } };
  }
  for (let i = 0; i < plan.person_refs.length; i += 1) {
    const refCheck = validateSubjectRef(plan.person_refs[i]);
    if (!refCheck.ok) {
      return {
        ok: false,
        error: { code: 'plan_item_person_ref_invalid', index: i, reason: refCheck.error.code },
      };
    }
  }
  for (let i = 0; i < plan.concern_tag_refs.length; i += 1) {
    const ref = plan.concern_tag_refs[i]!;
    if (typeof ref !== 'string' || ref.length === 0) {
      return { ok: false, error: { code: 'plan_item_concern_tag_ref_empty', index: i } };
    }
  }
  const record = plan as unknown as Record<string, unknown>;
  for (const field of FORBIDDEN_PLAN_ITEM_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      return { ok: false, error: { code: 'plan_item_forbidden_field_present', field } };
    }
  }
  return { ok: true };
}

export type PlanItemCollectionValidationError =
  | { code: 'plan_items_duplicate_id'; id: string }
  | { code: 'plan_item_invalid'; id: string; reason: string };

export type PlanItemCollectionValidationResult =
  | { ok: true }
  | { ok: false; error: PlanItemCollectionValidationError };

export function validatePlanItemCollection(
  plans: readonly PlanItem[],
): PlanItemCollectionValidationResult {
  const seen = new Set<string>();
  for (const plan of plans) {
    const check = validatePlanItem(plan);
    if (!check.ok) {
      return { ok: false, error: { code: 'plan_item_invalid', id: plan.id, reason: check.error.code } };
    }
    if (seen.has(plan.id)) {
      return { ok: false, error: { code: 'plan_items_duplicate_id', id: plan.id } };
    }
    seen.add(plan.id);
  }
  return { ok: true };
}
