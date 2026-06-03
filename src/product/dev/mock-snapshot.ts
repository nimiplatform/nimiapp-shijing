// W05 — dev mock ShiJingSpace for `pnpm dev:renderer`.

import {
  ASTROLOGY_METHOD_PROFILE_ID,
  SJG_ALGO_CONTRACT_VERSION,
  SJG_ALGO_FEATURE_SCHEMA_VERSION,
  type AstrologyFeatureSnapshot,
  type AstrologyMethodProfile,
  type NianJingPhaseDriver,
  type NianJingInflectionDriver,
} from '../../domain/algorithm.ts';
import type { NatalInputs, RawBirthInput } from '../../domain/person.ts';
import type {
  NianJingMirrorOutput,
  NianJingPhaseBand,
  NianJingInflectionPoint,
} from '../../domain/mirror-output.ts';
import type { Reading } from '../../domain/reading.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';

function devNatalInputs(): NatalInputs {
  const raw: RawBirthInput = {
    calendar_system: 'gregorian',
    local_date_text: '1990-04-12',
    local_time_text: '08:30',
    place_text: 'Shanghai',
  };
  return {
    raw_birth_input: raw,
    birth_datetime_utc: '1990-04-12T00:30:00Z',
    birth_precision: 'exact',
    calendar_system: 'gregorian',
    birth_location: {
      latitude: 31.2304,
      longitude: 121.4737,
      iana_time_zone: 'Asia/Shanghai',
      place_name: 'Shanghai',
    },
    // DaYun (always required for NianJing per SJG-ALGO-07) needs a known
    // calculation_sex. The dev preview ships a default so 「生成长程相位」
    // and any other DaYun-dependent pipeline succeed out-of-the-box.
    calculation_sex: 'female',
  };
}

function devMethodProfile(): AstrologyMethodProfile {
  return {
    id: ASTROLOGY_METHOD_PROFILE_ID,
    contract_version: SJG_ALGO_CONTRACT_VERSION,
    feature_schema_version: SJG_ALGO_FEATURE_SCHEMA_VERSION,
  };
}

// ===== Mock NianJing reading =========================================
// Builds a 10-year long-horizon Reading whose phase-bands and
// inflection-points reproduce the visual rhythm of the design mockup
// (姻缘 / 事业 across 2026–2036). The shape passes
// `validateShiJingSpace` so the dev preview renders the rich tab
// instead of the empty state.

const MOCK_HORIZON_START = '2026-01-01';
const MOCK_HORIZON_END = '2036-12-31';

const MOCK_NIANJING_PHASES: readonly NianJingPhaseBand[] = [
  // 姻缘 — five bands across the 10-year horizon, watch period contains today.
  {
    concern_tag_ref: 'built_in_love',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    nature: 'watch',
    driver_refs: ['mock_love_watch_phase'],
    summary: '观察期 · 外缘观望',
  },
  {
    concern_tag_ref: 'built_in_love',
    start_date: '2027-01-01',
    end_date: '2027-12-31',
    nature: 'supportive',
    driver_refs: ['mock_love_supportive_phase'],
    summary: '外缘转旺',
  },
  {
    concern_tag_ref: 'built_in_love',
    start_date: '2028-01-01',
    end_date: '2029-06-30',
    nature: 'steady',
    driver_refs: ['mock_love_steady_phase'],
    summary: '稳定期',
  },
  {
    concern_tag_ref: 'built_in_love',
    start_date: '2029-07-01',
    end_date: '2030-12-31',
    nature: 'turning',
    driver_refs: ['mock_love_turning_phase'],
    summary: '格局换轨',
  },
  {
    concern_tag_ref: 'built_in_love',
    start_date: '2031-01-01',
    end_date: '2036-12-31',
    nature: 'supportive',
    driver_refs: ['mock_love_supportive_phase_2'],
    summary: '重新升温',
  },
  // 事业 — five bands. Building phase covers today.
  {
    concern_tag_ref: 'built_in_career',
    start_date: '2026-01-01',
    end_date: '2027-06-30',
    nature: 'supportive',
    driver_refs: ['mock_career_supportive_phase'],
    summary: '建设期',
  },
  {
    concern_tag_ref: 'built_in_career',
    start_date: '2027-07-01',
    end_date: '2028-06-30',
    nature: 'watch',
    driver_refs: ['mock_career_watch_phase'],
    summary: '换挡观察',
  },
  {
    concern_tag_ref: 'built_in_career',
    start_date: '2028-07-01',
    end_date: '2030-06-30',
    nature: 'blocked',
    driver_refs: ['mock_career_blocked_phase'],
    summary: '收缩期',
  },
  {
    concern_tag_ref: 'built_in_career',
    start_date: '2030-07-01',
    end_date: '2031-06-30',
    nature: 'turning',
    driver_refs: ['mock_career_turning_phase'],
    summary: '赛道切换',
  },
  {
    concern_tag_ref: 'built_in_career',
    start_date: '2031-07-01',
    end_date: '2036-12-31',
    nature: 'supportive',
    driver_refs: ['mock_career_supportive_phase_2'],
    summary: '兑现期',
  },
];

const MOCK_NIANJING_INFLECTIONS: readonly NianJingInflectionPoint[] = [
  {
    concern_tag_ref: 'built_in_love',
    date: '2027-01-01',
    kind: 'annual_transition',
    driver_refs: ['mock_love_annual_2027'],
    summary: '流年切换 · 进入外缘转旺',
  },
  {
    concern_tag_ref: 'built_in_love',
    date: '2029-07-01',
    kind: 'marker_cluster',
    driver_refs: ['mock_love_cluster_2029'],
    summary: '多重节点 · 大运 + 流年同步换轨',
  },
  {
    concern_tag_ref: 'built_in_love',
    date: '2031-01-01',
    kind: 'dayun_boundary',
    driver_refs: ['mock_love_dayun_2031'],
    summary: '大运边界 · 整体格局重置',
  },
  {
    concern_tag_ref: 'built_in_career',
    date: '2027-07-01',
    kind: 'annual_transition',
    driver_refs: ['mock_career_annual_2027'],
    summary: '流年切换 · 进入换挡观察',
  },
  {
    concern_tag_ref: 'built_in_career',
    date: '2029-07-01',
    kind: 'marker_cluster',
    driver_refs: ['mock_career_cluster_2029'],
    summary: '多重节点 · 收缩期内的拐点集中',
  },
  {
    concern_tag_ref: 'built_in_career',
    date: '2030-07-01',
    kind: 'dayun_boundary',
    driver_refs: ['mock_career_dayun_2030'],
    summary: '大运边界 · 赛道切换起点',
  },
];

function devFeatureSnapshot(nowIso: string): AstrologyFeatureSnapshot {
  const startUtc = `${MOCK_HORIZON_START}T00:00:00Z`;
  const endUtc = `${MOCK_HORIZON_END}T23:59:59Z`;
  const phaseDrivers: readonly NianJingPhaseDriver[] = MOCK_NIANJING_PHASES.map(
    (b) => ({
      concern_tag_ref: b.concern_tag_ref,
      start_date: b.start_date,
      end_date: b.end_date,
      nature: b.nature,
      driver_refs: [...b.driver_refs],
    }),
  );
  const inflectionDrivers: readonly NianJingInflectionDriver[] =
    MOCK_NIANJING_INFLECTIONS.map((p) => ({
      concern_tag_ref: p.concern_tag_ref,
      date: p.date,
      kind: p.kind,
      driver_refs: [...p.driver_refs],
    }));
  return {
    method_profile: devMethodProfile(),
    mirror_kind: 'nianjing',
    canonical_window: {
      start_utc: startUtc,
      end_utc: endUtc,
      basis_time_zone: 'Asia/Shanghai',
      scope_kind: 'long_horizon',
    },
    self_subject: {
      subject_ref: 'self',
      natal_chart: {
        subject_ref: 'self',
        canonicalization_hash: 'sha256:mock-self-natal',
        missing_pillars: [],
      },
      cycle_snapshot: {
        window_start_utc: startUtc,
        window_end_utc: endUtc,
        monthly_pillars: [],
        daily_pillars: [],
        markers: [],
      },
    },
    related_persons: [],
    stage_drivers: [],
    key_windows: [],
    yuejing_tendency_drivers: [],
    nianjing_phase_drivers: phaseDrivers,
    nianjing_inflection_drivers: inflectionDrivers,
    uncertainty_inputs: [],
  };
  // `nowIso` deliberately unused; passing it keeps the signature
  // future-proof if we ever want a "captured_at" derived snapshot.
  void nowIso;
}

function buildMockNianjingReading(nowIso: string): Reading {
  const output: NianJingMirrorOutput = {
    mirror_kind: 'nianjing',
    summary:
      '长程相位预览数据。姻缘进入外缘观察期,事业处于建设红利;2029 年大运 / 流年同步换轨。',
    horizon: { start_date: MOCK_HORIZON_START, end_date: MOCK_HORIZON_END },
    phase_bands: MOCK_NIANJING_PHASES,
    inflection_points: MOCK_NIANJING_INFLECTIONS,
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    citations: [
      {
        method: 'bazi_ganzhi_jieqi_dayun_v1',
        reference: 'mock.nianjing.preview_v1',
      },
    ],
  };
  return {
    id: 'r_mock_nianjing_01',
    created_at: nowIso,
    mirror_kind: 'nianjing',
    mirror_scope: {
      kind: 'long_horizon',
      start_date: MOCK_HORIZON_START,
      end_date: MOCK_HORIZON_END,
      basis_time_zone: 'Asia/Shanghai',
    },
    primary_subject_ref: 'self',
    related_person_refs: [],
    concern_tag_refs: ['built_in_love', 'built_in_career'],
    cited_reading_ids: [],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    inputs_summary: {
      captured_at: nowIso,
      contract_version: 'SJG-ASTRO-v1',
      algorithm_contract_version: 'SJG-ALGO-v1',
      method_profile: devMethodProfile(),
      mirror_context_snapshot: {
        mirror_kind: 'nianjing',
        mirror_scope: {
          kind: 'long_horizon',
          start_date: MOCK_HORIZON_START,
          end_date: MOCK_HORIZON_END,
          basis_time_zone: 'Asia/Shanghai',
        },
        active_concern_tags: [
          {
            id: 'built_in_love',
            label: '#姻缘',
            status: 'active',
            sort_order: 0,
            parsed_topics: ['love'],
            mention_refs: [],
            prompt_text_hash: 'sha256:mock-prompt-love',
            resolved_person_refs: [],
            captured_at: nowIso,
          },
          {
            id: 'built_in_career',
            label: '#事业',
            status: 'active',
            sort_order: 1,
            parsed_topics: ['career'],
            mention_refs: [],
            prompt_text_hash: 'sha256:mock-prompt-career',
            resolved_person_refs: [],
            captured_at: nowIso,
          },
        ],
        resolved_person_refs: [],
        cited_event_memory_refs: [],
        cited_plan_item_refs: [],
        response_preferences_hash: 'sha256:mock-prefs',
      },
      input_hash: 'sha256:mock-input',
      feature_snapshot_hash: 'sha256:mock-feature',
      feature_snapshot: devFeatureSnapshot(nowIso),
    },
    output,
    uncertainty: { confidence: 'medium', caveats: [], data_gaps: [] },
  };
}

export function buildMockShiJingSpace(userId: string): ShiJingSpace {
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  return {
    user_id: userId,
    self_subject: { natal_inputs: devNatalInputs() },
    persons: [],
    concern_tags: [
      {
        id: 'built_in_love',
        label: '#姻缘',
        status: 'active',
        sort_order: 0,
        parsed_topics: ['love'],
        mention_refs: [],
        prompt_text: 'love and relationship reflection',
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: 'built_in_career',
        label: '#事业',
        status: 'active',
        sort_order: 1,
        parsed_topics: ['career'],
        mention_refs: [],
        prompt_text: 'career reflection',
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    event_memories: [],
    plan_items: [],
    readings: [buildMockNianjingReading(nowIso)],
    conversations: [],
    settings: {
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
    },
  };
}

export function buildEmptyShiJingSpace(userId: string): ShiJingSpace {
  return {
    user_id: userId,
    self_subject: {
      natal_inputs: {
        raw_birth_input: { calendar_system: 'gregorian', local_date_text: '' },
        birth_datetime_utc: '',
        birth_precision: 'unknown',
        calendar_system: 'gregorian',
        birth_location: { latitude: 0, longitude: 0, iana_time_zone: 'Etc/UTC' },
        calculation_sex: 'unspecified',
      },
    },
    persons: [],
    concern_tags: [],
    event_memories: [],
    plan_items: [],
    readings: [],
    conversations: [],
    settings: {
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
    },
  };
}
