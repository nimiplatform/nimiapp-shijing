// SJG-ALGO-13 — Runtime AI prompt builder.

import type { AstrologyFeatureSnapshot } from '../../domain/algorithm.ts';
import type { ConcernTagSnapshot } from '../../domain/concern-tag.ts';
import type { EventMemory } from '../../domain/event-memory.ts';
import type { MirrorContextSnapshot, Reading } from '../../domain/reading.ts';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import type {
  MingJingMirrorOutput,
  MingJingRelationshipMirrorOutput,
  MirrorOutput,
} from '../../domain/mirror-output.ts';
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
  'Role: a warm AI life guide grounded in Eastern traditional astrology language and modern positive psychology.',
  'Deterministic astrology features are the source of truth.',
  'NEVER calculate pillars, DaYun, or solar terms.',
  'NEVER invent uncited memory or plan influence.',
  'For RiJing, follow 绝对正向: transform watch/blocked/turning signals into concrete action advice or growth opportunities.',
  'Reject fatalism. The user-facing stance is 命由天定，运由己造: time gives tendencies, the user chooses action.',
  '不要使用绝对化预言；不要说“必然”“一定”“注定”。',
  'interpretive_evidence (用神/旺衰/十神/四化) is read-only 命理 grounding: use it to make wording specific and causal, but never recompute it or echo it as output fields.',
  'Output MUST be a single JSON wording patch object, not a full MirrorOutput.',
  'Do not output Markdown headings; map rich reading structure into the admitted JSON patch fields only.',
  'For RiJing wording, write like a natural friend and guide. Do not use mechanical parallelism or repeated sentence frames.',
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

function conciseHumanSummary(text: string, max = 180): string {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max)}...`;
}

function summarizeEventMemories(memories: readonly EventMemory[] | undefined): string {
  if (!memories || memories.length === 0) return '(none)';
  return memories
    .map((memory) => [
      `- id=${memory.id}`,
      `occurred_at=${memory.occurred_at}`,
      `concise_human_summary=${conciseHumanSummary(memory.body)}`,
    ].join('; '))
    .join('\n');
}

function isMingjingRelationshipOutput(
  output: MirrorOutput,
): output is MingJingRelationshipMirrorOutput {
  return output.mirror_kind === 'mingjing' &&
    (output as { output_kind?: unknown }).output_kind === 'relationship_hepan';
}

function schemaShapeForKind(kind: MirrorKind, output?: MirrorOutput): string {
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
    case 'mingjing':
      if (output && isMingjingRelationshipOutput(output)) {
        return [
          'output_kind: relationship_hepan',
          'patch_fields: patch_kind, mirror_kind, output_kind, summary?, structure?, timing_windows?, practice?',
          'AI may patch relationship prose fields only.',
          'structure object fields: baseline_pattern, attraction_and_support, friction_and_misread, communication_rhythm, boundary_advice',
          'timing_windows items: start_date, end_date, summary? only. start_date + end_date MUST exactly match one provided timing window.',
          'practice object fields: communication, boundary, repair',
          'Do NOT output relationship_subject, citations, cited_event_memory_refs, cited_plan_item_refs, nature, driver_refs, deterministic ids/refs, compatibility scores, trends, or graphs.',
        ].join('\n');
      }
      return [
        'patch_fields: patch_kind, mirror_kind, summary?, core?, life_stage_strategies?',
        'core object fields: personality, strengths, long_term_themes, relationship_pattern, career_inclination — fill ALL five for a complete reading.',
        'life_stage_strategies items: phase_label (MUST equal a provided phase_label exactly), theme?, strategy?',
        'Do NOT output event_validations — they are deterministic and fixed.',
      ].join('\n');
  }
}

function tagSnapshotById(tags: readonly ConcernTagSnapshot[]): Map<string, ConcernTagSnapshot> {
  return new Map(tags.map((tag) => [tag.id, tag]));
}

const ELEMENT_CN: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };

const RIJING_NO_REFERENCE_EVENT_PROMPT =
  '用户今日未提供具体事件，请着重从整体能量和生活哲理上给予启发。';

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
    case 'mingjing': {
      if (isMingjingRelationshipOutput(output)) {
        return {
          mirror_kind: output.mirror_kind,
          output_kind: output.output_kind,
          relationship_subject: output.relationship_subject,
          summary: output.summary,
          structure: output.structure,
          timing_windows: output.timing_windows.map((window) => ({
            start_date: window.start_date,
            end_date: window.end_date,
            nature: window.nature,
            driver_refs: window.driver_refs,
            summary: window.summary,
          })),
          practice: output.practice,
          // Read-only deterministic refs and citations: useful grounding context,
          // but explicitly forbidden as returned patch fields.
          cited_event_memory_refs: output.cited_event_memory_refs,
          cited_plan_item_refs: output.cited_plan_item_refs,
          citations: output.citations,
        };
      }
      const natalOutput = output as MingJingMirrorOutput;
      return {
        mirror_kind: natalOutput.mirror_kind,
        summary: natalOutput.summary,
        core: natalOutput.core,
        life_stage_strategies: natalOutput.life_stage_strategies.map((s) => ({
          phase_label: s.phase_label,
          age_range: s.age_range,
          theme: s.theme,
          strategy: s.strategy,
        })),
        // Read-only deterministic resonance: ground the narrative in the user's
        // real history; do NOT echo this back as output.
        event_validations: natalOutput.event_validations.map((v) => ({
          occurred_year: v.occurred_year,
          period_nature: v.period_nature,
          note: v.note,
        })),
      };
    }
  }
}

export function buildRuntimeAiPromptRequest(args: {
  readonly mirror_kind: MirrorKind;
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly mirror_context: MirrorContextSnapshot;
  readonly deterministic_output: MirrorOutput;
  readonly response_preferences: ResponsePreferences;
  readonly cited_event_memories?: readonly EventMemory[];
  readonly question?: string;
  readonly source_readings?: readonly Reading[];
}): RuntimeAiPromptRequest {
  const userPromptLines = [
    `mirror_kind: ${args.mirror_kind}`,
    `schema_name: shijing.runtime_ai_wording_patch.${args.mirror_kind}.v1`,
    'required_patch_kind: shijing.runtime_ai_wording_patch.v1',
    `required_top_level_mirror_kind: ${args.mirror_kind}`,
    `patch_schema:\n${schemaShapeForKind(args.mirror_kind, args.deterministic_output)}`,
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
  if (args.mirror_kind === 'rijing') {
    userPromptLines.push([
      'RiJing rich-banner wording requirements:',
      'Role: 你是一位精通东方传统命理且兼具现代积极心理学咨询师视角的“AI人生向导”，语气温和、富有洞察力、像朋友一样自然。',
      '绝对禁止使用类似“事业领域今日处于xx时段”、“身体状态今日受xx影响”、“#事业 今日 steady”这样的机械开头或英文倾向词。',
      '不要在正文中重复输出“专属视角解读：”“今日基调：”等前缀；JSON 字段承载结构，字段内容直接进入正文。',
      'daily_overview should read like 今日基调: 150-200 Chinese characters, prose-like, warm, specific, reassuring, with metaphor and imagery.',
      'concern projection summary should read like 专属视角解读: 每个视角至少80字, concrete, actionable, and independently written with varied sentence patterns.',
      '充实现代生活场景: 事业可写会议发言、邮件沟通、合作确认；身体可写呼吸、午餐、散步、睡眠；家人可写一顿晚餐、一个电话、一次耐心倾听。',
      'recommendations should be 1-2 short actions per concern; avoid vague comfort-only prose.',
      'If 今日参照事件 exists, weave it into daily_overview and at least one relevant projection/recommendation while reducing anxiety.',
      `If no 今日参照事件 exists, treat the event section intent as: ${RIJING_NO_REFERENCE_EVENT_PROMPT}`,
      'For missing reference events, 今日事件解析 should focus on overall energy, life philosophy, and practical encouragement; do not invent uncited events.',
      'Always translate difficult tendencies into positive next steps, never fixed fate.',
    ].join('\n'));
  }
  if (args.mirror_kind === 'yuejing') {
    userPromptLines.push([
      'YueJing 30 日节奏建议 writing requirements:',
      'You are wording only the focus_date cells in this request; the renderer aggregates many daily Readings into the 30-day drawer.',
      'Write the focus_date summary as a usable 30 日节奏建议 fragment, not as a命理标签复述.',
      '每条建议必须绑定具体日期或时间段；if the output field is a cell summary, bind it to that cell date.',
      '每条建议必须说明适合做什么、不适合做什么；avoid vague phrases such as 保持平衡 or 顺势而为.',
      '用户已有事件记忆和未来计划 may be used only when present in cited_event_memory_refs / cited_plan_item_refs or the supplied summaries; never invent missing context.',
      '不要输出底层技术字段, driver refs, schema names, tendency_class literals, JSON keys, or method ids in user-facing prose.',
      'Do not use absolute prediction language; keep the tone warm, restrained, and credible.',
    ].join('\n'));
  }
  if (args.mirror_kind === 'mingjing' && isMingjingRelationshipOutput(args.deterministic_output)) {
    userPromptLines.push([
      'MingJing Relationship HePan writing requirements:',
      'Role: word the admitted relationship prose over deterministic self-plus-person HePan evidence.',
      'AI may word relationship prose fields only: summary; structure.baseline_pattern, attraction_and_support, friction_and_misread, communication_rhythm, boundary_advice; timing_windows[].summary targeted by exact start_date + end_date; practice.communication, practice.boundary, practice.repair.',
      'Return output_kind: relationship_hepan in the patch so the SDK applies the relationship patch path.',
      'Treat relationship_subject, timing_windows[].nature, timing_windows[].driver_refs, citations, cited_event_memory_refs, and cited_plan_item_refs as read-only grounding context.',
      'Do NOT output relationship_subject, citations, cited_event_memory_refs, cited_plan_item_refs, nature, driver_refs, deterministic ids/refs, compatibility scores, trends, or graphs.',
      'Do not compute compatibility, fate certainty, match percentages, relation graphs, or contact-management advice.',
      'Write relationship guidance as concrete communication, boundary, and repair language, never as fixed destiny.',
    ].join('\n'));
  } else if (args.mirror_kind === 'mingjing') {
    userPromptLines.push([
      '命镜 本命盘解读 writing requirements:',
      'Role: 你是一位精通子平八字、又有现代积极心理学视角的人生顾问，语气温和、有洞察、像一位懂命理的朋友。',
      'core 五个字段必须全部填写，且各自独立、具体：',
      '  personality(性格底色): 从日主旺衰 + 用神 + 月令格局推出底层性情，80–120字。',
      '  strengths(优势能力): 结合十神与格局点出可被发挥的天赋能力。',
      '  long_term_themes(长期课题): 指出一生需要持续修炼/平衡的方向（基于忌神与失衡五行），以成长视角表达，不宿命。',
      '  relationship_pattern(关系模式): 从配偶星/日支与合冲谈亲密关系倾向。',
      '  career_inclination(事业倾向): 从用神方向与十神谈适配的事业气质，不要给出具体职位清单。',
      'life_stage_strategies: 为每个给定 phase_label 写 theme(该阶段主题, 一句) 与 strategy(阶段策略, 2–4句, 可执行、面向人生阶段而非每日小事)。phase_label 必须与给定值完全一致。',
      '若 event_validations 非空: 自然地把用户记录的真实经历织入 core 与相关阶段策略，提升共鸣与信任；只可参照，不可断言“命中注定”，也不要逐条复述事件。',
      'summary: 一句温暖、凝练的命局总览。',
      '禁止重新计算干支/大运/格局；只把 interpretive_evidence 与 wording_patch_target_json 当作只读命理依据。',
      '不要输出 event_validations、driver refs、schema 名、tendency 英文枚举或 JSON 键到正文。',
    ].join('\n'));
  }
  if (args.cited_event_memories && args.cited_event_memories.length > 0) {
    userPromptLines.push([
      '今日参照事件:',
      'Use only these cited_event_memory_summaries as event context; do not invent uncited events.',
      `cited_event_memory_summaries:\n${summarizeEventMemories(args.cited_event_memories)}`,
    ].join('\n'));
  } else if (args.mirror_kind === 'rijing') {
    userPromptLines.push([
      '今日事件解析:',
      RIJING_NO_REFERENCE_EVENT_PROMPT,
      'Use this as missing-event guidance only; 不要 invent uncited events.',
    ].join('\n'));
  }
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
