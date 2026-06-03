// W-c03 Settings > Memory & Plans (PlanItem half).

import type { PlanItem } from '../../domain/plan-item.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import {
  validatePlanItem,
  type PlanItemValidationError,
} from '../../contracts/plan-item-validator.ts';

export type PlanUpsertError =
  | { code: 'plan_invalid'; detail: PlanItemValidationError }
  | { code: 'plan_concern_tag_ref_unresolvable'; ref: string }
  | { code: 'plan_person_ref_unresolvable'; ref: string };

export type PlanUpsertOutcome =
  | { ok: true; next_space: ShiJingSpace }
  | { ok: false; error: PlanUpsertError };

export function upsertPlanItem(space: ShiJingSpace, plan: PlanItem): PlanUpsertOutcome {
  const check = validatePlanItem(plan);
  if (!check.ok) return { ok: false, error: { code: 'plan_invalid', detail: check.error } };
  for (const ref of plan.concern_tag_refs) {
    if (!space.concern_tags.some((t) => t.id === ref)) {
      return { ok: false, error: { code: 'plan_concern_tag_ref_unresolvable', ref } };
    }
  }
  for (const ref of plan.person_refs) {
    if (ref === 'self') continue;
    if (!space.persons.some((p) => p.id === ref.id)) {
      return { ok: false, error: { code: 'plan_person_ref_unresolvable', ref: ref.id } };
    }
  }
  const idx = space.plan_items.findIndex((p) => p.id === plan.id);
  if (idx === -1) {
    return {
      ok: true,
      next_space: { ...space, plan_items: [...space.plan_items, plan] },
    };
  }
  const plan_items = space.plan_items.slice();
  plan_items[idx] = plan;
  return { ok: true, next_space: { ...space, plan_items } };
}

export type PlanDeleteOutcome =
  | { ok: true; next_space: ShiJingSpace }
  | { ok: false; error: { code: 'plan_not_found'; id: string } };

export function deletePlanItem(space: ShiJingSpace, id: string): PlanDeleteOutcome {
  if (!space.plan_items.some((p) => p.id === id)) {
    return { ok: false, error: { code: 'plan_not_found', id } };
  }
  return {
    ok: true,
    next_space: { ...space, plan_items: space.plan_items.filter((p) => p.id !== id) },
  };
}
