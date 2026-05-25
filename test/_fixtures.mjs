// Wave-4 — shared test fixture builders for Algorithm Contract v1 shapes.
// Tests import these to construct valid NatalInputs / Reading /
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

export function validTimeWindow(overrides = {}) {
  return {
    mode: 'bounded',
    start_utc: '2026-05-25T00:00:00Z',
    end_utc: '2026-05-26T00:00:00Z',
    basis_time_zone: 'Asia/Shanghai',
    source: 'kind_default',
    ...overrides,
  };
}

export function natalTimeWindow(overrides = {}) {
  return {
    mode: 'natal',
    basis_time_zone: 'Asia/Shanghai',
    source: 'kind_default',
    ...overrides,
  };
}

export function validNatalChartSnapshot(subject = 'self') {
  return {
    subject,
    method_profile: validMethodProfile(),
    canonicalization_hash: 'canon-hash-1',
    missing_pillars: ['hour'],
  };
}

export function validCycleSnapshot(timeWindow = validTimeWindow()) {
  return {
    window_start_utc: timeWindow.start_utc ?? '2026-05-25T00:00:00Z',
    window_end_utc: timeWindow.end_utc ?? '2026-05-26T00:00:00Z',
    monthly_pillars: [],
    daily_pillars: [],
    active_markers: [],
  };
}

export function validFeatureSnapshot(overrides = {}) {
  const timeWindow = overrides.time_window ?? validTimeWindow();
  return {
    method_profile: validMethodProfile(),
    time_window: timeWindow,
    subjects: [
      {
        subject: 'self',
        natal_chart: validNatalChartSnapshot('self'),
        cycle_snapshot: validCycleSnapshot(timeWindow),
        stage_drivers: [],
      },
    ],
    relation_features: [],
    stage_label: '守时',
    key_windows: [],
    uncertainty_inputs: [],
    ...overrides,
  };
}

export function validViewSnapshot(overrides = {}) {
  return {
    view_id: 'v_01',
    anchor_subject: 'self',
    subjects: ['self'],
    time_scope: 'rolling',
    instructions_hash: 'inst-hash-1',
    context_items_hash: 'ctx-hash-1',
    memory_summary_hash: 'memo-hash-1',
    memory_locked: false,
    ...overrides,
  };
}

export function validInputsSummary({ scope = 'subject', timeWindow = validTimeWindow(), viewId } = {}) {
  const summary = {
    captured_at: '2026-05-25T00:00:00Z',
    contract_version: 'SJG-ASTRO-v1',
    algorithm_contract_version: 'SJG-ALGO-v1',
    method_profile: validMethodProfile(),
    time_window: timeWindow,
    input_hash: 'input-hash-1',
    feature_snapshot_hash: 'feat-hash-1',
    feature_snapshot: validFeatureSnapshot({ time_window: timeWindow }),
    subject_summaries: [{ subject: 'self', summary: '' }],
    relation_summaries: [],
    event_summaries: [],
  };
  if (scope === 'view') {
    summary.view_snapshot = validViewSnapshot({ view_id: viewId ?? 'v_01' });
  }
  if (scope === 'ad_hoc') {
    summary.ad_hoc_context = 'sample ad-hoc context';
  }
  return summary;
}

export function validReading(overrides = {}) {
  const scope = overrides.scope ?? 'subject';
  const kind = overrides.kind ?? 'today';
  let timeWindow;
  if (kind === 'sign') {
    timeWindow = overrides.time_window ?? natalTimeWindow();
  } else {
    timeWindow = overrides.time_window ?? validTimeWindow();
  }
  const viewId = scope === 'view' ? (overrides.view_id ?? 'v_01') : undefined;
  const inputsSummary =
    overrides.inputs_summary ?? validInputsSummary({ scope, timeWindow, viewId });
  const reading = {
    id: 'r_01',
    created_at: '2026-05-25T00:00:00Z',
    scope,
    kind,
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: timeWindow,
    inputs_summary: inputsSummary,
    output: { summary: 'sample', highlights: [], recommendations: [], citations: [] },
    uncertainty: { confidence: 'medium', caveats: [], data_gaps: [] },
    ...overrides,
  };
  if (viewId !== undefined && reading.view_id === undefined) {
    reading.view_id = viewId;
  }
  return reading;
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
    relations: [],
    events: [],
    views: [],
    readings: [],
    conversations: [],
    settings: {
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
      notification_preferences: { daily_today_card_enabled: false, daily_today_card_local_time: '08:00' },
    },
    ...overrides,
  };
}
