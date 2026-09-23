// What a RiJing generation for "now" would use, and whether the saved Reading
// is still current for it. RiJing page rendering and the in-app RiJing
// generation entry share this so both agree on "already generated today".

import type { DailyMirrorScope } from '../../domain/mirror-scope.ts';
import type { Reading } from '../../domain/reading.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { computeCanonicalHash } from '../astrology/canonical-hash.ts';
import { inputsSummaryStaleForSpace } from '../astrology/inputs-summary-expiry.ts';
import { subjectMirrorReadiness, type NatalReadiness } from '../subjects/natal-readiness.ts';
import { deriveRiJingReferenceEventRefs } from '../tabs/rijing/rijing-derive.ts';
import { dailyMirrorScopeForToday } from '../tabs/mirror-scope-helpers.ts';
import { latestReadingByMirrorKind } from './reading-selectors.ts';

export interface RiJingPlan {
  readonly scope: DailyMirrorScope;
  readonly active_tag_ids: readonly string[];
  readonly reference_event_refs: readonly string[];
  readonly readiness: NatalReadiness;
  // The latest saved RiJing Reading of the selected method, current or not.
  readonly latest_reading: Reading | undefined;
  // The saved Reading when its frozen inputs still match this plan.
  readonly current_reading: Reading | undefined;
  // Whether a RiJing Reading of the selected method exists for today at all.
  readonly has_reading_today: boolean;
  // Identifies the generation inputs; an automatic attempt is made at most
  // once per signature.
  readonly signature: string;
}

export function planRiJing(space: ShiJingSpace, now: Date): RiJingPlan {
  const scope = dailyMirrorScopeForToday(now);
  const activeTags = space.concern_tags.filter((tag) => tag.status === 'active');
  const activeTagIds = activeTags.map((tag) => tag.id);
  const referenceEventRefs = deriveRiJingReferenceEventRefs({ memories: space.event_memories, scope });
  const latest = latestReadingByMirrorKind({
    readings: space.readings,
    mirror_kind: 'rijing',
    method_profile_id: space.settings.method_profile_id,
  });
  const stale = latest
    ? inputsSummaryStaleForSpace({
        reading: latest,
        space,
        now,
        expected_mirror_scope: scope,
        expected_concern_tag_refs: activeTagIds,
        expected_cited_event_memory_refs: referenceEventRefs,
      })
    : false;
  const signature = computeCanonicalHash({
    mirror_scope: scope,
    // Switching the 命理 method starts a new signature so the mirror
    // regenerates under the new engine.
    method_profile_id: space.settings.method_profile_id ?? null,
    self_natal_inputs: space.self_subject.natal_inputs,
    active_concern_tags: activeTags.map((tag) => ({
      id: tag.id,
      label: tag.label,
      status: tag.status,
      sort_order: tag.sort_order,
      parsed_topics: tag.parsed_topics,
      mention_refs: tag.mention_refs,
      prompt_text: tag.prompt_text,
    })),
    response_preferences: space.settings.response_preferences,
    cited_event_memory_refs: referenceEventRefs,
  });
  return {
    scope,
    active_tag_ids: activeTagIds,
    reference_event_refs: referenceEventRefs,
    readiness: subjectMirrorReadiness({ subject: 'self', space, mirror_kind: 'rijing', mirror_scope: scope }),
    latest_reading: latest,
    current_reading: latest && !stale ? latest : undefined,
    has_reading_today: latest?.mirror_scope.kind === 'daily' && latest.mirror_scope.date === scope.date,
    signature,
  };
}
