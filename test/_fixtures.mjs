// W02 — shared test fixture builders for ShiJing Mirror Architecture v1
// shapes. Tests import these to construct valid NatalInputs / ConcernTag /
// EventMemory / PlanItem / MirrorScope / Reading / Conversation /
// ShiJingSpace examples without re-duplicating the v1 envelope.

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
    birth_datetime_utc: '1990-04-12T08:30:00Z',
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
    id: 'bazi_ganzhi_jieqi_dayun_v1',
    contract_version: 'SJG-ALGO-v1',
    feature_schema_version: 'SJG-FEATURE-v1',
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
  // consultation
  return {
    start_utc: '2026-05-25T00:00:00Z',
    end_utc: '2026-05-25T23:59:59Z',
    basis_time_zone: scope.basis_time_zone,
    scope_kind: 'consultation',
  };
}

export function validFeatureSnapshot({ mirrorKind = 'rijing', scope = dailyMirrorScope() } = {}) {
  return {
    method_profile: validMethodProfile(),
    mirror_kind: mirrorKind,
    canonical_window: canonicalWindowFor(scope),
    self_subject: {
      subject_ref: 'self',
      natal_chart: {
        subject_ref: 'self',
        canonicalization_hash: 'sha256:canon-self',
        missing_pillars: [],
      },
      cycle_snapshot: {
        window_start_utc: canonicalWindowFor(scope).start_utc,
        window_end_utc: canonicalWindowFor(scope).end_utc,
        monthly_pillars: [],
        daily_pillars: [],
        markers: [],
      },
    },
    related_persons: [],
    stage_drivers: [],
    key_windows: [],
    yuejing_tendency_drivers: [],
    nianjing_phase_drivers: [],
    nianjing_inflection_drivers: [],
    uncertainty_inputs: [],
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
  return {
    captured_at: '2026-05-25T00:00:00Z',
    contract_version: 'SJG-ASTRO-v1',
    algorithm_contract_version: 'SJG-ALGO-v1',
    method_profile: validMethodProfile(),
    mirror_context_snapshot: validMirrorContextSnapshot({ mirrorKind, scope, concernTagSnapshots }),
    input_hash: 'sha256:input-hash',
    feature_snapshot_hash: 'sha256:feature-hash',
    feature_snapshot: validFeatureSnapshot({ mirrorKind, scope }),
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
    citations: [{ method: 'bazi_ganzhi_jieqi_dayun_v1', reference: 'rijing-rule-01' }],
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
    citations: [{ method: 'bazi_ganzhi_jieqi_dayun_v1', reference: 'yuejing-rule-01' }],
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
    citations: [{ method: 'bazi_ganzhi_jieqi_dayun_v1', reference: 'nianjing-rule-01' }],
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
    citations: [{ method: 'bazi_ganzhi_jieqi_dayun_v1', reference: 'shijing-rule-01' }],
    ...overrides,
  };
}

export function validReading(overrides = {}) {
  const mirrorKind = overrides.mirror_kind ?? 'rijing';
  let scope;
  let output;
  let citedReadingIds = [];
  if (mirrorKind === 'rijing') {
    scope = overrides.mirror_scope ?? dailyMirrorScope();
    output = overrides.output ?? validRijingOutput();
  } else if (mirrorKind === 'yuejing') {
    scope = overrides.mirror_scope ?? rolling30DayMirrorScope();
    output = overrides.output ?? validYuejingOutput(scope);
  } else if (mirrorKind === 'nianjing') {
    scope = overrides.mirror_scope ?? longHorizonMirrorScope();
    output = overrides.output ?? validNianjingOutput(scope);
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
    related_person_refs: [],
    concern_tag_refs: ['tag_love'],
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
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
    },
    ...overrides,
  };
}
