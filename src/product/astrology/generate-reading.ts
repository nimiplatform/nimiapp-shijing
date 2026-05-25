// SJG-ALGO-02 — Reading generation orchestrator.
//
//   NatalInputs
//     -> NatalCanonicalization
//     -> NatalChartSnapshot
//     -> CycleSnapshot
//     -> AstrologyFeatureSnapshot   (deterministic stages above)
//     -> Runtime AI wording          (RuntimeAiClient)
//     -> validateReading             (wave-0 contract)
//     -> persisted Reading
//
// Wave-13 hardens the orchestrator to enforce SJG-ALGO-10 +
// SJG-ALGO-11 + SJG-ASTRO-08 invariants on the resulting Reading:
//   - input_hash / feature_snapshot_hash / view-snapshot hashes are
//     real canonical SHA-256 digests of the underlying objects;
//   - subject_summaries / relation_summaries / event_summaries carry
//     real evidence drawn from the ShiJingSpace;
//   - uncertainty is derived from the SJG-ALGO-10 decision table;
//   - dayun_required is auto-derived from kind/scope/view/time_window.
// The orchestrator NEVER returns synthesized Reading content on
// failure and NEVER skips validateReading.

import type { InputsSummary, Reading, ReadingTimeWindow, SubjectSummary, RelationSummary, EventSummary } from '../../domain/reading.ts';
import type { ReadingKind, ReadingScope } from '../../domain/reading-matrix.ts';
import type { Relation } from '../../domain/relation.ts';
import type { Event } from '../../domain/event.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import type { View } from '../../domain/view.ts';
import { isSelfRef, isPersonRef, subjectRefEquals } from '../../domain/subject-ref.ts';
import { validateReading } from '../../contracts/reading-validator.ts';
import {
  ASTROLOGY_METHOD_PROFILE_ID,
  SJG_ALGO_CONTRACT_VERSION,
  SJG_ASTRO_CONTRACT_VERSION,
  type AstrologyFeatureSnapshot,
  type NatalCanonicalization,
} from '../../domain/algorithm.ts';
import { buildAstrologyFeatureSnapshot, deriveDayunRequired } from './build-feature-snapshot.ts';
import { canonicalizeNatalInputs } from './canonicalize-natal-inputs.ts';
import { computeCanonicalHash } from './canonical-hash.ts';
import {
  NoOpRuntimeAiClient,
  type RuntimeAiClient,
  type RuntimeAiRequest,
  type RuntimeAiViewContext,
  type RuntimeAiAdHocContext,
} from './runtime-ai-client.ts';
import type { StageFailure } from './stage-result.ts';
import { deriveUncertainty } from './uncertainty-decision.ts';

export interface GenerateReadingInput {
  readonly id: string;
  readonly created_at: string;
  readonly kind: ReadingKind;
  readonly scope: ReadingScope;
  readonly anchor_subject: SubjectRef;
  readonly subjects: readonly SubjectRef[];
  readonly time_window: ReadingTimeWindow;
  readonly space: ShiJingSpace;
  readonly view?: View;
  readonly ad_hoc_context_text?: string;
}

export type GenerateReadingFailureKind =
  | 'pipeline_stage_failed'
  | 'runtime_ai_failed'
  | 'reading_validation_failed';

export type GenerateReadingFailure =
  | { kind: 'pipeline_stage_failed'; stage_failure: StageFailure }
  | { kind: 'runtime_ai_failed'; ai_failure: { kind: string; detail: string } }
  | { kind: 'reading_validation_failed'; validation_error: { code: string } };

export type GenerateReadingResult =
  | { ok: true; reading: Reading }
  | { ok: false; error: GenerateReadingFailure };

export interface GenerateReadingDependencies {
  readonly runtime_ai_client?: RuntimeAiClient;
}

function buildRuntimeAiRequest(
  input: GenerateReadingInput,
  view: View | undefined,
  ad_hoc_context_text: string | undefined,
  feature_snapshot: AstrologyFeatureSnapshot,
): RuntimeAiRequest {
  const view_context: RuntimeAiViewContext | undefined = view
    ? {
        view_id: view.id,
        anchor_subject: view.anchor_subject,
        instructions: view.instructions,
        memory_summary: view.view_memory.summary,
      }
    : undefined;
  const ad_hoc_context: RuntimeAiAdHocContext | undefined =
    ad_hoc_context_text !== undefined ? { text: ad_hoc_context_text } : undefined;
  return {
    feature_snapshot,
    response_preferences: input.space.settings.response_preferences,
    view_context,
    ad_hoc_context,
  };
}

// SJG-ASTRO-08: per-subject summary line. Format:
//   - self subject:   "self · {calendar_system} · {birth_datetime_utc}"
//   - person subject: "{display_name} · {calendar_system} · {birth_datetime_utc}"
// Subjects not present in the space (defensive) yield
// "{key} · subject_unknown".
function buildSubjectSummary(subject: SubjectRef, space: ShiJingSpace): SubjectSummary {
  if (isSelfRef(subject)) {
    const inputs = space.self_subject.natal_inputs;
    return {
      subject,
      summary: `self · ${inputs.calendar_system} · ${inputs.birth_datetime_utc}`,
    };
  }
  if (isPersonRef(subject)) {
    const person = space.persons.find((p) => p.id === subject.id);
    if (!person) {
      return { subject, summary: `person:${subject.id} · subject_unknown` };
    }
    return {
      subject,
      summary: `${person.display_name} · ${person.natal_inputs.calendar_system} · ${person.natal_inputs.birth_datetime_utc}`,
    };
  }
  return { subject, summary: 'subject_unknown' };
}

function subjectInList(subject: SubjectRef, list: readonly SubjectRef[]): boolean {
  return list.some((entry) => subjectRefEquals(entry, subject));
}

// SJG-ASTRO-08: relation summaries include only relations whose
// from/to membership intersects this reading's subjects[].
function buildRelationSummaries(
  subjects: readonly SubjectRef[],
  relations: readonly Relation[],
): RelationSummary[] {
  const out: RelationSummary[] = [];
  for (const rel of relations) {
    if (subjectInList(rel.from_subject, subjects) || subjectInList(rel.to_subject, subjects)) {
      out.push({
        from_subject: rel.from_subject,
        to_subject: rel.to_subject,
        relation_kind: rel.relation_kind,
      });
    }
  }
  return out;
}

// SJG-ASTRO-08: event summaries include only events whose participants
// intersect this reading's subjects[] AND whose occurred_at falls
// inside the reading's time_window. Natal-mode readings (sign) include
// no events because there is no time window.
function buildEventSummaries(
  subjects: readonly SubjectRef[],
  events: readonly Event[],
  timeWindow: ReadingTimeWindow,
): EventSummary[] {
  if (timeWindow.mode === 'natal') return [];
  if (!timeWindow.start_utc || !timeWindow.end_utc) return [];
  const startMs = new Date(timeWindow.start_utc).getTime();
  const endMs = new Date(timeWindow.end_utc).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return [];
  const out: EventSummary[] = [];
  for (const ev of events) {
    const participants: readonly SubjectRef[] = [ev.primary_subject, ...ev.participants];
    const participantOverlap = participants.some((p) => subjectInList(p, subjects));
    if (!participantOverlap) continue;
    const tMs = new Date(ev.occurred_at).getTime();
    if (!Number.isFinite(tMs)) continue;
    if (tMs < startMs || tMs > endMs) continue;
    out.push({
      subject: ev.primary_subject,
      occurred_at: ev.occurred_at,
      title: ev.title,
    });
  }
  return out;
}

// Re-canonicalize each subject's natal inputs so the orchestrator can
// pass them to deriveUncertainty (location/timezone detection lives on
// the canonicalization shape).
function canonicalizationsForSubjects(
  subjects: readonly SubjectRef[],
  space: ShiJingSpace,
): Array<NatalCanonicalization | undefined> {
  const out: Array<NatalCanonicalization | undefined> = [];
  for (const subject of subjects) {
    let inputs;
    if (isSelfRef(subject)) {
      inputs = space.self_subject.natal_inputs;
    } else if (isPersonRef(subject)) {
      inputs = space.persons.find((p) => p.id === subject.id)?.natal_inputs;
    }
    if (!inputs) { out.push(undefined); continue; }
    const r = canonicalizeNatalInputs(inputs);
    out.push(r.ok ? r.value : undefined);
  }
  return out;
}

export async function generateReading(
  input: GenerateReadingInput,
  deps: GenerateReadingDependencies = {},
): Promise<GenerateReadingResult> {
  const dayunRequired = deriveDayunRequired(input.kind, input.scope, input.view, input.time_window);
  const featureResult = buildAstrologyFeatureSnapshot({
    subjects: input.subjects,
    time_window: input.time_window,
    space: input.space,
    kind: input.kind,
    scope: input.scope,
    ...(input.view ? { view: input.view } : {}),
    dayun_required: dayunRequired,
  });
  if (!featureResult.ok) {
    return { ok: false, error: { kind: 'pipeline_stage_failed', stage_failure: featureResult.error } };
  }
  const featureSnapshot = featureResult.value;
  const runtimeAiClient = deps.runtime_ai_client ?? new NoOpRuntimeAiClient();
  const aiResult = await runtimeAiClient.generate(
    buildRuntimeAiRequest(input, input.view, input.ad_hoc_context_text, featureSnapshot),
  );
  if (!aiResult.ok) {
    return {
      ok: false,
      error: { kind: 'runtime_ai_failed', ai_failure: aiResult.error },
    };
  }
  // SJG-ALGO-11 — real canonical hashes. `input_hash` covers the
  // per-subject canonicalizations + the time window + the v1 method
  // profile (the spec lists this exact set). `feature_snapshot_hash`
  // covers the whole feature snapshot.
  const canonicalizations = canonicalizationsForSubjects(input.subjects, input.space);
  const inputHash = computeCanonicalHash({
    method_profile: featureSnapshot.method_profile,
    time_window: input.time_window,
    canonicalizations,
  });
  const featureSnapshotHash = computeCanonicalHash(featureSnapshot);

  const subjectSummaries: SubjectSummary[] = input.subjects.map((s) => buildSubjectSummary(s, input.space));
  const relationSummaries: RelationSummary[] = buildRelationSummaries(input.subjects, input.space.relations);
  const eventSummaries: EventSummary[] = buildEventSummaries(input.subjects, input.space.events, input.time_window);

  const inputsSummary: InputsSummary = {
    captured_at: input.created_at,
    contract_version: SJG_ASTRO_CONTRACT_VERSION,
    algorithm_contract_version: SJG_ALGO_CONTRACT_VERSION,
    method_profile: featureSnapshot.method_profile,
    time_window: input.time_window,
    input_hash: inputHash,
    feature_snapshot_hash: featureSnapshotHash,
    feature_snapshot: featureSnapshot,
    subject_summaries: subjectSummaries,
    relation_summaries: relationSummaries,
    event_summaries: eventSummaries,
    view_snapshot: input.view
      ? {
          view_id: input.view.id,
          anchor_subject: input.view.anchor_subject,
          subjects: input.view.subjects,
          time_scope: input.view.time_scope,
          instructions_hash: computeCanonicalHash(input.view.instructions ?? null),
          context_items_hash: computeCanonicalHash(input.view.context_items ?? []),
          memory_summary_hash: computeCanonicalHash(input.view.view_memory?.summary ?? null),
          memory_locked: input.view.view_memory.locked,
        }
      : undefined,
    ad_hoc_context: input.ad_hoc_context_text,
  };

  const uncertainty = deriveUncertainty({
    feature_snapshot: featureSnapshot,
    canonicalizations,
    ...(input.view ? { view: input.view } : {}),
    ai_parse_failed: false,
  });

  const candidateReading: Reading = {
    id: input.id,
    created_at: input.created_at,
    scope: input.scope,
    kind: input.kind,
    anchor_subject: input.anchor_subject,
    subjects: input.subjects,
    time_window: input.time_window,
    view_id: input.view?.id,
    inputs_summary: inputsSummary,
    output: aiResult.output,
    uncertainty,
  };
  const validation = validateReading(candidateReading);
  if (!validation.ok) {
    return {
      ok: false,
      error: { kind: 'reading_validation_failed', validation_error: { code: validation.error.code } },
    };
  }
  // The pipeline NEVER returns a Reading without method_profile.id being the v1 stack;
  // assert at runtime as defence-in-depth in case future stages mutate it.
  if (candidateReading.inputs_summary.method_profile.id !== ASTROLOGY_METHOD_PROFILE_ID) {
    return {
      ok: false,
      error: {
        kind: 'reading_validation_failed',
        validation_error: { code: 'reading_inputs_summary_method_profile_id_mismatch' },
      },
    };
  }
  return { ok: true, reading: candidateReading };
}
