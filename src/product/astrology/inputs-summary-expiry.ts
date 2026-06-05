// SJG-ASTRO-10 — InputsSummary expiry classifier under the Mirror
// Architecture v1.
//
//   mirror_kind === 'rijing'    → 24h horizon
//   mirror_kind === 'yuejing'   → 7d  horizon
//   mirror_kind === 'nianjing'  → 30d horizon
//   mirror_kind === 'shijing'   → 7d  horizon (for new AI turns)

import type { Reading } from '../../domain/reading.ts';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import type { AstrologyFeatureSnapshot } from '../../domain/algorithm.ts';
import type { ConcernTag, ConcernTagSnapshot } from '../../domain/concern-tag.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { buildAstrologyFeatureSnapshot } from './build-feature-snapshot.ts';
import { computeCanonicalHash } from './canonical-hash.ts';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export const INPUTS_SUMMARY_EXPIRY_HORIZONS_MS: Readonly<Record<MirrorKind, number>> = {
  rijing: 24 * MS_PER_HOUR,
  yuejing: 7 * MS_PER_DAY,
  nianjing: 30 * MS_PER_DAY,
  shijing: 7 * MS_PER_DAY,
};

export function expiryHorizonMs(mirrorKind: MirrorKind): number {
  return INPUTS_SUMMARY_EXPIRY_HORIZONS_MS[mirrorKind];
}

export function inputsSummaryExpired(reading: Reading, now: Date): boolean {
  const horizon = expiryHorizonMs(reading.mirror_kind);
  const capturedMs = new Date(reading.inputs_summary.captured_at).getTime();
  if (Number.isNaN(capturedMs)) return false;
  const elapsed = now.getTime() - capturedMs;
  return elapsed > horizon;
}

export type InputsSummaryStalenessReason =
  | 'age'
  | 'mirror_scope_changed'
  | 'concern_tag_missing'
  | 'feature_snapshot_failed'
  | 'input_hash_changed'
  | 'feature_snapshot_hash_changed';

export interface InputsSummaryStalenessInput {
  readonly reading: Reading;
  readonly space: ShiJingSpace;
  readonly now: Date;
  readonly expected_mirror_scope?: Reading['mirror_scope'];
  readonly expected_concern_tag_refs?: readonly string[];
}

export type InputsSummaryStaleness =
  | { readonly stale: false }
  | { readonly stale: true; readonly reason: InputsSummaryStalenessReason };

function responsePreferencesHash(space: ShiJingSpace): string {
  return computeCanonicalHash(space.settings.response_preferences);
}

function concernTagSnapshots(
  tags: readonly ConcernTag[],
  capturedAt: string,
): ConcernTagSnapshot[] {
  return tags.map((tag) => {
    const personRefs: SubjectRef[] = [];
    for (const mention of tag.mention_refs) {
      if (mention.resolved_subject_ref) personRefs.push(mention.resolved_subject_ref);
    }
    return {
      id: tag.id,
      label: tag.label,
      status: tag.status,
      sort_order: tag.sort_order,
      parsed_topics: tag.parsed_topics,
      mention_refs: tag.mention_refs,
      prompt_text_hash: computeCanonicalHash(tag.prompt_text),
      resolved_person_refs: personRefs,
      captured_at: capturedAt,
    };
  });
}

function activeConcernTagsForRefs(
  refs: readonly string[],
  space: ShiJingSpace,
): { ok: true; tags: ConcernTag[] } | { ok: false } {
  const tags: ConcernTag[] = [];
  for (const ref of refs) {
    const tag = space.concern_tags.find((candidate) => candidate.id === ref);
    if (!tag) return { ok: false };
    if (tag.status === 'active') tags.push(tag);
  }
  return { ok: true, tags };
}

export function inputsSummaryStalenessForSpace(
  input: InputsSummaryStalenessInput,
): InputsSummaryStaleness {
  const { reading, space, now } = input;
  if (inputsSummaryExpired(reading, now)) return { stale: true, reason: 'age' };

  if (
    input.expected_mirror_scope &&
    computeCanonicalHash(input.expected_mirror_scope) !== computeCanonicalHash(reading.mirror_scope)
  ) {
    return { stale: true, reason: 'mirror_scope_changed' };
  }

  const tagRefs = input.expected_concern_tag_refs ?? reading.concern_tag_refs;
  const tagsResult = activeConcernTagsForRefs(tagRefs, space);
  if (!tagsResult.ok) return { stale: true, reason: 'concern_tag_missing' };

  const featureResult = buildAstrologyFeatureSnapshot({
    mirror_kind: reading.mirror_kind,
    mirror_scope: reading.mirror_scope,
    space,
    related_person_refs: reading.related_person_refs,
    active_concern_tags: tagsResult.tags,
  });
  if (!featureResult.ok) return { stale: true, reason: 'feature_snapshot_failed' };

  const featureSnapshot = featureResult.value;
  const snapshots = concernTagSnapshots(tagsResult.tags, reading.inputs_summary.captured_at);
  const currentInputHash = computeCanonicalHash({
    method_profile: featureSnapshot.method_profile,
    mirror_scope: reading.mirror_scope,
    canonical_window: featureSnapshot.canonical_window,
    concern_tag_snapshots: snapshots,
    related_person_refs: reading.related_person_refs,
    cited_event_memory_refs: reading.cited_event_memory_refs,
    cited_plan_item_refs: reading.cited_plan_item_refs,
    response_preferences_hash: responsePreferencesHash(space),
  });
  if (currentInputHash !== reading.inputs_summary.input_hash) {
    return { stale: true, reason: 'input_hash_changed' };
  }

  const currentFeatureSnapshotHash = computeCanonicalHash(featureSnapshot);
  if (currentFeatureSnapshotHash !== reading.inputs_summary.feature_snapshot_hash) {
    return { stale: true, reason: 'feature_snapshot_hash_changed' };
  }

  return { stale: false };
}

export function inputsSummaryStaleForSpace(input: InputsSummaryStalenessInput): boolean {
  return inputsSummaryStalenessForSpace(input).stale;
}

function projectFeatureSnapshotToConcernRefs(
  snapshot: AstrologyFeatureSnapshot,
  concernTagRefs: ReadonlySet<string>,
): AstrologyFeatureSnapshot {
  return {
    ...snapshot,
    yuejing_tendency_drivers: snapshot.yuejing_tendency_drivers.filter((driver) =>
      concernTagRefs.has(driver.concern_tag_ref),
    ),
    nianjing_phase_drivers: snapshot.nianjing_phase_drivers.filter((driver) =>
      concernTagRefs.has(driver.concern_tag_ref),
    ),
    nianjing_inflection_drivers: snapshot.nianjing_inflection_drivers.filter((driver) =>
      concernTagRefs.has(driver.concern_tag_ref),
    ),
  };
}

export interface YueJingSubsetFreshnessInput extends InputsSummaryStalenessInput {
  readonly active_concern_tag_refs: readonly string[];
}

export function yuejingInputsSummaryStalenessForActiveSubset(
  input: YueJingSubsetFreshnessInput,
): InputsSummaryStaleness {
  if (input.reading.mirror_kind !== 'yuejing') {
    return inputsSummaryStalenessForSpace(input);
  }

  const { reading, space, now } = input;
  if (inputsSummaryExpired(reading, now)) return { stale: true, reason: 'age' };

  if (
    input.expected_mirror_scope &&
    computeCanonicalHash(input.expected_mirror_scope) !== computeCanonicalHash(reading.mirror_scope)
  ) {
    return { stale: true, reason: 'mirror_scope_changed' };
  }

  const activeRefSet = new Set(input.active_concern_tag_refs);
  const reusableRefs = reading.concern_tag_refs.filter((ref) => activeRefSet.has(ref));
  if (reusableRefs.length === 0) return { stale: false };

  const tagsResult = activeConcernTagsForRefs(reusableRefs, space);
  if (!tagsResult.ok) return { stale: true, reason: 'concern_tag_missing' };

  const storedContextTags = reading.inputs_summary.mirror_context_snapshot.active_concern_tags
    .filter((tag) => activeRefSet.has(tag.id));
  const currentContextTags = concernTagSnapshots(tagsResult.tags, reading.inputs_summary.captured_at);
  if (computeCanonicalHash(currentContextTags) !== computeCanonicalHash(storedContextTags)) {
    return { stale: true, reason: 'input_hash_changed' };
  }

  const featureResult = buildAstrologyFeatureSnapshot({
    mirror_kind: reading.mirror_kind,
    mirror_scope: reading.mirror_scope,
    space,
    related_person_refs: reading.related_person_refs,
    active_concern_tags: tagsResult.tags,
  });
  if (!featureResult.ok) return { stale: true, reason: 'feature_snapshot_failed' };

  const reusableRefSet = new Set(reusableRefs);
  const storedProjected = projectFeatureSnapshotToConcernRefs(
    reading.inputs_summary.feature_snapshot,
    reusableRefSet,
  );
  const currentProjected = projectFeatureSnapshotToConcernRefs(featureResult.value, reusableRefSet);
  if (computeCanonicalHash(currentProjected) !== computeCanonicalHash(storedProjected)) {
    return { stale: true, reason: 'feature_snapshot_hash_changed' };
  }

  return { stale: false };
}

export function yuejingInputsSummaryStaleForActiveSubset(
  input: YueJingSubsetFreshnessInput,
): boolean {
  return yuejingInputsSummaryStalenessForActiveSubset(input).stale;
}
