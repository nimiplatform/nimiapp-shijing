import type { Reading } from '../../domain/reading.ts';
import { subjectRefEquals, type SubjectRef } from '../../domain/subject-ref.ts';
import type { ReadingKind, ReadingScope } from '../../domain/reading-matrix.ts';

export interface LatestReadingForTargetInput {
  readonly readings: readonly Reading[];
  readonly kind: ReadingKind;
  readonly scope?: ReadingScope;
  readonly target: SubjectRef;
}

export function readingMatchesObservationTarget(reading: Reading, target: SubjectRef): boolean {
  return (
    subjectRefEquals(reading.anchor_subject, target) &&
    reading.subjects.some((subject) => subjectRefEquals(subject, target))
  );
}

export function latestReadingForTarget(input: LatestReadingForTargetInput): Reading | undefined {
  return input.readings
    .map((reading, index) => ({ reading, index }))
    .filter(({ reading }) =>
      reading.kind === input.kind &&
      (input.scope === undefined || reading.scope === input.scope) &&
      readingMatchesObservationTarget(reading, input.target),
    )
    .sort((a, b) => {
      const createdDelta = Date.parse(b.reading.created_at) - Date.parse(a.reading.created_at);
      if (createdDelta !== 0) return createdDelta;
      return b.index - a.index;
    })[0]?.reading;
}
