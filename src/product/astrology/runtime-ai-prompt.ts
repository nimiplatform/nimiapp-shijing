// SJG-ALGO-13 — Runtime AI prompt builder.

import type { AstrologyFeatureSnapshot } from '../../domain/algorithm.ts';
import type { ConcernTagSnapshot } from '../../domain/concern-tag.ts';
import type { MirrorContextSnapshot, Reading } from '../../domain/reading.ts';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import type { ResponsePreferences } from '../../domain/settings.ts';

export interface RuntimeAiPromptRequest {
  readonly mirror_kind: MirrorKind;
  readonly system_prompt: string;
  readonly user_prompt: string;
  readonly schema_name: string;
}

const SYSTEM_PREAMBLE = [
  'You are the ShiJing wording layer.',
  'Deterministic astrology features are the source of truth.',
  'NEVER calculate pillars, DaYun, or solar terms.',
  'NEVER invent uncited memory or plan influence.',
  'Output MUST be a single JSON object matching the requested schema.',
  'NEVER emit markdown, prose-only text, score, luck_score, trend_chart, k_line, report, or task fields.',
].join('\n');

function summarizeConcernTags(tags: readonly ConcernTagSnapshot[]): string {
  if (tags.length === 0) return '(no active concern tags)';
  return tags
    .map((tag) => `${tag.label} (id=${tag.id}; status=${tag.status}; topics=${tag.parsed_topics.join(',')})`)
    .join('\n');
}

export function buildRuntimeAiPromptRequest(args: {
  readonly mirror_kind: MirrorKind;
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly mirror_context: MirrorContextSnapshot;
  readonly response_preferences: ResponsePreferences;
  readonly question?: string;
  readonly source_readings?: readonly Reading[];
}): RuntimeAiPromptRequest {
  const userPromptLines = [
    `mirror_kind: ${args.mirror_kind}`,
    `tone: ${args.response_preferences.tone}; length: ${args.response_preferences.length}; language: ${args.response_preferences.language}`,
    `active_concern_tags:\n${summarizeConcernTags(args.mirror_context.active_concern_tags)}`,
    `canonical_window: ${args.feature_snapshot.canonical_window.start_utc} → ${args.feature_snapshot.canonical_window.end_utc} (${args.feature_snapshot.canonical_window.basis_time_zone})`,
    `cited_event_memory_refs: ${JSON.stringify(args.mirror_context.cited_event_memory_refs)}`,
    `cited_plan_item_refs: ${JSON.stringify(args.mirror_context.cited_plan_item_refs)}`,
  ];
  if (args.question) {
    userPromptLines.push(`question: ${args.question}`);
  }
  if (args.source_readings && args.source_readings.length > 0) {
    userPromptLines.push(
      `source_readings: ${args.source_readings.map((r) => `${r.mirror_kind}:${r.id}`).join(', ')}`,
    );
  }
  if (args.response_preferences.extra_instructions) {
    userPromptLines.push(`extra_instructions: ${args.response_preferences.extra_instructions}`);
  }
  return {
    mirror_kind: args.mirror_kind,
    system_prompt: SYSTEM_PREAMBLE,
    user_prompt: userPromptLines.join('\n\n'),
    schema_name: `shijing.mirror_output.${args.mirror_kind}.v1`,
  };
}
