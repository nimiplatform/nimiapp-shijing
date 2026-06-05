// SJG-ALGO-13 — Runtime AI prompt builder.

import type { AstrologyFeatureSnapshot } from '../../domain/algorithm.ts';
import type { ConcernTagSnapshot } from '../../domain/concern-tag.ts';
import type { MirrorContextSnapshot, Reading } from '../../domain/reading.ts';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import type { MirrorOutput } from '../../domain/mirror-output.ts';
import type { ResponsePreferences } from '../../domain/settings.ts';

export interface RuntimeAiPromptRequest {
  readonly mirror_kind: MirrorKind;
  readonly system_prompt: string;
  readonly user_prompt: string;
  readonly schema_name: string;
  readonly deterministic_output: MirrorOutput;
}

const SYSTEM_PREAMBLE = [
  'You are the ShiJing wording layer.',
  'Deterministic astrology features are the source of truth.',
  'NEVER calculate pillars, DaYun, or solar terms.',
  'NEVER invent uncited memory or plan influence.',
  'interpretive_evidence (用神/旺衰/十神/四化) is read-only 命理 grounding: use it to make wording specific and causal, but never recompute it or echo it as output fields.',
  'Output MUST be a single JSON wording patch object, not a full MirrorOutput.',
  'patch_kind MUST equal shijing.runtime_ai_wording_patch.v1.',
  'mirror_kind MUST equal required_top_level_mirror_kind exactly.',
  'Only include allowed wording patch fields in the output patch. Do not include citations, ranges, horizons, tendency_class, nature, driver_refs, score, luck_score, trend_chart, k_line, report, or task fields.',
  'Patch targets MUST use existing ids and dates from wording_patch_target_json.',
  'For YueJing, each cell summary must be specific to that cell concern_label / parsed_topics and must not reuse the same sentence for another concern_tag_ref on the same date.',
  'The first output character must be { and the last output character must be }.',
].join('\n');

function summarizeConcernTags(tags: readonly ConcernTagSnapshot[]): string {
  if (tags.length === 0) return '(no active concern tags)';
  return tags
    .map((tag) => `${tag.label} (id=${tag.id}; status=${tag.status}; topics=${tag.parsed_topics.join(',')})`)
    .join('\n');
}

function schemaShapeForKind(kind: MirrorKind): string {
  switch (kind) {
    case 'rijing':
      return [
        'patch_fields: patch_kind, mirror_kind, summary?, daily_overview?, concern_projections?',
        'concern_projections items: concern_tag_ref, summary?, recommendations?',
        'If recommendations is present it must be an array of non-empty strings. If omitted, deterministic recommendations are preserved.',
      ].join('\n');
    case 'yuejing':
      return [
        'patch_fields: patch_kind, mirror_kind, summary?, cells?',
        'cells items: date, concern_tag_ref, summary?',
      ].join('\n');
    case 'nianjing':
      return [
        'patch_fields: patch_kind, mirror_kind, summary?, phase_bands?, inflection_points?',
        'phase_bands items: concern_tag_ref, start_date, end_date, summary?',
        'inflection_points items: concern_tag_ref, date, summary?',
      ].join('\n');
    case 'shijing':
      return [
        'patch_fields: patch_kind, mirror_kind, summary?, answer?',
      ].join('\n');
  }
}

function tagSnapshotById(tags: readonly ConcernTagSnapshot[]): Map<string, ConcernTagSnapshot> {
  return new Map(tags.map((tag) => [tag.id, tag]));
}

const ELEMENT_CN: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };

// SJG-ALGO-13 — read-only, method-namespaced evidence projection (display labels
// only, no recompute hooks). Grounds the wording in the engine's interpretive
// layer without exposing raw method_evidence structure.
function interpretiveEvidenceProjection(snapshot: AstrologyFeatureSnapshot): string | null {
  const me = snapshot.method_evidence;
  if (me.method_id === 'bazi_ziping_v1') {
    const it = me.bazi.self_subject.interpretation;
    if (!it) return null;
    const els = (xs: readonly string[]) => xs.map((e) => ELEMENT_CN[e] ?? e).join('') || '—';
    const pillars = it.pillars.map((p) => `${p.position}:${p.ten_god}`).join(' ');
    const rels = it.natal_branch_relations.map((r) => `${r.positions.join('-')}${r.kind}`).join(' ') || '无';
    return [
      'interpretive_evidence (bazi_ziping_v1, read-only):',
      `  旺衰: ${it.strength.band}`,
      `  用神: ${els(it.yong_shen.yong)}; 喜: ${els(it.yong_shen.xi)}; 忌: ${els(it.yong_shen.ji)}${it.yong_shen.tiaohou ? `; 调候: ${ELEMENT_CN[it.yong_shen.tiaohou] ?? it.yong_shen.tiaohou}` : ''}`,
      `  十神: ${pillars}`,
      `  natal 合冲刑害破: ${rels}`,
    ].join('\n');
  }
  if (me.method_id === 'ziwei_sanhe_v1') {
    const self = me.ziwei.self_subject;
    const hua = self.palaces.flatMap((p) => p.major_stars.filter((s) => s.mutagen).map((s) => `${s.name}化${s.mutagen}@${p.name}`));
    return [
      'interpretive_evidence (ziwei_sanhe_v1, read-only):',
      `  命宫: ${self.soul_palace_branch}; 命主: ${self.soul_star}; 身主: ${self.body_star}; 五行局: ${self.five_elements_class}`,
      `  生年四化: ${hua.join(' ') || '无'}`,
    ].join('\n');
  }
  return null;
}

function wordingTargetFor(
  output: MirrorOutput,
  activeConcernTags: readonly ConcernTagSnapshot[],
): unknown {
  const tags = tagSnapshotById(activeConcernTags);
  switch (output.mirror_kind) {
    case 'rijing':
      return {
        mirror_kind: output.mirror_kind,
        summary: output.summary,
        daily_overview: output.daily_overview,
        concern_projections: output.concern_projections.map((projection) => ({
          concern_tag_ref: projection.concern_tag_ref,
          summary: projection.summary,
          recommendations: projection.recommendations,
        })),
      };
    case 'yuejing': {
      const focusDate = output.range.start_date;
      return {
        mirror_kind: output.mirror_kind,
        summary: output.summary,
        focus_date: focusDate,
        range: output.range,
        cells: output.cells
          .filter((cell) => cell.date === focusDate)
          .map((cell) => {
            const tag = tags.get(cell.concern_tag_ref);
            return {
              date: cell.date,
              concern_tag_ref: cell.concern_tag_ref,
              concern_label: tag?.label ?? cell.concern_tag_ref,
              parsed_topics: tag?.parsed_topics ?? [],
              tendency_class: cell.tendency_class,
              summary: cell.summary,
            };
          }),
      };
    }
    case 'nianjing':
      return {
        mirror_kind: output.mirror_kind,
        summary: output.summary,
        horizon: output.horizon,
        phase_bands: output.phase_bands.slice(0, 8).map((band) => ({
          concern_tag_ref: band.concern_tag_ref,
          start_date: band.start_date,
          end_date: band.end_date,
          summary: band.summary,
        })),
        inflection_points: output.inflection_points.slice(0, 8).map((point) => ({
          concern_tag_ref: point.concern_tag_ref,
          date: point.date,
          summary: point.summary,
        })),
      };
    case 'shijing':
      return {
        mirror_kind: output.mirror_kind,
        summary: output.summary,
        answer: output.answer,
      };
  }
}

export function buildRuntimeAiPromptRequest(args: {
  readonly mirror_kind: MirrorKind;
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly mirror_context: MirrorContextSnapshot;
  readonly deterministic_output: MirrorOutput;
  readonly response_preferences: ResponsePreferences;
  readonly question?: string;
  readonly source_readings?: readonly Reading[];
}): RuntimeAiPromptRequest {
  const userPromptLines = [
    `mirror_kind: ${args.mirror_kind}`,
    `schema_name: shijing.runtime_ai_wording_patch.${args.mirror_kind}.v1`,
    'required_patch_kind: shijing.runtime_ai_wording_patch.v1',
    `required_top_level_mirror_kind: ${args.mirror_kind}`,
    `patch_schema:\n${schemaShapeForKind(args.mirror_kind)}`,
    `tone: ${args.response_preferences.tone}; length: ${args.response_preferences.length}; language: ${args.response_preferences.language}`,
    `active_concern_tags:\n${summarizeConcernTags(args.mirror_context.active_concern_tags)}`,
    `canonical_window: ${args.feature_snapshot.canonical_window.start_utc} → ${args.feature_snapshot.canonical_window.end_utc} (${args.feature_snapshot.canonical_window.basis_time_zone})`,
    `cited_event_memory_refs: ${JSON.stringify(args.mirror_context.cited_event_memory_refs)}`,
    `cited_plan_item_refs: ${JSON.stringify(args.mirror_context.cited_plan_item_refs)}`,
    `wording_patch_target_json:\n${JSON.stringify(wordingTargetFor(
      args.deterministic_output,
      args.mirror_context.active_concern_tags,
    ), null, 2)}`,
  ];
  const interpretiveEvidence = interpretiveEvidenceProjection(args.feature_snapshot);
  if (interpretiveEvidence) {
    userPromptLines.push(interpretiveEvidence);
  }
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
    schema_name: `shijing.runtime_ai_wording_patch.${args.mirror_kind}.v1`,
    deterministic_output: args.deterministic_output,
  };
}
