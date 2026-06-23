// SJG-ALGO-02/08 — feature snapshot orchestrator. Thin: resolve subjects through
// the shared NatalCanonicalization stage, select the MethodEngine from the
// registry, run computeEvidence → deriveCommonDrivers, append orchestration-level
// uncertainty (consent, concern tags), and assemble the envelope. No method math
// lives here.

import type { ConcernTag } from '../../domain/concern-tag.ts';
import type { NatalInputs } from '../../domain/person.ts';
import type {
  AstrologyFeatureSnapshot,
  CommonDrivers,
  MethodProfileId,
  RelationshipHePanEvidence,
  UncertaintyInput,
} from '../../domain/algorithm.ts';
import { DEFAULT_METHOD_PROFILE_ID, type MethodEvidence } from '../../domain/algorithm.ts';
import type { MirrorKind, MirrorScope } from '../../domain/mirror-scope.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { isPersonRef, isSelfRef, subjectRefEquals, type SubjectRef } from '../../domain/subject-ref.ts';
import { canonicalizeNatalInputs } from './canonicalize-natal-inputs.ts';
import { getMethodEngine } from './engines/registry.ts';
import type { ResolvedSubject } from './method-engine.ts';
import { resolveCanonicalMirrorWindow } from './mirror-window.ts';
import { deriveRelationshipHePanEvidence } from './relationship-hepan-evidence.ts';
import { type StageResult } from './stage-result.ts';

export interface BuildFeatureSnapshotInput {
  readonly mirror_kind: MirrorKind;
  readonly mirror_scope: MirrorScope;
  readonly space: ShiJingSpace;
  readonly related_person_refs: readonly SubjectRef[];
  readonly active_concern_tags: readonly ConcernTag[];
  readonly dayun_required_override?: boolean;
  readonly method_profile_id?: MethodProfileId;
}

function natalInputsForSubject(subject: SubjectRef, space: ShiJingSpace): NatalInputs | undefined {
  if (isSelfRef(subject)) return space.self_subject.natal_inputs;
  if (isPersonRef(subject)) return space.persons.find((p) => p.id === subject.id)?.natal_inputs;
  return undefined;
}

// SJG-ALGO-07 — DaYun required for NianJing/long-horizon always; consultation
// defers to the override from cited sources. Rolling/daily scopes never reach the
// >90-local-day threshold that crosses a 大运 boundary (rolling_30_day is validated
// to exactly 30 days), so they do not require DaYun.
function deriveDayunRequired(mirrorKind: MirrorKind, scope: MirrorScope): boolean {
  if (mirrorKind === 'nianjing') return true;
  if (mirrorKind === 'mingjing') return true; // 命镜 always needs the DaYun arc (SJG-ALGO-16)
  if (scope.kind === 'long_horizon') return true;
  return false;
}

function resolveSubject(
  subject_ref: SubjectRef,
  space: ShiJingSpace,
): StageResult<ResolvedSubject> {
  const natalInputs = natalInputsForSubject(subject_ref, space);
  if (!natalInputs) {
    return {
      ok: false,
      error: { stage: 'build_feature_snapshot', kind: 'stage_missing_input', subject_ref, detail: 'subject not present in ShiJingSpace' },
    };
  }
  const canon = canonicalizeNatalInputs(natalInputs);
  if (!canon.ok) return canon;
  return { ok: true, value: { subject_ref, natal_inputs: natalInputs, canonicalization: canon.value } };
}

function consentUncertainty(refs: readonly SubjectRef[], space: ShiJingSpace): UncertaintyInput[] {
  const out: UncertaintyInput[] = [];
  for (const ref of refs) {
    if (!isPersonRef(ref)) continue;
    const person = space.persons.find((p) => p.id === ref.id);
    if (person?.consent_state === 'withheld') {
      out.push({ code: 'consent_withheld', severity: 'caveat', subject_ref: ref });
    }
  }
  return out;
}

function resolveRelationshipPersonForScope(input: BuildFeatureSnapshotInput): StageResult<{
  readonly ref: Extract<SubjectRef, { kind: 'person' }>;
  readonly display_name_snapshot: string;
}> {
  if (input.mirror_scope.kind !== 'relationship_natal') {
    return {
      ok: false,
      error: {
        stage: 'build_feature_snapshot',
        kind: 'stage_invalid_input',
        detail: 'relationship_natal scope is required',
      },
    };
  }
  if (
    input.related_person_refs.length !== 1 ||
    !subjectRefEquals(input.related_person_refs[0]!, input.mirror_scope.related_person_ref)
  ) {
    return {
      ok: false,
      error: {
        stage: 'build_feature_snapshot',
        kind: 'stage_invalid_input',
        detail: 'relationship_natal requires exactly one related_person_ref matching mirror_scope.related_person_ref',
      },
    };
  }
  const ref = input.mirror_scope.related_person_ref;
  const person = input.space.persons.find((candidate) => candidate.id === ref.id);
  if (!person) {
    return {
      ok: false,
      error: {
        stage: 'build_feature_snapshot',
        kind: 'stage_missing_input',
        subject_ref: ref,
        detail: `relationship_natal related person ${ref.id} does not resolve`,
      },
    };
  }
  if (person.consent_state === 'withheld') {
    return {
      ok: false,
      error: {
        stage: 'build_feature_snapshot',
        kind: 'stage_invalid_input',
        subject_ref: ref,
        detail: `relationship_natal consent_withheld for ${ref.id}`,
      },
    };
  }
  return { ok: true, value: { ref, display_name_snapshot: person.display_name } };
}

function deriveRelationshipEvidenceForScope(input: {
  readonly build_input: BuildFeatureSnapshotInput;
  readonly method_evidence: MethodEvidence;
}): StageResult<RelationshipHePanEvidence | undefined> {
  if (input.build_input.mirror_scope.kind !== 'relationship_natal') {
    return { ok: true, value: undefined };
  }
  const person = resolveRelationshipPersonForScope(input.build_input);
  if (!person.ok) return person;
  return deriveRelationshipHePanEvidence({
    method_evidence: input.method_evidence,
    related_person_ref: person.value.ref,
    display_name_snapshot: person.value.display_name_snapshot,
    anchor_year: input.build_input.mirror_scope.anchor_year,
  });
}

export function buildAstrologyFeatureSnapshot(
  input: BuildFeatureSnapshotInput,
): StageResult<AstrologyFeatureSnapshot> {
  const windowResult = resolveCanonicalMirrorWindow(input.mirror_scope);
  if (!windowResult.ok) return windowResult;
  const canonicalWindow = windowResult.value;

  if (input.mirror_scope.kind === 'relationship_natal') {
    const relationshipPerson = resolveRelationshipPersonForScope(input);
    if (!relationshipPerson.ok) return relationshipPerson;
  }

  const methodId = input.method_profile_id ?? input.space.settings.method_profile_id ?? DEFAULT_METHOD_PROFILE_ID;
  const engine = getMethodEngine(methodId);
  if (!engine) {
    return {
      ok: false,
      error: { stage: 'build_feature_snapshot', kind: 'stage_invalid_input', detail: `method profile ${methodId} is reserved/not admitted` },
    };
  }

  const selfResolved = resolveSubject('self', input.space);
  if (!selfResolved.ok) return selfResolved;

  const related: ResolvedSubject[] = [];
  for (const ref of input.related_person_refs) {
    const resolved = resolveSubject(ref, input.space);
    if (!resolved.ok) return resolved;
    related.push(resolved.value);
  }

  const dayunRequired = input.dayun_required_override ?? deriveDayunRequired(input.mirror_kind, input.mirror_scope);

  const evidenceResult = engine.computeEvidence({
    self_subject: selfResolved.value,
    related_persons: related,
    mirror_kind: input.mirror_kind,
    mirror_scope: input.mirror_scope,
    canonical_window: canonicalWindow,
    dayun_required: dayunRequired,
  });
  if (!evidenceResult.ok) return evidenceResult;

  const commonResult = engine.deriveCommonDrivers({
    evidence: evidenceResult.value,
    mirror_kind: input.mirror_kind,
    mirror_scope: input.mirror_scope,
    canonical_window: canonicalWindow,
    active_concern_tags: input.active_concern_tags,
  });
  if (!commonResult.ok) return commonResult;
  const methodEvidence = engine.toMethodEvidence(evidenceResult.value);

  const relationshipEvidenceResult = deriveRelationshipEvidenceForScope({
    build_input: input,
    method_evidence: methodEvidence,
  });
  if (!relationshipEvidenceResult.ok) return relationshipEvidenceResult;

  // Append orchestration-level uncertainty (engine owns astrology-intrinsic ones).
  const uncertainty: UncertaintyInput[] = [
    ...commonResult.value.uncertainty_inputs,
    ...consentUncertainty(input.related_person_refs, input.space),
  ];
  // 命镜 is a whole-life natal surface; it is self-anchored and does not require
  // concern tags (SJG-IA-08), like the consultation mirror.
  if (
    input.active_concern_tags.length === 0 &&
    input.mirror_kind !== 'shijing' &&
    input.mirror_kind !== 'mingjing'
  ) {
    uncertainty.push({ code: 'no_active_concern_tags', severity: 'fail_close' });
  }
  const common: CommonDrivers = {
    ...commonResult.value,
    ...(relationshipEvidenceResult.value
      ? { relationship_hepan: relationshipEvidenceResult.value }
      : {}),
    uncertainty_inputs: uncertainty,
  };

  const snapshot: AstrologyFeatureSnapshot = {
    method_profile: engine.profile,
    mirror_kind: input.mirror_kind,
    canonical_window: canonicalWindow,
    common,
    method_evidence: methodEvidence,
  };
  return { ok: true, value: snapshot };
}
