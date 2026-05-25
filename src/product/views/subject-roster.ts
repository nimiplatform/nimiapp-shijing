// Wave-9 — helper that enumerates the SubjectRef roster picked from
// a ShiJingSpace. The View form binds anchor + subjects[] selectors
// to this roster so manual id typing is impossible.

import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { subjectRefKey } from '../../domain/subject-ref.ts';

export interface SubjectRosterEntry {
  readonly key: string;
  readonly label: string;
  readonly ref: SubjectRef;
}

export function buildSubjectRoster(space: ShiJingSpace): readonly SubjectRosterEntry[] {
  const roster: SubjectRosterEntry[] = [
    { key: subjectRefKey('self'), label: 'self', ref: 'self' },
  ];
  for (const person of space.persons) {
    const ref: SubjectRef = { kind: 'person', id: person.id };
    roster.push({ key: subjectRefKey(ref), label: `${person.display_name} (person:${person.id})`, ref });
  }
  return roster;
}

export function findRosterEntry(
  roster: readonly SubjectRosterEntry[],
  key: string,
): SubjectRosterEntry | undefined {
  return roster.find((entry) => entry.key === key);
}
