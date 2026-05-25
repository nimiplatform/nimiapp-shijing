// SJG-DATA-01 — SubjectRef domain type.

export type SubjectRef = 'self' | { kind: 'person'; id: string };

export const SELF_SUBJECT_REF: SubjectRef = 'self';

export function isSelfRef(ref: SubjectRef): ref is 'self' {
  return ref === 'self';
}

export function isPersonRef(ref: SubjectRef): ref is { kind: 'person'; id: string } {
  return typeof ref === 'object' && ref !== null && ref.kind === 'person';
}

export function subjectRefEquals(a: SubjectRef, b: SubjectRef): boolean {
  if (isSelfRef(a) && isSelfRef(b)) return true;
  if (isPersonRef(a) && isPersonRef(b)) return a.id === b.id;
  return false;
}

export function subjectRefKey(ref: SubjectRef): string {
  return isSelfRef(ref) ? 'self' : `person:${ref.id}`;
}
