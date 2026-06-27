// Dev-only preview fixture for the redesigned HeJing (合镜) surface.
//
// The rich relationship page only renders once a `relationship_hepan` reading
// exists, so the visual harness seeds one parent-child reading ("我 + Snow")
// plus the matching Person. Only the fields the page actually reads are filled
// in; the rest of the InputsSummary envelope is stubbed behind a single bounded
// cast because the harness never validates or persists it.

import type { MethodProfileId } from '../../domain/algorithm.ts';
import type { MingJingRelationshipMirrorOutput } from '../../domain/mirror-output.ts';
import type { Person } from '../../domain/person.ts';
import type { InputsSummary, Reading } from '../../domain/reading.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { buildEmptyShiJingSpace } from './initial-space.ts';

const METHOD_PROFILE_ID: MethodProfileId = 'bazi_ziping_v1';
const SNOW_ID = 'p_snow_dev';
const RELATED_REF = { kind: 'person', id: SNOW_ID } as const;

const SNOW_PERSON: Person = {
  id: SNOW_ID,
  display_name: 'Snow',
  kind: 'person',
  relation: '孩子',
  consent_state: 'owner_recorded',
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
  summary: '这一年，关系的关键词是陪伴与边界，在理解与支持中一起成长。',
  structure: {
    baseline_pattern:
      '孩子在建立独立与自信的过程中，需要被看见和尊重；同时也需要清晰、稳定的边界与规则，帮助他安心成长。',
    attraction_and_support: '当你给予稳定的陪伴和具体的肯定时，孩子最能感受到支持。',
    friction_and_misread: '权威感与自主需求容易拉扯。情绪上来时，沟通容易偏离主题。',
    communication_rhythm: '先共情、后引导。多用开放式提问，给选择而不是直接下命令。',
    boundary_advice: '规则清晰、后果一致。尊重他的空间，也守住彼此的底线。',
  },
  // A reading may evidence anywhere from one to four windows. The Q1–Q4
  // timeline places each evidenced window into its quarter and fills any
  // un-evidenced quarter with general year-arc guidance (see buildGeneratedQuarters).
  timing_windows: [
    {
      start_date: '2026-02-01',
      end_date: '2026-03-31',
      nature: 'supportive',
      driver_refs: ['bazi:relationship.window.q1'],
      summary: '建立稳定的日常节奏，安排固定的亲子时间。',
    },
    {
      start_date: '2026-04-15',
      end_date: '2026-06-30',
      nature: 'steady',
      driver_refs: ['bazi:relationship.window.q2'],
      summary: '设定可达成的小目标，每周一起复盘进展。',
    },
    {
      start_date: '2026-07-15',
      end_date: '2026-09-15',
      nature: 'watch',
      driver_refs: ['bazi:relationship.window.q3'],
      summary: '自我意识增强的阶段，多给选择、少一些说教。',
    },
    {
      start_date: '2026-10-01',
      end_date: '2026-12-20',
      nature: 'supportive',
      driver_refs: ['bazi:relationship.window.q4'],
      summary: '复盘这一年的成长，以正向的方式收尾。',
    },
  ],
  practice: {
    communication: '抽出 15 分钟专注倾听他的想法与情绪。再表达你的期待，并给予具体的肯定。',
    boundary: '和他一起制定一条可执行的规则，并温和而坚定地一起坚持。',
    repair: '冲突后及时修复：先承认情绪，再回到具体事件，不给关系贴标签。',
  },
  cited_event_memory_refs: [],
  cited_plan_item_refs: [],
  citations: [{ method: METHOD_PROFILE_ID, reference: 'mingjing.relationship_hepan.v1' }],
};

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
          { self_position: 'day', related_position: 'month', kind: '六合', driver_ref: 'bazi:branch.day-month.六合' },
          { self_position: 'year', related_position: 'day', kind: '三合', driver_ref: 'bazi:branch.year-day.三合' },
          { self_position: 'month', related_position: 'hour', kind: '六合', driver_ref: 'bazi:branch.month-hour.六合' },
        ],
        day_master_relation: { label: 'supporting', driver_ref: 'bazi:day_master.support' },
        ten_god_relation: { label: 'same', driver_ref: 'bazi:ten_god.same' },
        yong_shen_relation: { label: 'supporting', driver_ref: 'bazi:yong_shen.support' },
        timing_windows: RELATIONSHIP_OUTPUT.timing_windows.map((window) => ({
          start_date: window.start_date,
          end_date: window.end_date,
          nature: window.nature,
          driver_refs: window.driver_refs,
        })),
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

export function buildHeJingPreviewSpace(userId: string): ShiJingSpace {
  const base = buildEmptyShiJingSpace(userId);
  return {
    ...base,
    persons: [SNOW_PERSON],
    readings: [SNOW_READING],
    settings: { ...base.settings, method_profile_id: METHOD_PROFILE_ID },
  };
}
