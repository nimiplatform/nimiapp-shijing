// SJG-ALGO-* + SJG-ASTRO-* — W03 mirror reading pipeline tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAstrologyFeatureSnapshot,
} from '../src/product/astrology/build-feature-snapshot.ts';
import { generateReading } from '../src/product/astrology/generate-reading.ts';
import {
  inputsSummaryStaleForSpace,
  yuejingInputsSummaryStaleForActiveSubset,
} from '../src/product/astrology/inputs-summary-expiry.ts';
import { resolveCanonicalMirrorWindow } from '../src/product/astrology/mirror-window.ts';
import { generateRiJingOutput } from '../src/product/astrology/rijing-generator.ts';
import { generateYueJingOutput } from '../src/product/astrology/yuejing-generator.ts';
import { generateNianJingOutput } from '../src/product/astrology/nianjing-generator.ts';
import { generateShiJingOutput } from '../src/product/astrology/shijing-generator.ts';
import {
  consultationMirrorScope,
  dailyMirrorScope,
  longHorizonMirrorScope,
  rolling30DayMirrorScope,
  validConcernTag,
  validNatalInputs,
  validNianjingOutput,
  validReading,
  validRijingOutput,
  validShiJingSpace,
  validShijingOutput,
  validYuejingOutput,
} from './_fixtures.mjs';
import { MockRuntimeAiClient } from './_mock-runtime-ai-client.mjs';

const TZ = 'Asia/Shanghai';

function spaceWithActiveTag() {
  return validShiJingSpace({
    concern_tags: [
      validConcernTag('tag_love', { sort_order: 0 }),
    ],
  });
}

function spaceWithLoveAndCareerTags() {
  return validShiJingSpace({
    concern_tags: [
      validConcernTag('tag_love', {
        label: '#姻缘',
        parsed_topics: ['love'],
        prompt_text: 'love relationship reflection',
        sort_order: 0,
      }),
      validConcernTag('tag_career', {
        label: '#事业',
        parsed_topics: ['career'],
        prompt_text: 'career work reflection',
        sort_order: 1,
      }),
    ],
  });
}

test('resolveCanonicalMirrorWindow: daily scope yields a 1-day UTC window', () => {
  const scope = dailyMirrorScope({ date: '2026-05-25', basis_time_zone: TZ });
  const result = resolveCanonicalMirrorWindow(scope);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.scope_kind, 'daily');
    assert.equal(result.value.basis_time_zone, TZ);
    assert.equal(result.value.start_utc.slice(0, 10), '2026-05-25');
  }
});

test('resolveCanonicalMirrorWindow: rolling_30_day yields a window with start ≤ end', () => {
  const scope = rolling30DayMirrorScope();
  const result = resolveCanonicalMirrorWindow(scope);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(new Date(result.value.start_utc).getTime() < new Date(result.value.end_utc).getTime());
  }
});

test('buildAstrologyFeatureSnapshot: rijing daily snapshot uses rijing mirror_kind', () => {
  const space = spaceWithActiveTag();
  const result = buildAstrologyFeatureSnapshot({
    mirror_kind: 'rijing',
    mirror_scope: dailyMirrorScope(),
    space,
    related_person_refs: [],
    active_concern_tags: space.concern_tags,
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  if (result.ok) {
    assert.equal(result.value.mirror_kind, 'rijing');
    assert.equal(result.value.method_profile.id, 'bazi_ganzhi_jieqi_dayun_v1');
  }
});

test('buildAstrologyFeatureSnapshot: yuejing emits start-date tendency drivers per concern tag', () => {
  const space = spaceWithActiveTag();
  const scope = rolling30DayMirrorScope();
  const result = buildAstrologyFeatureSnapshot({
    mirror_kind: 'yuejing',
    mirror_scope: scope,
    space,
    related_person_refs: [],
    active_concern_tags: space.concern_tags,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.yuejing_tendency_drivers.length, space.concern_tags.length);
    assert.equal(result.value.yuejing_tendency_drivers[0].date, scope.start_date);
  }
});

test('buildAstrologyFeatureSnapshot: yuejing domainizes tendency by concern tag', () => {
  const space = spaceWithLoveAndCareerTags();
  const scope = rolling30DayMirrorScope({
    start_date: '2026-06-03',
    end_date: '2026-07-02',
    basis_time_zone: TZ,
  });
  const result = buildAstrologyFeatureSnapshot({
    mirror_kind: 'yuejing',
    mirror_scope: scope,
    space,
    related_person_refs: [],
    active_concern_tags: space.concern_tags,
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  const byTag = new Map(result.value.yuejing_tendency_drivers.map((driver) => [
    driver.concern_tag_ref,
    driver,
  ]));
  assert.equal(byTag.get('tag_love')?.date, '2026-06-03');
  assert.equal(byTag.get('tag_career')?.date, '2026-06-03');
  assert.notEqual(
    byTag.get('tag_love')?.tendency_class,
    byTag.get('tag_career')?.tendency_class,
  );
  assert.ok(byTag.get('tag_love')?.driver_refs.includes('domain.love'));
  assert.ok(byTag.get('tag_career')?.driver_refs.includes('domain.career'));
});

test('generateRiJingOutput: emits projection per active concern tag', () => {
  const space = spaceWithActiveTag();
  const featureResult = buildAstrologyFeatureSnapshot({
    mirror_kind: 'rijing',
    mirror_scope: dailyMirrorScope(),
    space,
    related_person_refs: [],
    active_concern_tags: space.concern_tags,
  });
  assert.equal(featureResult.ok, true);
  if (!featureResult.ok) return;
  const result = generateRiJingOutput({
    feature_snapshot: featureResult.value,
    active_concern_tags: space.concern_tags,
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.mirror_kind, 'rijing');
    assert.equal(result.value.concern_projections.length, 1);
  }
});

test('generateRiJingOutput: refuses with no active concern tags', () => {
  const space = validShiJingSpace();
  const featureResult = buildAstrologyFeatureSnapshot({
    mirror_kind: 'rijing',
    mirror_scope: dailyMirrorScope(),
    space,
    related_person_refs: [],
    active_concern_tags: [],
  });
  // feature snapshot itself succeeds (no_active_concern_tags is recorded
  // as uncertainty_input fail_close).
  assert.equal(featureResult.ok, true);
  if (!featureResult.ok) return;
  const result = generateRiJingOutput({
    feature_snapshot: featureResult.value,
    active_concern_tags: [],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
  });
  assert.equal(result.ok, false);
});

test('generateShiJingOutput: refuses on empty source_reading_ids', () => {
  const result = generateShiJingOutput({
    mirror_scope: { kind: 'consultation', source_reading_ids: [], basis_time_zone: TZ },
    source_readings: [],
    question: 'q',
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
  });
  assert.equal(result.ok, false);
});

test('generateShiJingOutput: refuses when cited reading is not in source set', () => {
  const reading = validReading({ id: 'r_a' });
  const result = generateShiJingOutput({
    mirror_scope: { kind: 'consultation', source_reading_ids: ['r_b'], basis_time_zone: TZ },
    source_readings: [reading],
    question: 'q',
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
  });
  assert.equal(result.ok, false);
});

test('generateReading: fails closed when Runtime AI client is missing', async () => {
  const space = spaceWithActiveTag();
  const result = await generateReading({
    id: 'r_rijing_01',
    created_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    mirror_kind: 'rijing',
    mirror_scope: dailyMirrorScope({
      date: new Date().toISOString().slice(0, 10),
      basis_time_zone: TZ,
    }),
    related_person_refs: [],
    concern_tag_refs: ['tag_love'],
    cited_reading_ids: [],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    space,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'runtime_ai_failed');
    assert.equal(result.failure.detail, 'runtime_unavailable:Runtime AI client is required');
  }
});

test('generateReading: yuejing rolling_30_day end-to-end', async () => {
  const space = spaceWithActiveTag();
  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const endDate = new Date(today.getTime() + 29 * 86_400_000);
  const scope = rolling30DayMirrorScope({
      start_date: start,
      end_date: endDate.toISOString().slice(0, 10),
      basis_time_zone: TZ,
    });
  const ai = new MockRuntimeAiClient({
    canned_output_by_kind: { yuejing: validYuejingOutput(scope) },
  });
  const result = await generateReading(
    {
      id: 'r_yuejing_01',
      created_at: today.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      mirror_kind: 'yuejing',
      mirror_scope: scope,
      related_person_refs: [],
      concern_tag_refs: ['tag_love'],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space,
    },
    { runtime_ai_client: ai },
  );
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('generateReading: rejects forbidden output coming from runtime AI', async () => {
  const space = spaceWithActiveTag();
  const today = new Date();
  // Canned output that includes a forbidden luck_score field.
  const cannedBad = { ...validRijingOutput(), luck_score: 50 };
  const ai = new MockRuntimeAiClient({ canned_output_by_kind: { rijing: cannedBad } });
  const result = await generateReading(
    {
      id: 'r_bad_01',
      created_at: today.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      mirror_kind: 'rijing',
      mirror_scope: dailyMirrorScope({
        date: today.toISOString().slice(0, 10),
        basis_time_zone: TZ,
      }),
      related_person_refs: [],
      concern_tag_refs: ['tag_love'],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space,
    },
    { runtime_ai_client: ai },
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'runtime_ai_failed');
  }
});

test('generateReading: preserves runtime AI mirror_kind_mismatch diagnostics', async () => {
  const space = spaceWithActiveTag();
  const today = new Date();
  const ai = new MockRuntimeAiClient({
    canned_failure: {
      kind: 'parse_failure',
      failure: { kind: 'mirror_kind_mismatch', expected: 'rijing', received: 'yuejing' },
    },
  });
  const result = await generateReading(
    {
      id: 'r_kind_mismatch_01',
      created_at: today.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      mirror_kind: 'rijing',
      mirror_scope: dailyMirrorScope({
        date: today.toISOString().slice(0, 10),
        basis_time_zone: TZ,
      }),
      related_person_refs: [],
      concern_tag_refs: ['tag_love'],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space,
    },
    { runtime_ai_client: ai },
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'runtime_ai_failed');
    assert.equal(
      result.failure.detail,
      'parse_failure:mirror_kind_mismatch;expected=rijing;received=yuejing',
    );
  }
});

test('generateReading: stale_inputs failure when created_at is older than rijing horizon', async () => {
  const space = spaceWithActiveTag();
  // captured_at = 48h before now → rijing 24h horizon expired.
  const longAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const today = new Date();
  const result = await generateReading(
    {
      id: 'r_stale_01',
      created_at: longAgo.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      mirror_kind: 'rijing',
      mirror_scope: dailyMirrorScope({
        date: today.toISOString().slice(0, 10),
        basis_time_zone: TZ,
      }),
      related_person_refs: [],
      concern_tag_refs: ['tag_love'],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space,
    },
    {
      now: today,
      runtime_ai_client: new MockRuntimeAiClient({
        canned_output_by_kind: { rijing: validRijingOutput() },
      }),
    },
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'stale_inputs');
  }
});

test('inputsSummaryStaleForSpace: natal input changes stale a generated nianjing reading', async () => {
  const scope = longHorizonMirrorScope();
  const now = new Date('2026-05-25T00:00:00Z');
  const space = validShiJingSpace({
    self_subject: {
      natal_inputs: validNatalInputs({
        calculation_sex: 'male',
      }),
    },
    concern_tags: [validConcernTag('tag_love')],
  });
  const result = await generateReading(
    {
      id: 'r_nian_freshness',
      created_at: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      mirror_kind: 'nianjing',
      mirror_scope: scope,
      related_person_refs: [],
      concern_tag_refs: ['tag_love'],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space,
    },
    {
      now,
      runtime_ai_client: new MockRuntimeAiClient({
        canned_output_by_kind: { nianjing: validNianjingOutput(scope) },
      }),
    },
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;

  assert.equal(
    inputsSummaryStaleForSpace({
      reading: result.reading,
      space,
      now,
      expected_mirror_scope: scope,
      expected_concern_tag_refs: ['tag_love'],
    }),
    false,
  );

  const changedSpace = {
    ...space,
    self_subject: {
      ...space.self_subject,
      natal_inputs: {
        ...space.self_subject.natal_inputs,
        birth_location: {
          ...space.self_subject.natal_inputs.birth_location,
          longitude: 118.72,
        },
      },
    },
  };
  assert.equal(
    inputsSummaryStaleForSpace({
      reading: result.reading,
      space: changedSpace,
      now,
      expected_mirror_scope: scope,
      expected_concern_tag_refs: ['tag_love'],
    }),
    true,
  );
});

test('yuejingInputsSummaryStaleForActiveSubset: archived concern does not stale remaining cells', async () => {
  const scope = rolling30DayMirrorScope();
  const now = new Date('2026-05-25T00:00:00Z');
  const love = validConcernTag('tag_love', { label: '#姻缘', parsed_topics: ['love'] });
  const career = validConcernTag('tag_career', {
    label: '#事业',
    parsed_topics: ['career'],
    prompt_text: 'career and work reflection',
    sort_order: 1,
  });
  const space = validShiJingSpace({
    concern_tags: [love, career],
  });
  const result = await generateReading(
    {
      id: 'r_yue_subset_freshness',
      created_at: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      mirror_kind: 'yuejing',
      mirror_scope: scope,
      related_person_refs: [],
      concern_tag_refs: ['tag_love', 'tag_career'],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space,
    },
    {
      now,
      runtime_ai_client: new MockRuntimeAiClient({
        canned_output_by_kind: { yuejing: validYuejingOutput(scope) },
      }),
    },
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;

  const archivedLoveSpace = {
    ...space,
    concern_tags: [
      { ...love, status: 'archived', updated_at: '2026-05-25T00:01:00Z' },
      career,
    ],
  };

  assert.equal(
    inputsSummaryStaleForSpace({
      reading: result.reading,
      space: archivedLoveSpace,
      now,
      expected_concern_tag_refs: ['tag_career'],
    }),
    true,
  );
  assert.equal(
    yuejingInputsSummaryStaleForActiveSubset({
      reading: result.reading,
      space: archivedLoveSpace,
      now,
      active_concern_tag_refs: ['tag_career'],
    }),
    false,
  );
});

test('generateReading: shijing consultation with resolved source reading succeeds', async () => {
  const sourceReading = validReading({ id: 'r_source_01' });
  const concernTag = validConcernTag('tag_love');
  const space = validShiJingSpace({
    concern_tags: [concernTag],
    readings: [sourceReading],
  });
  const today = new Date();
  const sourceIds = ['r_source_01'];
  const ai = new MockRuntimeAiClient({
    canned_output_by_kind: { shijing: validShijingOutput(sourceIds) },
  });
  const result = await generateReading(
    {
      id: 'r_consult_01',
      created_at: today.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      mirror_kind: 'shijing',
      mirror_scope: consultationMirrorScope(sourceIds),
      related_person_refs: [],
      concern_tag_refs: ['tag_love'],
      cited_reading_ids: sourceIds,
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      question: 'will the day go well?',
      space,
    },
    { runtime_ai_client: ai },
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  if (result.ok) {
    assert.equal(result.reading.mirror_kind, 'shijing');
    assert.deepEqual(result.reading.cited_reading_ids, ['r_source_01']);
  }
});

test('generateReading: shijing consultation fails when source reading is missing', async () => {
  const concernTag = validConcernTag('tag_love');
  const space = validShiJingSpace({ concern_tags: [concernTag] });
  const today = new Date();
  const result = await generateReading({
    id: 'r_consult_missing',
    created_at: today.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    mirror_kind: 'shijing',
    mirror_scope: consultationMirrorScope(['r_missing']),
    related_person_refs: [],
    concern_tag_refs: ['tag_love'],
    cited_reading_ids: ['r_missing'],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    space,
  });
  assert.equal(result.ok, false);
});

test('generateReading: pipeline_stage_failed when DaYun required and calculation_sex unspecified', async () => {
  // NianJing requires DaYun. Default fixture has calculation_sex='unspecified'.
  const space = spaceWithActiveTag();
  const today = new Date();
  const result = await generateReading({
    id: 'r_nian_dayun_fail',
    created_at: today.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    mirror_kind: 'nianjing',
    mirror_scope: longHorizonMirrorScope(),
    related_person_refs: [],
    concern_tag_refs: ['tag_love'],
    cited_reading_ids: [],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    space,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'pipeline_stage_failed');
  }
});

test('generateNianJingOutput: refuses with empty phase drivers', () => {
  const scope = longHorizonMirrorScope();
  const result = generateNianJingOutput({
    feature_snapshot: {
      method_profile: { id: 'bazi_ganzhi_jieqi_dayun_v1', contract_version: 'SJG-ALGO-v1', feature_schema_version: 'SJG-FEATURE-v1' },
      mirror_kind: 'nianjing',
      canonical_window: { start_utc: '2026-01-01T00:00:00Z', end_utc: '2027-12-31T23:59:59Z', basis_time_zone: TZ, scope_kind: 'long_horizon' },
      self_subject: { subject_ref: 'self', natal_chart: { subject_ref: 'self', canonicalization_hash: 'h', missing_pillars: [] }, cycle_snapshot: { window_start_utc: '2026-01-01T00:00:00Z', window_end_utc: '2027-12-31T23:59:59Z', monthly_pillars: [], daily_pillars: [], markers: [] } },
      related_persons: [],
      stage_drivers: [],
      key_windows: [],
      yuejing_tendency_drivers: [],
      nianjing_phase_drivers: [],
      nianjing_inflection_drivers: [],
      uncertainty_inputs: [],
    },
    mirror_scope: scope,
    active_concern_tags: [validConcernTag('tag_love')],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
  });
  assert.equal(result.ok, false);
});

test('buildAstrologyFeatureSnapshot: nianjing does not synthesize baseline phase bands', () => {
  const scope = longHorizonMirrorScope({ start_date: '2026-01-01', end_date: '2036-12-31' });
  const tag = validConcernTag('tag_love');
  const space = validShiJingSpace({
    self_subject: {
      natal_inputs: validNatalInputs({ calculation_sex: 'female' }),
    },
    concern_tags: [tag],
  });
  const result = buildAstrologyFeatureSnapshot({
    mirror_kind: 'nianjing',
    mirror_scope: scope,
    space,
    related_person_refs: [],
    active_concern_tags: [tag],
  });

  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(
    result.value.nianjing_phase_drivers.some((driver) =>
      driver.driver_refs.some((ref) => ref.startsWith('cycle_baseline')),
    ),
    false,
  );
  assert.equal(
    result.value.nianjing_phase_drivers.some((driver) =>
      driver.start_date === scope.start_date &&
      driver.end_date === scope.end_date &&
      driver.nature === 'steady',
    ),
    false,
  );
});

test('generateYueJingOutput: produces cells for the scope start date only', () => {
  const scope = rolling30DayMirrorScope();
  const space = spaceWithActiveTag();
  const featureResult = buildAstrologyFeatureSnapshot({
    mirror_kind: 'yuejing',
    mirror_scope: scope,
    space,
    related_person_refs: [],
    active_concern_tags: space.concern_tags,
  });
  assert.equal(featureResult.ok, true);
  if (!featureResult.ok) return;
  const result = generateYueJingOutput({
    feature_snapshot: featureResult.value,
    mirror_scope: scope,
    active_concern_tags: space.concern_tags,
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.cells.length, space.concern_tags.length);
    assert.equal(result.value.cells[0].date, scope.start_date);
  }
});

test('canned valid runtime output drives the final mirror output', async () => {
  const space = spaceWithActiveTag();
  const today = new Date();
  const cannedGood = validRijingOutput();
  const ai = new MockRuntimeAiClient({ canned_output_by_kind: { rijing: cannedGood } });
  const result = await generateReading(
    {
      id: 'r_rijing_ai',
      created_at: today.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      mirror_kind: 'rijing',
      mirror_scope: dailyMirrorScope({
        date: today.toISOString().slice(0, 10),
        basis_time_zone: TZ,
      }),
      related_person_refs: [],
      concern_tag_refs: ['tag_love'],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space,
    },
    { runtime_ai_client: ai },
  );
  assert.equal(result.ok, true, JSON.stringify(result));
});

// Silence unused-symbol lint by referencing fixture outputs.
void validNianjingOutput;
void validShijingOutput;
void validYuejingOutput;
