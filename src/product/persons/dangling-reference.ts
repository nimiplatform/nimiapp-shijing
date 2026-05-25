// Wave-8 — dangling-reference detector used by the delete-Person flow.
// We must not silently remove a Person that is still referenced as a
// SubjectRef anywhere in the ShiJingSpace.

import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { isPersonRef } from '../../domain/subject-ref.ts';

export interface DanglingReference {
  readonly via: string;
  readonly person_id: string;
}

export function findReferencesToPerson(space: ShiJingSpace, personId: string): readonly DanglingReference[] {
  const matches: DanglingReference[] = [];
  const matchesRef = (ref: SubjectRef, via: string) => {
    if (isPersonRef(ref) && ref.id === personId) matches.push({ via, person_id: personId });
  };
  for (const relation of space.relations) {
    matchesRef(relation.from_subject, `relation:${relation.id}:from`);
    matchesRef(relation.to_subject, `relation:${relation.id}:to`);
  }
  for (const event of space.events) {
    matchesRef(event.primary_subject, `event:${event.id}:primary_subject`);
    for (const participant of event.participants) {
      matchesRef(participant, `event:${event.id}:participants`);
    }
  }
  for (const view of space.views) {
    matchesRef(view.anchor_subject, `view:${view.id}:anchor`);
    for (const subject of view.subjects) {
      matchesRef(subject, `view:${view.id}:subjects`);
    }
  }
  for (const reading of space.readings) {
    matchesRef(reading.anchor_subject, `reading:${reading.id}:anchor`);
    for (const subject of reading.subjects) {
      matchesRef(subject, `reading:${reading.id}:subjects`);
    }
  }
  for (const conversation of space.conversations) {
    matchesRef(conversation.subject_anchor, `conversation:${conversation.id}:subject_anchor`);
  }
  return matches;
}
