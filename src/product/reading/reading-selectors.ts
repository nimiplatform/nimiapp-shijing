// W03 — Reading selectors under the Mirror Architecture v1.

import type { Reading } from '../../domain/reading.ts';
import type { MethodProfileId } from '../../domain/algorithm.ts';
import type {
  MirrorKind,
  RelationshipNatalMirrorScope,
} from '../../domain/mirror-scope.ts';
import type {
  MingJingRelationshipMirrorOutput,
  YueJingMirrorOutput,
} from '../../domain/mirror-output.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';

export interface LatestReadingByMirrorKindInput {
  readonly readings: readonly Reading[];
  readonly mirror_kind: MirrorKind;
  readonly method_profile_id?: MethodProfileId;
}

export function latestReadingByMirrorKind(
  input: LatestReadingByMirrorKindInput,
): Reading | undefined {
  return input.readings
    .filter(
      (reading) =>
        reading.mirror_kind === input.mirror_kind &&
        (!input.method_profile_id ||
          reading.inputs_summary.method_profile.id === input.method_profile_id),
    )
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
}

function newestReading(readings: readonly Reading[]): Reading | undefined {
  return [...readings].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
}

function isRelationshipHePanOutput(
  output: Reading['output'],
): output is MingJingRelationshipMirrorOutput {
  return (
    output.mirror_kind === 'mingjing' &&
    (output as { readonly output_kind?: unknown }).output_kind === 'relationship_hepan'
  );
}

function isPersonRef(ref: SubjectRef): ref is Extract<SubjectRef, { kind: 'person' }> {
  return typeof ref === 'object' && ref !== null && ref.kind === 'person';
}

export function latestMingJingNatalReading(
  readings: readonly Reading[],
  method_profile_id?: MethodProfileId,
): Reading | undefined {
  return newestReading(
    readings.filter(
      (reading) =>
        reading.mirror_kind === 'mingjing' &&
        reading.mirror_scope.kind === 'natal' &&
        (!method_profile_id || reading.inputs_summary.method_profile.id === method_profile_id) &&
        reading.output.mirror_kind === 'mingjing' &&
        !isRelationshipHePanOutput(reading.output),
    ),
  );
}

export function latestMingJingRelationshipReading(input: {
  readonly readings: readonly Reading[];
  readonly related_person_ref: Extract<SubjectRef, { kind: 'person' }>;
  readonly method_profile_id?: MethodProfileId;
}): Reading | undefined {
  return newestReading(
    input.readings.filter((reading) => {
      if (reading.mirror_kind !== 'mingjing') return false;
      if (reading.mirror_scope.kind !== 'relationship_natal') return false;
      if (
        input.method_profile_id &&
        reading.inputs_summary.method_profile.id !== input.method_profile_id
      ) {
        return false;
      }
      if (!isRelationshipHePanOutput(reading.output)) return false;
      const scope = reading.mirror_scope as RelationshipNatalMirrorScope;
      if (scope.related_person_ref.id !== input.related_person_ref.id) return false;
      if (!isPersonRef(reading.related_person_refs[0])) return false;
      if (reading.related_person_refs[0].id !== input.related_person_ref.id) return false;
      return reading.output.relationship_subject.related_person_ref.id === input.related_person_ref.id;
    }),
  );
}

export function readingsCitingReading(
  readings: readonly Reading[],
  sourceReadingId: string,
): Reading[] {
  return readings.filter((reading) => reading.cited_reading_ids.includes(sourceReadingId));
}

export function readingsForConcernTag(
  readings: readonly Reading[],
  concernTagId: string,
): Reading[] {
  return readings.filter((reading) => reading.concern_tag_refs.includes(concernTagId));
}

export function yuejingReadingStartsOn(reading: Reading | undefined, date: string): boolean {
  if (!reading || reading.mirror_kind !== 'yuejing') return false;
  if (reading.output.mirror_kind !== 'yuejing') return false;
  return (reading.output as YueJingMirrorOutput).range.start_date === date;
}
