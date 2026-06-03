// W-c03 — dangling-reference detector for Person deletion. Walks all
// admitted entity collections (concern_tags mention_refs, event_memories
// person_refs, plan_items person_refs, readings related_person_refs)
// and surfaces every place that still references the candidate person.

import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { isPersonRef, type SubjectRef } from '../../domain/subject-ref.ts';

export interface DanglingReference {
  readonly via: string;
  readonly person_id: string;
}

export function findReferencesToPerson(
  space: ShiJingSpace,
  personId: string,
): readonly DanglingReference[] {
  const matches: DanglingReference[] = [];
  const matchesRef = (ref: SubjectRef, via: string) => {
    if (isPersonRef(ref) && ref.id === personId) {
      matches.push({ via, person_id: personId });
    }
  };
  for (const tag of space.concern_tags) {
    for (const mention of tag.mention_refs) {
      if (mention.resolved_subject_ref) {
        matchesRef(mention.resolved_subject_ref, `concern_tag:${tag.id}:mention:${mention.token}`);
      }
    }
  }
  for (const memory of space.event_memories) {
    for (const ref of memory.person_refs) {
      matchesRef(ref, `event_memory:${memory.id}:person_refs`);
    }
  }
  for (const plan of space.plan_items) {
    for (const ref of plan.person_refs) {
      matchesRef(ref, `plan_item:${plan.id}:person_refs`);
    }
  }
  for (const reading of space.readings) {
    for (const ref of reading.related_person_refs) {
      matchesRef(ref, `reading:${reading.id}:related_person_refs`);
    }
  }
  return matches;
}
