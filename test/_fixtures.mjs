// W02 — shared test fixture builders for ShiJing Mirror Architecture v1
// shapes. Tests import these to construct valid NatalInputs / ConcernTag /
// EventMemory / PlanItem / MirrorScope / Reading / Conversation /
// ShiJingSpace examples without re-duplicating the v1 envelope.

import { computeCanonicalHash } from '../src/product/astrology/canonical-hash.ts';

export function validRawBirthInput(overrides = {}) {
  return {
    calendar_system: 'gregorian',
    local_date_text: '1990-04-12',
    local_time_text: '08:30',
    place_text: 'Shanghai',
    ...overrides,
  };
}

export function validNatalInputs(overrides = {}) {
  return {
    raw_birth_input: validRawBirthInput(),
    // Genuine UTC instant for 08:30 Asia/Shanghai (= local wall clock − 8h), as
    // the real UI (buildSelfNatalInputs → localWallClockToUtcInstant) produces.
    birth_datetime_utc: '1990-04-12T00:30:00Z',
    birth_precision: 'exact',
    calendar_system: 'gregorian',
    calculation_sex: 'unspecified',
    birth_location: {
      latitude: 31.2304,
      longitude: 121.4737,
      iana_time_zone: 'Asia/Shanghai',
      place_name: 'Shanghai',
    },
    ...overrides,
  };
}

export function validMethodProfile() {
  return {
    id: 'bazi_ziping_v1',
    contract_version: 'SJG-ALGO-v1',
    feature_schema_version: 'SJG-FEATURE-v2',
    ephemeris_version: 'tyme4ts-1.5.0',
  };
}

export function validConcernTag(id = 'tag_love', overrides = {}) {
  return {
    id,
    label: '#姻缘',
    status: 'active',
    sort_order: 0,
    parsed_topics: ['love'],
    mention_refs: [],
    prompt_text: 'love and relationship reflection',
    created_at: '2026-05-25T00:00:00Z',
    updated_at: '2026-05-25T00:00:00Z',
    ...overrides,
  };
}

export function validConcernTagSnapshot(id = 'tag_love', overrides = {}) {
  return {
    id,
    label: '#姻缘',
    status: 'active',
    sort_order: 0,
    parsed_topics: ['love'],
    mention_refs: [],
    prompt_text_hash: 'sha256:prompt-' + id,
    resolved_person_refs: [],
    captured_at: '2026-05-25T00:00:00Z',
    ...overrides,
  };
}

export function validEventMemory(id = 'mem_01', overrides = {}) {
  return {
    id,
    occurred_at: '2026-05-20T08:00:00Z',
    body: 'A notable event entry.',
    person_refs: [],
    concern_tag_refs: [],
    source: 'manual',
    admissible_use: 'eligible_for_retrieval',
    created_at: '2026-05-25T00:00:00Z',
    updated_at: '2026-05-25T00:00:00Z',
    ...overrides,
  };
}

export function validPlanItem(id = 'plan_01', overrides = {}) {
  return {
    id,
    planned_for: '2026-06-10T00:00:00Z',
    body: 'A future intention entry.',
    person_refs: [],
    concern_tag_refs: [],
    source: 'manual',
    created_at: '2026-05-25T00:00:00Z',
    updated_at: '2026-05-25T00:00:00Z',
    ...overrides,
  };
}

export function dailyMirrorScope(overrides = {}) {
  return {
    kind: 'daily',
    date: '2026-05-25',
    basis_time_zone: 'Asia/Shanghai',
    ...overrides,
  };
}

export function rolling30DayMirrorScope(overrides = {}) {
  return {
    kind: 'rolling_30_day',
    start_date: '2026-05-25',
    end_date: '2026-06-23',
    basis_time_zone: 'Asia/Shanghai',
    ...overrides,
  };
}

export function longHorizonMirrorScope(overrides = {}) {
  return {
    kind: 'long_horizon',
    start_date: '2026-01-01',
    end_date: '2027-12-31',
    basis_time_zone: 'Asia/Shanghai',
    ...overrides,
  };
}

export function natalMirrorScope(overrides = {}) {
  return {
    kind: 'natal',
    anchor_year: 2026,
    basis_time_zone: 'Asia/Shanghai',
    ...overrides,
  };
}

export function relationshipNatalMirrorScope(overrides = {}) {
  return {
    kind: 'relationship_natal',
    related_person_ref: { kind: 'person', id: 'p_alice' },
    anchor_year: 2026,
    basis_time_zone: 'Asia/Shanghai',
    ...overrides,
  };
}

export function consultationMirrorScope(sourceReadingIds = ['r_source_01'], overrides = {}) {
  return {
    kind: 'consultation',
    source_reading_ids: [...sourceReadingIds],
    basis_time_zone: 'Asia/Shanghai',
    ...overrides,
  };
}

export function canonicalWindowFor(scope) {
  if (scope.kind === 'daily') {
    return {
      start_utc: scope.date + 'T00:00:00Z',
      end_utc: scope.date + 'T23:59:59Z',
      basis_time_zone: scope.basis_time_zone,
      scope_kind: 'daily',
    };
  }
  if (scope.kind === 'rolling_30_day' || scope.kind === 'long_horizon') {
    return {
      start_utc: scope.start_date + 'T00:00:00Z',
      end_utc: scope.end_date + 'T23:59:59Z',
      basis_time_zone: scope.basis_time_zone,
      scope_kind: scope.kind,
    };
  }
  if (scope.kind === 'natal' || scope.kind === 'relationship_natal') {
    return {
      start_utc: scope.anchor_year + '-01-01T00:00:00Z',
      end_utc: scope.anchor_year + '-12-31T23:59:59Z',
      basis_time_zone: scope.basis_time_zone,
      scope_kind: scope.kind,
    };
  }
  // consultation
  return {
    start_utc: '2026-05-25T00:00:00Z',
    end_utc: '2026-05-25T23:59:59Z',
    basis_time_zone: scope.basis_time_zone,
    scope_kind: 'consultation',
  };
}

export function validFeatureSnapshot({ mirrorKind = 'rijing', scope = dailyMirrorScope() } = {}) {
  const window = canonicalWindowFor(scope);
  return {
    method_profile: validMethodProfile(),
    mirror_kind: mirrorKind,
    canonical_window: window,
    common: {
      stage_drivers: [],
      key_windows: [],
      yuejing_tendency_drivers: [],
      nianjing_phase_drivers: [],
      nianjing_inflection_drivers: [],
      uncertainty_inputs: [],
    },
    method_evidence: {
      method_id: 'bazi_ziping_v1',
      bazi: {
        self_subject: {
          subject_ref: 'self',
          natal_chart: {
            subject_ref: 'self',
            canonicalization_hash: 'sha256:canon-self',
            missing_pillars: [],
          },
          cycle_snapshot: {
            window_start_utc: window.start_utc,
            window_end_utc: window.end_utc,
            monthly_pillars: [],
            daily_pillars: [],
            markers: [],
          },
        },
        related_persons: [],
      },
    },
  };
}

export function validMirrorContextSnapshot({
  mirrorKind = 'rijing',
  scope = dailyMirrorScope(),
  concernTagSnapshots = [validConcernTagSnapshot('tag_love')],
} = {}) {
  return {
    mirror_kind: mirrorKind,
    mirror_scope: scope,
    active_concern_tags: concernTagSnapshots,
    resolved_person_refs: [],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    response_preferences_hash: 'sha256:prefs',
  };
}

export function validInputsSummary({
  mirrorKind = 'rijing',
  scope = dailyMirrorScope(),
  concernTagSnapshots = [validConcernTagSnapshot('tag_love')],
} = {}) {
  // The feature_snapshot_hash must be the real canonical hash of the embedded
  // snapshot — validateReading now recomputes and fails closed on drift
  // (SJG-ALGO-11/12 integrity). A placeholder would make every fixture Reading
  // structurally inconsistent.
  const feature_snapshot = validFeatureSnapshot({ mirrorKind, scope });
  return {
    captured_at: '2026-05-25T00:00:00Z',
    contract_version: 'SJG-ASTRO-v1',
    algorithm_contract_version: 'SJG-ALGO-v1',
    method_profile: validMethodProfile(),
    mirror_context_snapshot: validMirrorContextSnapshot({ mirrorKind, scope, concernTagSnapshots }),
    input_hash: 'sha256:input-hash',
    feature_snapshot_hash: computeCanonicalHash(feature_snapshot),
    feature_snapshot,
  };
}

export function validRijingOutput(overrides = {}) {
  return {
    mirror_kind: 'rijing',
    summary: 'Today is steady.',
    daily_overview: 'Calm day with moderate support.',
    concern_projections: [
      {
        concern_tag_ref: 'tag_love',
        tendency_class: 'steady',
        summary: 'Steady connection day.',
        recommendations: ['Listen first.'],
      },
    ],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    citations: [{ method: 'bazi_ziping_v1', reference: 'rijing-rule-01' }],
    ...overrides,
  };
}

export function validYuejingOutput(scope = rolling30DayMirrorScope(), overrides = {}) {
  return {
    mirror_kind: 'yuejing',
    summary: 'Month outlook.',
    range: { start_date: scope.start_date, end_date: scope.end_date },
    cells: [
      {
        date: scope.start_date,
        concern_tag_ref: 'tag_love',
        tendency_class: 'steady',
        summary: 'Steady day.',
      },
    ],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    citations: [{ method: 'bazi_ziping_v1', reference: 'yuejing-rule-01' }],
    ...overrides,
  };
}

export function validNianjingOutput(scope = longHorizonMirrorScope(), overrides = {}) {
  return {
    mirror_kind: 'nianjing',
    summary: 'Horizon outlook.',
    horizon: { start_date: scope.start_date, end_date: scope.end_date },
    phase_bands: [
      {
        concern_tag_ref: 'tag_love',
        start_date: scope.start_date,
        end_date: scope.end_date,
        nature: 'steady',
        driver_refs: ['driver-1'],
        summary: 'Steady phase.',
      },
    ],
    inflection_points: [
      {
        concern_tag_ref: 'tag_love',
        date: scope.start_date,
        kind: 'dayun_boundary',
        driver_refs: ['driver-1'],
        summary: 'Inflection start.',
      },
    ],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    citations: [{ method: 'bazi_ziping_v1', reference: 'nianjing-rule-01' }],
    ...overrides,
  };
}

export function validMingjingOutput(overrides = {}) {
  return {
    mirror_kind: 'mingjing',
    summary: 'Natal structure summary.',
    core: {
      personality: 'Stable and observant.',
      strengths: 'Good at sustained attention.',
      long_term_themes: 'Builds through patient accumulation.',
      relationship_pattern: 'Needs steady communication.',
      career_inclination: 'Suited to structured work.',
    },
    life_stage_strategies: [
      {
        phase_label: 'Jia Zi dayun',
        age_range: '30-39',
        dayun_pillar: { stem: 'jia', branch: 'zi' },
        theme: 'Consolidate the foundation.',
        strategy: 'Keep commitments visible.',
      },
    ],
    event_validations: [],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    citations: [{ method: 'bazi_ziping_v1', reference: 'mingjing.natal.v1' }],
    ...overrides,
  };
}

export function validMingjingRelationshipOutput(overrides = {}) {
  return {
    mirror_kind: 'mingjing',
    output_kind: 'relationship_hepan',
    relationship_subject: {
      primary_subject_ref: 'self',
      related_person_ref: { kind: 'person', id: 'p_alice' },
      anchor_year: 2026,
      basis_time_zone: 'Asia/Shanghai',
    },
    summary: 'Relationship structure summary.',
    structure: {
      baseline_pattern: 'Both sides need a predictable rhythm.',
      attraction_and_support: 'Support appears through steady follow-through.',
      friction_and_misread: 'Misreads arise when timing is rushed.',
      communication_rhythm: 'Short, explicit check-ins work best.',
      boundary_advice: 'Keep personal recovery time visible.',
    },
    timing_windows: [
      {
        start_date: '2026-03-01',
        end_date: '2026-04-15',
        nature: 'steady',
        driver_refs: ['bazi:relationship.window.2026-03'],
        summary: 'A stable window for clarifying shared expectations.',
      },
    ],
    practice: {
      communication: 'Name the practical need before the emotion escalates.',
      boundary: 'Protect separate schedules and do not merge obligations by default.',
      repair: 'Return to the exact missed expectation and reset it in writing.',
    },
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    citations: [{ method: 'bazi_ziping_v1', reference: 'mingjing.relationship_hepan.v1' }],
    ...overrides,
  };
}

export function validShijingOutput(sourceReadingIds = ['r_source_01'], overrides = {}) {
  return {
    mirror_kind: 'shijing',
    summary: 'Consultation summary.',
    answer: 'Cited reading suggests steady direction.',
    cited_reading_ids: [...sourceReadingIds],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    citations: [{ method: 'bazi_ziping_v1', reference: 'shijing-rule-01' }],
    ...overrides,
  };
}

export function validReading(overrides = {}) {
  const mirrorKind = overrides.mirror_kind ?? 'rijing';
  let scope;
  let output;
  let citedReadingIds = [];
  let relatedPersonRefs = [];
  let concernTagRefs = ['tag_love'];
  if (mirrorKind === 'rijing') {
    scope = overrides.mirror_scope ?? dailyMirrorScope();
    output = overrides.output ?? validRijingOutput();
  } else if (mirrorKind === 'yuejing') {
    scope = overrides.mirror_scope ?? rolling30DayMirrorScope();
    output = overrides.output ?? validYuejingOutput(scope);
  } else if (mirrorKind === 'nianjing') {
    scope = overrides.mirror_scope ?? longHorizonMirrorScope();
    output = overrides.output ?? validNianjingOutput(scope);
  } else if (mirrorKind === 'mingjing') {
    scope = overrides.mirror_scope ?? natalMirrorScope();
    if (scope.kind === 'relationship_natal') {
      output = overrides.output ?? validMingjingRelationshipOutput({
        relationship_subject: {
          primary_subject_ref: 'self',
          related_person_ref: scope.related_person_ref,
          anchor_year: scope.anchor_year,
          basis_time_zone: scope.basis_time_zone,
        },
      });
      relatedPersonRefs = [scope.related_person_ref];
      concernTagRefs = [];
    } else {
      output = overrides.output ?? validMingjingOutput();
      concernTagRefs = [];
    }
  } else {
    const sourceIds = overrides.cited_reading_ids ?? ['r_source_01'];
    scope = overrides.mirror_scope ?? consultationMirrorScope(sourceIds);
    output = overrides.output ?? validShijingOutput(sourceIds);
    citedReadingIds = sourceIds;
  }
  const reading = {
    id: 'r_01',
    created_at: '2026-05-25T00:00:00Z',
    mirror_kind: mirrorKind,
    mirror_scope: scope,
    primary_subject_ref: 'self',
    related_person_refs: relatedPersonRefs,
    concern_tag_refs: concernTagRefs,
    cited_reading_ids: citedReadingIds,
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    inputs_summary: overrides.inputs_summary ?? validInputsSummary({ mirrorKind, scope }),
    output,
    uncertainty: { confidence: 'medium', caveats: [], data_gaps: [] },
    ...overrides,
  };
  return reading;
}

export function validConversation(overrides = {}) {
  return {
    id: 'c_01',
    created_at: '2026-05-25T00:00:00Z',
    source_reading_ids: ['r_01'],
    turns: [
      {
        id: 't_01',
        role: 'user',
        body: 'Tell me about today.',
        cited_reading_ids: [],
        cited_event_memory_refs: [],
        cited_plan_item_refs: [],
        created_at: '2026-05-25T00:01:00Z',
      },
      {
        id: 't_02',
        role: 'ai',
        body: 'Citing r_01: today is steady.',
        cited_reading_ids: ['r_01'],
        cited_event_memory_refs: [],
        cited_plan_item_refs: [],
        created_at: '2026-05-25T00:02:00Z',
      },
    ],
    ...overrides,
  };
}

export function validPerson(id, overrides = {}) {
  return {
    id,
    display_name: id,
    kind: 'person',
    natal_inputs: validNatalInputs(),
    consent_state: 'owner_recorded',
    ...overrides,
  };
}

export function validShiJingSpace(overrides = {}) {
  return {
    user_id: 'u_01',
    self_subject: { natal_inputs: validNatalInputs() },
    persons: [],
    concern_tags: [],
    event_memories: [],
    plan_items: [],
    readings: [],
    conversations: [],
    settings: {
      ui_language: 'zh',
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
    },
    ...overrides,
  };
}
