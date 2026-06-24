import type { ConcernTag, ConcernTagSnapshot } from '../../../domain/concern-tag.ts';
import type { EventMemory } from '../../../domain/event-memory.ts';
import type { PlanItem } from '../../../domain/plan-item.ts';
import type { Reading } from '../../../domain/reading.ts';
import type { ShiJingSpace } from '../../../domain/shijing-space.ts';
import type { SubjectRef } from '../../../domain/subject-ref.ts';
import { computeCanonicalHash } from '../canonical-hash.ts';

export function activeConcernTagsForRefs(
  refs: readonly string[],
  space: ShiJingSpace,
): { ok: true; tags: ConcernTag[] } | { ok: false; missing: string } {
  const tags: ConcernTag[] = [];
  for (const ref of refs) {
    const tag = space.concern_tags.find((t) => t.id === ref);
    if (!tag) return { ok: false, missing: ref };
    tags.push(tag);
  }
  return { ok: true, tags };
}

export function snapshotConcernTags(
  tags: readonly ConcernTag[],
  capturedAt: string,
): ConcernTagSnapshot[] {
  return tags.map((tag) => {
    const personRefs: SubjectRef[] = [];
    for (const mention of tag.mention_refs) {
      if (mention.resolved_subject_ref) personRefs.push(mention.resolved_subject_ref);
    }
    return {
      id: tag.id,
      label: tag.label,
      status: tag.status,
      sort_order: tag.sort_order,
      parsed_topics: tag.parsed_topics,
      mention_refs: tag.mention_refs,
      prompt_text_hash: computeCanonicalHash(tag.prompt_text),
      resolved_person_refs: personRefs,
      captured_at: capturedAt,
    };
  });
}

export function resolveEventMemories(
  refs: readonly string[],
  space: ShiJingSpace,
): { ok: true; memories: EventMemory[] } | { ok: false; missing: string } {
  const result: EventMemory[] = [];
  for (const ref of refs) {
    const memory = space.event_memories.find((m) => m.id === ref);
    if (!memory) return { ok: false, missing: ref };
    result.push(memory);
  }
  return { ok: true, memories: result };
}

export function resolvePlanItems(
  refs: readonly string[],
  space: ShiJingSpace,
): { ok: true; plans: PlanItem[] } | { ok: false; missing: string } {
  const result: PlanItem[] = [];
  for (const ref of refs) {
    const plan = space.plan_items.find((p) => p.id === ref);
    if (!plan) return { ok: false, missing: ref };
    result.push(plan);
  }
  return { ok: true, plans: result };
}

export function resolveSourceReadings(
  refs: readonly string[],
  space: ShiJingSpace,
): { ok: true; readings: Reading[] } | { ok: false; missing: string } {
  const result: Reading[] = [];
  for (const ref of refs) {
    const reading = space.readings.find((r) => r.id === ref);
    if (!reading) return { ok: false, missing: ref };
    result.push(reading);
  }
  return { ok: true, readings: result };
}

export function defaultResponsePreferencesHash(space: ShiJingSpace): string {
  return computeCanonicalHash(space.settings.response_preferences);
}
