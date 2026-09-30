import type { AstrologyFeatureSnapshot } from '../../domain/algorithm.ts';
import type { ConcernTagSnapshot } from '../../domain/concern-tag.ts';
import type { MirrorScope } from '../../domain/mirror-scope.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { computeCanonicalHash } from './canonical-hash.ts';
import { canonicalizeNatalInputs } from './canonicalize-natal-inputs.ts';
import type { StageResult } from './stage-result.ts';

export interface ReadingInputHashInput {
  readonly space: ShiJingSpace;
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly mirror_scope: MirrorScope;
  readonly concern_tag_snapshots: readonly ConcernTagSnapshot[];
  readonly related_person_refs: readonly SubjectRef[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
  readonly response_preferences_hash: string;
}

// @nimi-authority: rule.shijing.algorithm.r012
export function readingInputHash(input: ReadingInputHashInput): StageResult<string> {
  const canonicalNatalInputs = [];
  for (const subjectRef of ['self' as const, ...input.related_person_refs]) {
    const natalInputs = subjectRef === 'self'
      ? input.space.self_subject.natal_inputs
      : input.space.persons.find((person) => person.id === subjectRef.id)?.natal_inputs;
    if (!natalInputs) {
      return {
        ok: false,
        error: { stage: 'build_feature_snapshot', kind: 'stage_missing_input', subject_ref: subjectRef, detail: 'input hash subject does not resolve' },
      };
    }
    const canonical = canonicalizeNatalInputs(natalInputs);
    if (!canonical.ok) return canonical;
    canonicalNatalInputs.push({
      subject_ref: subjectRef,
      canonicalization: canonical.value,
      birth_location: {
        latitude: natalInputs.birth_location.latitude,
        longitude: natalInputs.birth_location.longitude,
        iana_time_zone: natalInputs.birth_location.iana_time_zone,
      },
      calculation_sex: natalInputs.calculation_sex,
    });
  }
  return {
    ok: true,
    value: computeCanonicalHash({
      method_profile: input.feature_snapshot.method_profile,
      canonical_natal_inputs: canonicalNatalInputs,
      mirror_scope: input.mirror_scope,
      canonical_window: input.feature_snapshot.canonical_window,
      concern_tag_snapshots: input.concern_tag_snapshots,
      related_person_refs: input.related_person_refs,
      cited_event_memory_refs: input.cited_event_memory_refs,
      cited_plan_item_refs: input.cited_plan_item_refs,
      response_preferences_hash: input.response_preferences_hash,
    }),
  };
}
