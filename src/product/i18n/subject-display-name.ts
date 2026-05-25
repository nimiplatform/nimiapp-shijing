// User-facing display for a SubjectRef. Reserve subjectRefKey() for
// React keys and Map indexes; this is purely for what the user reads.

import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { isPersonRef, isSelfRef, type SubjectRef } from '../../domain/subject-ref.ts';
import { SELF_DISPLAY_NAME, UNKNOWN_SUBJECT_DISPLAY_NAME } from './copy.ts';

export function subjectDisplayName(ref: SubjectRef, space: ShiJingSpace): string {
  if (isSelfRef(ref)) return SELF_DISPLAY_NAME;
  if (isPersonRef(ref)) {
    const person = space.persons.find((p) => p.id === ref.id);
    if (person && person.display_name.trim().length > 0) return person.display_name;
    return UNKNOWN_SUBJECT_DISPLAY_NAME;
  }
  return UNKNOWN_SUBJECT_DISPLAY_NAME;
}
