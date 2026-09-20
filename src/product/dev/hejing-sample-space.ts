// Dev-only preview fixture for the redesigned HeJing (合镜) surface.
//
// The rich relationship page only renders once a `relationship_hepan` reading
// exists, so the visual harness seeds one parent-child reading ("我 + Snow")
// plus the matching Person, real track records (EventMemory + PlanItem linked
// through person_refs), and a Ziwei-method variant for the typed
// pattern-unsupported gate. Only the fields the page actually reads are filled
// in; the rest of the InputsSummary envelope is stubbed behind a single bounded
// cast because the harness never validates or persists it. This file is the
// ONLY place HeJing sample data may live.

import type { MethodProfileId } from '../../domain/algorithm.ts';
import type { EventMemory } from '../../domain/event-memory.ts';
import type { MingJingRelationshipMirrorOutput } from '../../domain/mirror-output.ts';
import type { Person } from '../../domain/person.ts';
import type { PlanItem } from '../../domain/plan-item.ts';
import type { InputsSummary, Reading } from '../../domain/reading.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { buildEmptyShiJingSpace } from './initial-space.ts';

const METHOD_PROFILE_ID: MethodProfileId = 'bazi_ziping_v1';
const ZIWEI_METHOD_PROFILE_ID: MethodProfileId = 'ziwei_sanhe_v1';
const SNOW_ID = 'p_snow_dev';
const RELATED_REF = { kind: 'person', id: SNOW_ID } as const;

const SNOW_PERSON: Person = {
  id: SNOW_ID,
  display_name: 'Snow',
  kind: 'person',
  relation: '孩子',
  natal_inputs: {
    raw_birth_input: { calendar_system: 'gregorian', local_date_text: '2014-09-20', local_time_text: '07:40' },
    birth_datetime_utc: '2014-09-19T23:40:00Z',
    birth_precision: 'exact',
    calendar_system: 'gregorian',
    calculation_sex: 'unspecified',
    birth_location: { latitude: 31.2304, longitude: 121.4737, iana_time_zone: 'Asia/Shanghai', place_name: 'Shanghai' },
  },
};

const RELATIONSHIP_OUTPUT: MingJingRelationshipMirrorOutput = {
  mirror_kind: 'mingjing',
  output_kind: 'relationship_hepan',
  relationship_subject: {
    primary_subject_ref: 'self',
    related_person_ref: RELATED_REF,
    anchor_year: 2026,
    basis_time_zone: 'Asia/Shanghai',
  },
  overview: {
    title: '默契、推动与节奏拉扯:三个值得观察的相处模式',
    summary:
      '这份解读从两张命盘里选出了三个最值得观察的相处模式:近距离相处里的天然默契,一方推动、一方接住的互动惯性,以及作息节奏上反复出现的拉扯。它们只是观察假设,是否符合你们的真实经历,需要以你的记录核对。',
    keywords: ['相处默契', '推动与接住', '节奏拉扯'],
  },
  patterns: [
    {
      pattern_id: 'bazi_ziping_v1.hepan.day_branch_harmony',
      rule_ref: 'bazi_ziping_v1.hepan.day_branch_harmony',
      rank: 1,
      driver_refs: ['bazi:relationship.branch.day-day.六合@chen-you'],
      evidence_summary: 'day branch 辰 × 酉: 六合',
      name: '日常相处里的天然默契',
      self_tendency: '在近距离的日常相处中,你可能很快进入默契状态,并默认对方也以同样的方式感受这份轻松。',
      related_tendency: '孩子在日常节奏上可能配合得很顺,并且更习惯不点破这份默契。',
      scenario: '可以观察具体的一对一日常时刻:一起吃饭、出门前的准备、临时的小决定。',
      aligned_expression: '配合顺利时,日常安排几乎不用商量就能对上,双方也说得出是什么让配合变容易。',
      friction_expression: '发生分歧时,问题往往先落在日常习惯层面——小事的音量盖过了真正的话题。',
      signals: ['日常安排很少需要讨论就能对上', '小习惯差异会显得格外刺耳', '默契被默认存在而没有确认'],
    },
    {
      pattern_id: 'bazi_ziping_v1.hepan.day_master_support',
      rule_ref: 'bazi_ziping_v1.hepan.day_master_support',
      rank: 2,
      driver_refs: ['bazi:relationship.day_master.wood->fire'],
      evidence_summary: 'day master relation related→self: supporting (bazi:relationship.day_master.wood->fire)',
      name: '一方推动、一方接住的惯性',
      self_tendency: '你可能习惯在孩子犹豫时推一把,并把这当作理所当然的支持方式。',
      related_tendency: '孩子可能习惯接住这份推动,也可能在被推得太快时安静下来。',
      scenario: '可以观察需要做决定的时刻:谁自然地站出来推进,谁接住这份推动。',
      aligned_expression: '配合顺利时,推动恰好帮助孩子行动,而孩子也说得出哪种支持方式真正有用。',
      friction_expression: '发生分歧时,推动可能被体验为压力或干涉,接住的一方则可能沉默或拖延。',
      signals: ['帮助常常在开口之前就到了', '一方经常替另一方拿主意', '被推的一方在压力下变安静'],
    },
    {
      pattern_id: 'bazi_ziping_v1.hepan.month_branch_friction',
      rule_ref: 'bazi_ziping_v1.hepan.month_branch_friction',
      rank: 3,
      driver_refs: ['bazi:relationship.branch.month-month.相冲@yin-shen'],
      evidence_summary: 'month branch 寅 × 申: 相冲',
      name: '节奏与习惯层面的反复拉扯',
      self_tendency: '在作息、安排这类日常节奏上,你可能觉得被顶着走,容易把孩子的方式解读成故意唱反调。',
      related_tendency: '孩子可能同样觉得被管得太紧,用更用力的顶撞或沉默来回应。',
      scenario: '可以观察同一个误会在作息安排上反复出现的时刻:睡觉时间、出门前的准备、屏幕使用。',
      aligned_expression: '配合顺利时,同样的张力会变成互补:一方注意到另一方忽略的节奏细节。',
      friction_expression: '发生分歧时,节奏类话题容易升温更快;先放慢、说清具体分歧点,比争对错更有用。',
      signals: ['同一个作息误会一再重复', '反应的强度超过话题本身', '双方对同一件小事的讲法不一样'],
    },
  ],
  recent_status: {
    availability: 'available',
    window: {
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      nature: 'steady',
      driver_refs: [
        'bazi:relationship.period.self.annual_transition@2026-02-04T00:00:00Z',
        'bazi:relationship.period.person:p_snow_dev.annual_transition@2026-02-04T00:00:00Z',
      ],
      summary: '2026 年的证据偏向平稳:保持规律的沟通节奏,不默认对方已经听懂,重要约定落到具体确认。',
    },
  },
  action: {
    target: { kind: 'recent_window' },
    situation: '在这个有依据的 2026 年窗口里,当你们要做一件共同决定或约定时使用。',
    step: '在答应之前,用一条消息写清楚:决定是什么、各自负责哪部分、什么时候再对一次。',
    example_phrase: '"在我们定下来之前,先各自说说自己负责哪部分,约个时间再对一次?"',
    rationale: '窗口证据只说明这一年的倾向;无论倾向如何,一个具体的确认习惯都有用,也不需要对方先改变。',
    observation: '观察对方是正面回答了具体问题,还是绕开了;这个回应本身就是下一步的真实信号。',
  },
  cited_event_memory_refs: [],
  cited_plan_item_refs: [],
  citations: [{ method: METHOD_PROFILE_ID, reference: 'mingjing.relationship_hepan.v1' }],
};

// Deterministic evidence windows carried into the preview InputsSummary. The
// dev harness never validates, but the shape mirrors real evidence exactly.
const RELATIONSHIP_EVIDENCE_TIMING_WINDOWS = [
  {
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    nature: 'steady',
    driver_refs: [
      'bazi:relationship.period.self.annual_transition@2026-02-04T00:00:00Z',
      'bazi:relationship.period.person:p_snow_dev.annual_transition@2026-02-04T00:00:00Z',
    ],
  },
];

// Only `method_profile.id` and `feature_snapshot.common.relationship_hepan`
// are read during render; the remaining envelope is stubbed for the harness.
const INPUTS_SUMMARY = {
  captured_at: '2026-06-27T00:00:00Z',
  contract_version: 'SJG-ASTRO-v1',
  algorithm_contract_version: 'SJG-ALGO-v1',
  method_profile: {
    id: METHOD_PROFILE_ID,
    contract_version: 'SJG-ALGO-v1',
    feature_schema_version: 'SJG-FEATURE-v2',
    ephemeris_version: 'tyme4ts-1.5.0',
  },
  input_hash: 'sha256:dev-hejing',
  feature_snapshot_hash: 'sha256:dev-hejing',
  feature_snapshot: {
    method_profile: {
      id: METHOD_PROFILE_ID,
      contract_version: 'SJG-ALGO-v1',
      feature_schema_version: 'SJG-FEATURE-v2',
      ephemeris_version: 'tyme4ts-1.5.0',
    },
    mirror_kind: 'mingjing',
    common: {
      stage_drivers: [],
      key_windows: [],
      yuejing_tendency_drivers: [],
      nianjing_phase_drivers: [],
      nianjing_inflection_drivers: [],
      uncertainty_inputs: [],
      relationship_hepan: {
        related_person_ref: RELATED_REF,
        display_name_snapshot: 'Snow',
        branch_interactions: [
          { self_position: 'day', related_position: 'day', kind: '六合', driver_ref: 'bazi:relationship.branch.day-day.六合@chen-you' },
          { self_position: 'month', related_position: 'month', kind: '相冲', driver_ref: 'bazi:relationship.branch.month-month.相冲@yin-shen' },
          { self_position: 'year', related_position: 'day', kind: '三合', driver_ref: 'bazi:branch.year-day.三合' },
        ],
        day_master_relation: { label: 'supporting', driver_ref: 'bazi:day_master.support' },
        ten_god_relation: { label: 'same', driver_ref: 'bazi:ten_god.same' },
        yong_shen_relation: { label: 'supporting', driver_ref: 'bazi:yong_shen.support' },
        timing_windows: RELATIONSHIP_EVIDENCE_TIMING_WINDOWS,
      },
    },
  },
} as unknown as InputsSummary;

const SNOW_READING: Reading = {
  id: 'r_hejing_dev',
  created_at: '2026-06-27T00:00:00Z',
  mirror_kind: 'mingjing',
  mirror_scope: {
    kind: 'relationship_natal',
    related_person_ref: RELATED_REF,
    anchor_year: 2026,
    basis_time_zone: 'Asia/Shanghai',
  },
  primary_subject_ref: 'self',
  related_person_refs: [RELATED_REF],
  concern_tag_refs: [],
  cited_reading_ids: [],
  cited_event_memory_refs: [],
  cited_plan_item_refs: [],
  inputs_summary: INPUTS_SUMMARY,
  output: RELATIONSHIP_OUTPUT,
  uncertainty: { confidence: 'medium', caveats: [], data_gaps: [] },
};

// Real track records for the secondary 轨迹 view: the user's own EventMemory
// and PlanItem entries linked to Snow through an explicit SubjectRef. They
// render in 轨迹 but never imply the other person participated or confirmed.
const SNOW_EVENT_MEMORIES: readonly EventMemory[] = [
  {
    id: 'em_hejing_dev_game_time',
    occurred_at: '2026-04-18T00:00:00Z',
    body: '因为游戏时间超出约定起了争执。事后一起复盘,重新约定了规则:先说完理由,再定时间。',
    person_refs: [RELATED_REF],
    concern_tag_refs: [],
    source: 'manual',
    admissible_use: 'eligible_for_retrieval',
    created_at: '2026-04-18T12:30:00Z',
    updated_at: '2026-04-18T12:30:00Z',
  },
  {
    id: 'em_hejing_dev_science_project',
    occurred_at: '2026-06-02T00:00:00Z',
    body: '一起完成科学小项目(火山喷发模型)。他负责倒材料,我负责读步骤,分工很顺,没有催促也做完了。',
    person_refs: [RELATED_REF],
    concern_tag_refs: [],
    source: 'manual',
    admissible_use: 'eligible_for_retrieval',
    created_at: '2026-06-02T21:10:00Z',
    updated_at: '2026-06-02T21:10:00Z',
  },
];

const SNOW_PLAN_ITEMS: readonly PlanItem[] = [
  {
    id: 'pi_hejing_dev_birthday_week',
    planned_for: '2026-09-14T00:00:00Z',
    body: '生日前一周,每天留 15 分钟听他说学校里的事,不给建议,只确认听到的内容。',
    person_refs: [RELATED_REF],
    concern_tag_refs: [],
    source: 'manual',
    created_at: '2026-09-01T09:00:00Z',
    updated_at: '2026-09-01T09:00:00Z',
  },
];

export function buildHeJingPreviewSpace(userId: string): ShiJingSpace {
  const base = buildEmptyShiJingSpace(userId);
  return {
    ...base,
    persons: [SNOW_PERSON],
    event_memories: [...SNOW_EVENT_MEMORIES],
    plan_items: [...SNOW_PLAN_ITEMS],
    readings: [SNOW_READING],
    settings: { ...base.settings, method_profile_id: METHOD_PROFILE_ID },
  };
}

// `dev-hejing.html?pending` seeds the person without any relationship reading,
// so the ready-to-generate pending state can be reviewed end to end.
export function buildHeJingPendingPreviewSpace(userId: string): ShiJingSpace {
  const base = buildEmptyShiJingSpace(userId);
  return {
    ...base,
    persons: [SNOW_PERSON],
    settings: { ...base.settings, method_profile_id: METHOD_PROFILE_ID },
  };
}

// `dev-hejing.html?patterns-unavailable` seeds the same person under the Ziwei
// method: the evidence route stays open, but no admitted HeJing pattern rules
// exist for it, so the typed gate replaces the generate CTA.
export function buildHeJingPatternUnavailablePreviewSpace(userId: string): ShiJingSpace {
  const base = buildEmptyShiJingSpace(userId);
  return {
    ...base,
    persons: [SNOW_PERSON],
    settings: { ...base.settings, method_profile_id: ZIWEI_METHOD_PROFILE_ID },
  };
}
