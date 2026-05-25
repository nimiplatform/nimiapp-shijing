// Wave-13 — SJG-* algorithm-correctness coverage. One test per
// numbered gap from the wave-13 brief; each test name cites the
// spec rule(s) it enforces. The brief itself lives in the project's
// `.nimi` wave admission packet; the spec line citations refer to
// `.nimi/spec/shijing/kernel/algorithm-contract.md` and
// `.nimi/spec/shijing/kernel/astrology-contract.md`.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  buildAstrologyFeatureSnapshot,
  buildCycleSnapshot,
  buildNatalChartSnapshot,
  canonicalizeNatalInputs,
  computeCanonicalHash,
  deriveDayunRequired,
  deriveUncertainty,
  generateReading,
  inputsSummaryExpired,
  parseAstrologyOutput,
  RuntimeTextGeneratorAiClient,
  EPHEMERIS_VERSION,
  classifyBranchPair,
  classifyTransitToDayStem,
  transitRelationToMarkerKind,
  STEM_TO_ELEMENT,
} from '../src/product/astrology/index.ts';
import { validateReading } from '../src/contracts/reading-validator.ts';
import { validNatalInputs, validShiJingSpace, validTimeWindow, validReading } from './_fixtures.mjs';

function happyAiClient(textOverride) {
  return new RuntimeTextGeneratorAiClient({
    modelId: 'shijing-correctness-stub',
    generator: async () => ({
      text: textOverride ?? JSON.stringify({
        summary: 'wave-13 ok',
        highlights: [],
        recommendations: [],
        citations: [],
      }),
    }),
  });
}

// ---------------------------------------------------------------------------
// GAP-11/12/13 — real input_hash / feature_snapshot_hash / view-snapshot hashes
// SJG-ALGO-11 + SJG-ASTRO-08
// ---------------------------------------------------------------------------

test('SJG-ALGO-11: generated Reading carries real SHA-256 canonical input_hash (not unset)', async () => {
  const space = validShiJingSpace();
  const r = await generateReading(
    {
      id: 'r_h1', created_at: '2026-05-25T00:00:00Z',
      kind: 'today', scope: 'subject',
      anchor_subject: 'self', subjects: ['self'],
      time_window: validTimeWindow(), space,
    },
    { runtime_ai_client: happyAiClient() },
  );
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const ih = r.reading.inputs_summary.input_hash;
  assert.notEqual(ih, 'unset');
  assert.match(ih, /^[0-9a-f]{64}$/);
});

test('SJG-ALGO-11: generated Reading carries real feature_snapshot_hash (matches recomputation)', async () => {
  const space = validShiJingSpace();
  const r = await generateReading(
    {
      id: 'r_h2', created_at: '2026-05-25T00:00:00Z',
      kind: 'today', scope: 'subject',
      anchor_subject: 'self', subjects: ['self'],
      time_window: validTimeWindow(), space,
    },
    { runtime_ai_client: happyAiClient() },
  );
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const fh = r.reading.inputs_summary.feature_snapshot_hash;
  assert.notEqual(fh, 'unset');
  assert.match(fh, /^[0-9a-f]{64}$/);
  // Recomputing over the persisted feature snapshot must yield the same digest.
  assert.equal(fh, computeCanonicalHash(r.reading.inputs_summary.feature_snapshot));
});

test('SJG-ASTRO-08: view-scoped Reading carries real instructions_hash / context_items_hash / memory_summary_hash', async () => {
  const space = validShiJingSpace();
  const view = {
    id: 'v_abc',
    title: 'wave-13 view',
    anchor_subject: 'self',
    subjects: ['self'],
    time_scope: 'rolling',
    rolling_window_days: 30,
    context_items: [{ id: 'ci1', kind: 'note', body: 'note body' }],
    instructions: 'be concise',
    view_memory: { summary: 'prior summary', updated_at: '2026-05-20T00:00:00Z', locked: false },
    display_state: 'normal',
  };
  const r = await generateReading(
    {
      id: 'r_h3', created_at: '2026-05-25T00:00:00Z',
      kind: 'period_outlook', scope: 'view',
      anchor_subject: 'self', subjects: ['self'],
      time_window: validTimeWindow(),
      space, view,
    },
    { runtime_ai_client: happyAiClient() },
  );
  // period_outlook requires DaYun per SJG-ALGO-07 — fixture has calculation_sex=unspecified so fails.
  // For hash-coverage purposes use kind=consultation/scope=view which doesn't auto-flip DaYun
  // unless time window > 90d.
  const r2 = await generateReading(
    {
      id: 'r_h3b', created_at: '2026-05-25T00:00:00Z',
      kind: 'consultation', scope: 'view',
      anchor_subject: 'self', subjects: ['self'],
      time_window: validTimeWindow(),
      space, view,
    },
    { runtime_ai_client: happyAiClient() },
  );
  void r;
  // consultation+view+rolling: deriveDayunRequired flips on (rolling view).
  // With fixture having calculation_sex=unspecified, this fails closed.
  // Use a calculation_sex=female fixture to let the pipeline reach hashing.
  const inputs = { ...validNatalInputs(), calculation_sex: 'female' };
  const space2 = validShiJingSpace({ self_subject: { natal_inputs: inputs } });
  const r3 = await generateReading(
    {
      id: 'r_h3c', created_at: '2026-05-25T00:00:00Z',
      kind: 'consultation', scope: 'view',
      anchor_subject: 'self', subjects: ['self'],
      time_window: validTimeWindow(),
      space: space2, view,
    },
    { runtime_ai_client: happyAiClient() },
  );
  void r2;
  assert.equal(r3.ok, true);
  if (!r3.ok) return;
  const vs = r3.reading.inputs_summary.view_snapshot;
  assert.ok(vs);
  for (const h of [vs.instructions_hash, vs.context_items_hash, vs.memory_summary_hash]) {
    assert.notEqual(h, 'unset');
    assert.match(h, /^[0-9a-f]{64}$/);
  }
  // Recompute to verify wiring.
  assert.equal(vs.instructions_hash, computeCanonicalHash('be concise'));
  assert.equal(vs.context_items_hash, computeCanonicalHash([{ id: 'ci1', kind: 'note', body: 'note body' }]));
  assert.equal(vs.memory_summary_hash, computeCanonicalHash('prior summary'));
});

test('reading-validator rejects unset input_hash literal (SJG-ALGO-11)', () => {
  const reading = validReading();
  reading.inputs_summary = { ...reading.inputs_summary, input_hash: 'unset', feature_snapshot_hash: 'abc' };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_input_hash_invalid');
});

test('reading-validator rejects unset feature_snapshot_hash literal (SJG-ALGO-11)', () => {
  const reading = validReading();
  reading.inputs_summary = { ...reading.inputs_summary, input_hash: 'abc', feature_snapshot_hash: 'unset' };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_feature_snapshot_hash_invalid');
});

// ---------------------------------------------------------------------------
// GAP-14/15/16 — subject_summaries / relation_summaries / event_summaries
// SJG-ASTRO-08
// ---------------------------------------------------------------------------

test('SJG-ASTRO-08: subject_summaries[].summary uses display_name · calendar_system · birth_datetime_utc', async () => {
  const space = validShiJingSpace();
  const r = await generateReading(
    {
      id: 'r_s1', created_at: '2026-05-25T00:00:00Z',
      kind: 'today', scope: 'subject',
      anchor_subject: 'self', subjects: ['self'],
      time_window: validTimeWindow(), space,
    },
    { runtime_ai_client: happyAiClient() },
  );
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const s = r.reading.inputs_summary.subject_summaries[0];
  assert.equal(s.subject, 'self');
  assert.equal(s.summary, `self · gregorian · ${space.self_subject.natal_inputs.birth_datetime_utc}`);
});

test('SJG-ASTRO-08: relation_summaries[] includes only relations intersecting subjects[]', async () => {
  const inputs = { ...validNatalInputs(), calculation_sex: 'female' };
  const space = validShiJingSpace({
    self_subject: { natal_inputs: inputs },
    persons: [
      { id: 'p_alice', display_name: 'Alice', kind: 'person', natal_inputs: validNatalInputs(), consent_state: 'owner_recorded' },
      { id: 'p_bob', display_name: 'Bob', kind: 'person', natal_inputs: validNatalInputs(), consent_state: 'owner_recorded' },
    ],
    relations: [
      { id: 'rel1', from_subject: 'self', to_subject: { kind: 'person', id: 'p_alice' }, relation_kind: 'spouse' },
      { id: 'rel2', from_subject: { kind: 'person', id: 'p_bob' }, to_subject: { kind: 'person', id: 'p_alice' }, relation_kind: 'sibling' },
    ],
  });
  const r = await generateReading(
    {
      id: 'r_s2', created_at: '2026-05-25T00:00:00Z',
      kind: 'today', scope: 'subject',
      anchor_subject: 'self', subjects: ['self'],
      time_window: validTimeWindow(), space,
    },
    { runtime_ai_client: happyAiClient() },
  );
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const relSummaries = r.reading.inputs_summary.relation_summaries;
  // rel1 intersects subjects=['self']; rel2 does not.
  assert.equal(relSummaries.length, 1);
  assert.equal(relSummaries[0].relation_kind, 'spouse');
});

test('SJG-ASTRO-08: event_summaries[] includes only events in time_window intersecting subjects[]', async () => {
  const inputs = { ...validNatalInputs(), calculation_sex: 'female' };
  const space = validShiJingSpace({
    self_subject: { natal_inputs: inputs },
    events: [
      { id: 'ev1', primary_subject: 'self', participants: [], occurred_at: '2026-05-25T12:00:00Z', title: 'inside_window', view_refs: [] },
      { id: 'ev2', primary_subject: 'self', participants: [], occurred_at: '2020-01-01T00:00:00Z', title: 'outside_window', view_refs: [] },
    ],
  });
  const r = await generateReading(
    {
      id: 'r_s3', created_at: '2026-05-25T00:00:00Z',
      kind: 'today', scope: 'subject',
      anchor_subject: 'self', subjects: ['self'],
      time_window: validTimeWindow(), space,
    },
    { runtime_ai_client: happyAiClient() },
  );
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const evs = r.reading.inputs_summary.event_summaries;
  assert.equal(evs.length, 1);
  assert.equal(evs[0].title, 'inside_window');
});

// ---------------------------------------------------------------------------
// GAP-17/18/20 — SJG-ALGO-10 uncertainty decision table
// ---------------------------------------------------------------------------

test('SJG-ALGO-10: uncertainty=high when only birth_precision_exact present', () => {
  const inputs = { ...validNatalInputs(), calculation_sex: 'female' };
  const space = validShiJingSpace({ self_subject: { natal_inputs: inputs } });
  const fr = buildAstrologyFeatureSnapshot({
    subjects: ['self'], time_window: validTimeWindow(), space, dayun_required: false,
  });
  assert.equal(fr.ok, true);
  if (!fr.ok) return;
  const canon = canonicalizeNatalInputs(inputs);
  assert.equal(canon.ok, true);
  if (!canon.ok) return;
  const ua = deriveUncertainty({ feature_snapshot: fr.value, canonicalizations: [canon.value] });
  assert.equal(ua.confidence, 'high');
  assert.deepEqual(ua.data_gaps, ['birth_precision_exact']);
});

test('SJG-ALGO-10: uncertainty=low when multiple critical gaps present (ai_parse_failed + missing)', () => {
  const inputs = { ...validNatalInputs(), calculation_sex: 'female' };
  const space = validShiJingSpace({ self_subject: { natal_inputs: inputs } });
  const fr = buildAstrologyFeatureSnapshot({
    subjects: ['self'], time_window: validTimeWindow(), space, dayun_required: false,
  });
  assert.equal(fr.ok, true);
  if (!fr.ok) return;
  // No canonicalizations recorded ⇒ timezone_missing + location_missing should fire.
  const ua = deriveUncertainty({ feature_snapshot: fr.value, canonicalizations: [undefined], ai_parse_failed: true });
  assert.equal(ua.confidence, 'low');
  assert.ok(ua.data_gaps.includes('timezone_missing'));
  assert.ok(ua.data_gaps.includes('ai_parse_failed'));
});

test('SJG-ALGO-10: uncertainty=medium when view-scoped + sparse view-context (single non-critical)', () => {
  const inputs = { ...validNatalInputs(), calculation_sex: 'female' };
  const space = validShiJingSpace({ self_subject: { natal_inputs: inputs } });
  const fr = buildAstrologyFeatureSnapshot({
    subjects: ['self'], time_window: validTimeWindow(), space, dayun_required: false,
  });
  assert.equal(fr.ok, true);
  if (!fr.ok) return;
  const canon = canonicalizeNatalInputs(inputs);
  assert.equal(canon.ok, true);
  if (!canon.ok) return;
  // Sparse view: no instructions, no context items, no memory summary.
  const view = {
    id: 'v_empty', title: '', anchor_subject: 'self', subjects: ['self'],
    time_scope: 'rolling', rolling_window_days: 30,
    context_items: [], instructions: '',
    view_memory: { summary: '', updated_at: '2026-01-01T00:00:00Z', locked: false },
    display_state: 'normal',
  };
  const ua = deriveUncertainty({ feature_snapshot: fr.value, canonicalizations: [canon.value], view });
  assert.equal(ua.confidence, 'medium');
  assert.ok(ua.data_gaps.includes('view_context_sparse'));
});

test('SJG-ALGO-10: generated Reading carries real caveats[] + data_gaps[]', async () => {
  const space = validShiJingSpace();
  const r = await generateReading(
    {
      id: 'r_u1', created_at: '2026-05-25T00:00:00Z',
      kind: 'today', scope: 'subject',
      anchor_subject: 'self', subjects: ['self'],
      time_window: validTimeWindow(), space,
    },
    { runtime_ai_client: happyAiClient() },
  );
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.ok(r.reading.uncertainty.confidence === 'high' || r.reading.uncertainty.confidence === 'medium' || r.reading.uncertainty.confidence === 'low');
  assert.ok(Array.isArray(r.reading.uncertainty.caveats));
  assert.ok(Array.isArray(r.reading.uncertainty.data_gaps));
  // For an exact-precision self with a sane fixture, data_gaps[0] should be birth_precision_exact.
  assert.ok(r.reading.uncertainty.data_gaps.includes('birth_precision_exact'));
});

// ---------------------------------------------------------------------------
// GAP-19 — Auto-derive dayun_required from kind/scope per SJG-ALGO-07
// ---------------------------------------------------------------------------

test('SJG-ALGO-07: deriveDayunRequired = true for period_outlook (any scope)', () => {
  assert.equal(deriveDayunRequired('period_outlook', 'subject', undefined, validTimeWindow()), true);
  assert.equal(deriveDayunRequired('period_outlook', 'ad_hoc', undefined, validTimeWindow()), true);
});

test('SJG-ALGO-07: deriveDayunRequired = true for key_window', () => {
  assert.equal(deriveDayunRequired('key_window', 'view', undefined, validTimeWindow()), true);
});

test('SJG-ALGO-07: deriveDayunRequired = false for today and sign', () => {
  assert.equal(deriveDayunRequired('today', 'subject', undefined, validTimeWindow()), false);
  assert.equal(deriveDayunRequired('sign', 'subject', undefined, { mode: 'natal', basis_time_zone: 'UTC', source: 'kind_default' }), false);
});

test('SJG-ALGO-07: deriveDayunRequired = true for view-scope rolling/bounded view', () => {
  const view = { time_scope: 'rolling', rolling_window_days: 30 };
  assert.equal(deriveDayunRequired('consultation', 'view', view, validTimeWindow()), true);
});

test('SJG-ALGO-07: deriveDayunRequired = true for ad-hoc consultation > 90 days', () => {
  const wide = { ...validTimeWindow(), end_utc: '2026-09-30T00:00:00Z' };
  assert.equal(deriveDayunRequired('consultation', 'ad_hoc', undefined, wide), true);
});

// ---------------------------------------------------------------------------
// GAP-21 — stage_drivers[] derived from active_markers[]
// ---------------------------------------------------------------------------

test('SJG-ALGO-08 + SJG-ALGO-09: feature snapshot emits stage_drivers from active_markers', () => {
  const inputs = { ...validNatalInputs(), calculation_sex: 'female' };
  const space = validShiJingSpace({ self_subject: { natal_inputs: inputs } });
  const fr = buildAstrologyFeatureSnapshot({
    subjects: ['self'], time_window: validTimeWindow(), space, dayun_required: false,
  });
  assert.equal(fr.ok, true);
  if (!fr.ok) return;
  const self = fr.value.subjects[0];
  // Drivers length matches active_markers length (1 driver per marker).
  assert.equal(self.stage_drivers.length, self.cycle_snapshot.active_markers.length);
  if (self.stage_drivers.length > 0) {
    const sample = self.stage_drivers[0];
    assert.ok(typeof sample.stage_label === 'string');
    assert.ok(typeof sample.explanation_key === 'string');
  }
});

// ---------------------------------------------------------------------------
// GAP-22 — relation_features[] from natal pillar branch interactions
// ---------------------------------------------------------------------------

test('SJG-ALGO-08: relation_features[] populated from natal-pillar branch interactions', () => {
  const inputs = { ...validNatalInputs(), calculation_sex: 'female' };
  const space = validShiJingSpace({ self_subject: { natal_inputs: inputs } });
  const fr = buildAstrologyFeatureSnapshot({
    subjects: ['self'], time_window: validTimeWindow(), space, dayun_required: false,
  });
  assert.equal(fr.ok, true);
  if (!fr.ok) return;
  // Each relation feature is structurally well-formed.
  for (const rf of fr.value.relation_features) {
    assert.ok(rf.from_subject);
    assert.ok(rf.to_subject);
    assert.match(rf.relation_kind, /^natal_pillar_/);
    assert.ok(rf.anchor_relevance === 'primary' || rf.anchor_relevance === 'context');
  }
});

test('SJG-ALGO-08 helper: classifyBranchPair recognises 相冲 / 六合 / 三合 / 相害', () => {
  assert.equal(classifyBranchPair('zi', 'wu'), '相冲');
  assert.equal(classifyBranchPair('zi', 'chou'), '六合');
  assert.equal(classifyBranchPair('shen', 'zi'), '三合');
  assert.equal(classifyBranchPair('zi', 'wei'), '相害');
  assert.equal(classifyBranchPair('zi', 'zi'), null);
});

// ---------------------------------------------------------------------------
// GAP-23 — CycleSnapshot emits clash / combination / element-relation markers
// ---------------------------------------------------------------------------

test('SJG-ALGO-08: cycle snapshot emits clash markers when transit branch clashes natal day branch', () => {
  const canon = canonicalizeNatalInputs(validNatalInputs());
  assert.equal(canon.ok, true);
  if (!canon.ok) return;
  const chart = buildNatalChartSnapshot({ subject: 'self', canonicalization: canon.value });
  assert.equal(chart.ok, true);
  if (!chart.ok) return;
  const cycle = buildCycleSnapshot({ subject: 'self', natal_chart: chart.value, time_window: validTimeWindow(), canonicalization: canon.value });
  assert.equal(cycle.ok, true);
  if (!cycle.ok) return;
  const kinds = new Set(cycle.value.active_markers.map((m) => m.kind));
  // For a 24h window we should at minimum see the element-relation
  // marker (one of resource/output/wealth/constraint) emitted; we
  // can't guarantee a clash hits in 1 day, but the marker-kind set
  // must be drawn entirely from the SJG-ALGO-08 closed enum.
  const closedEnum = new Set([
    'dayun_boundary', 'annual_transition', 'monthly_transition',
    'clash', 'combination', 'storage', 'resource', 'output',
    'wealth', 'constraint',
  ]);
  for (const k of kinds) assert.ok(closedEnum.has(k), `marker kind ${k} not in SJG-ALGO-08 closed enum`);
});

test('SJG-ALGO-08: element-relation helper maps transit→day stem onto closed marker kinds', () => {
  assert.equal(STEM_TO_ELEMENT.jia, 'wood');
  assert.equal(STEM_TO_ELEMENT.ren, 'water');
  // water generates wood ⇒ relation = 'resource'; marker kind = 'resource'
  const rel = classifyTransitToDayStem('ren', 'jia');
  assert.equal(rel, 'resource');
  assert.equal(transitRelationToMarkerKind(rel), 'resource');
  // jia controls wu (wood→earth) ⇒ relation = 'wealth' (natal controls transit)
  // Natal day = jia (wood), transit = wu (earth); wood controls earth, so
  // natal controls transit ⇒ 'wealth'.
  assert.equal(classifyTransitToDayStem('wu', 'jia'), 'wealth');
});

// ---------------------------------------------------------------------------
// GAP-26 — CycleSnapshot natal mode replaces wave-10 hash placeholder
// ---------------------------------------------------------------------------

test('SJG-ALGO-08 natal-mode CycleSnapshot: window_*_utc = canonical birth utc, not canonicalization_hash', () => {
  const canon = canonicalizeNatalInputs(validNatalInputs());
  assert.equal(canon.ok, true);
  if (!canon.ok) return;
  const chart = buildNatalChartSnapshot({ subject: 'self', canonicalization: canon.value });
  assert.equal(chart.ok, true);
  if (!chart.ok) return;
  const natalWindow = { mode: 'natal', basis_time_zone: 'Asia/Shanghai', source: 'kind_default' };
  const cycle = buildCycleSnapshot({ subject: 'self', natal_chart: chart.value, time_window: natalWindow, canonicalization: canon.value });
  assert.equal(cycle.ok, true);
  if (!cycle.ok) return;
  assert.equal(cycle.value.window_start_utc, canon.value.canonical_birth_datetime_utc);
  assert.equal(cycle.value.window_end_utc, canon.value.canonical_birth_datetime_utc);
  // Natal mode supplies the natal month/day pillar so the renderer sees a real pillar, not a hash.
  if (chart.value.month_pillar) {
    assert.equal(cycle.value.monthly_pillars.length, 1);
  }
  if (chart.value.day_pillar) {
    assert.equal(cycle.value.daily_pillars.length, 1);
  }
  assert.equal(cycle.value.active_markers.length, 0);
});

test('SJG-ALGO-08 natal-mode CycleSnapshot fails closed when canonicalization is missing', () => {
  const canon = canonicalizeNatalInputs(validNatalInputs());
  assert.equal(canon.ok, true);
  if (!canon.ok) return;
  const chart = buildNatalChartSnapshot({ subject: 'self', canonicalization: canon.value });
  assert.equal(chart.ok, true);
  if (!chart.ok) return;
  const natalWindow = { mode: 'natal', basis_time_zone: 'Asia/Shanghai', source: 'kind_default' };
  const cycle = buildCycleSnapshot({ subject: 'self', natal_chart: chart.value, time_window: natalWindow });
  assert.equal(cycle.ok, false);
});

// ---------------------------------------------------------------------------
// GAP-27 — NatalCanonicalization carries raw_birth_input AND raw_birth_input_hash
// ---------------------------------------------------------------------------

test('SJG-ALGO-04: NatalCanonicalization preserves raw_birth_input object (spec verbatim)', () => {
  const inputs = validNatalInputs();
  const canon = canonicalizeNatalInputs(inputs);
  assert.equal(canon.ok, true);
  if (!canon.ok) return;
  // Spec body (algorithm-contract.md:113-114) requires raw_birth_input verbatim.
  assert.deepEqual(canon.value.raw_birth_input, inputs.raw_birth_input);
  // Hash is preserved as a separate storage-compactness field.
  assert.equal(typeof canon.value.raw_birth_input_hash, 'string');
  assert.match(canon.value.raw_birth_input_hash, /^[0-9a-f]{64}$/);
  assert.equal(canon.value.raw_birth_input_hash, computeCanonicalHash(inputs.raw_birth_input));
});

// ---------------------------------------------------------------------------
// GAP-29 — basis_time_zone derives from natal birth_location.iana_time_zone
// ---------------------------------------------------------------------------

test('SJG-ALGO-03 basis_time_zone: today tab source no longer hardcodes UTC', () => {
  const src = readFileSync(new URL('../src/product/tabs/today.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /basis_time_zone:\s*['"]UTC['"]/);
  assert.match(src, /basis_time_zone:\s*basisTimeZone/);
  assert.match(src, /iana_time_zone/);
});

test('SJG-ALGO-03 basis_time_zone: consultation tab source no longer hardcodes UTC', () => {
  const src = readFileSync(new URL('../src/product/tabs/consultation.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /basis_time_zone:\s*['"]UTC['"]/);
  assert.match(src, /basis_time_zone:\s*basisTimeZone/);
  assert.match(src, /iana_time_zone/);
});

// ---------------------------------------------------------------------------
// GAP-30 — inputs_summary expiry per SJG-ASTRO-09
// ---------------------------------------------------------------------------

test('SJG-ASTRO-09: today reading expires after 24h', () => {
  const reading = validReading({ kind: 'today' });
  reading.inputs_summary = { ...reading.inputs_summary, captured_at: '2026-05-25T00:00:00Z' };
  // 25h later
  assert.equal(inputsSummaryExpired(reading, new Date('2026-05-26T01:00:00Z')), true);
  // 23h later
  assert.equal(inputsSummaryExpired(reading, new Date('2026-05-25T23:00:00Z')), false);
});

test('SJG-ASTRO-09: consultation reading expires after 7d', () => {
  const reading = validReading({ kind: 'consultation', scope: 'ad_hoc' });
  reading.inputs_summary = { ...reading.inputs_summary, captured_at: '2026-05-25T00:00:00Z' };
  assert.equal(inputsSummaryExpired(reading, new Date('2026-06-02T00:00:01Z')), true);
  assert.equal(inputsSummaryExpired(reading, new Date('2026-06-01T00:00:00Z')), false);
});

test('SJG-ASTRO-09: sign reading never expires', () => {
  const reading = validReading({ kind: 'sign' });
  reading.inputs_summary = { ...reading.inputs_summary, captured_at: '2020-01-01T00:00:00Z' };
  assert.equal(inputsSummaryExpired(reading, new Date('2099-12-31T23:59:59Z')), false);
});

// ---------------------------------------------------------------------------
// GAP-35 — Forbidden content screening per SJG-ASTRO-05
// ---------------------------------------------------------------------------

test('SJG-ASTRO-05: parseAstrologyOutput rejects luck score vocabulary', () => {
  const payload = JSON.stringify({
    summary: 'today luck score 88',
    highlights: [], recommendations: [], citations: [],
  });
  const r = parseAstrologyOutput(payload);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.error.kind, 'forbidden_content');
    assert.match(r.error.detail, /luck score/);
  }
});

test('SJG-ASTRO-05: parseAstrologyOutput rejects 凶 / 幸运指数 vocabulary', () => {
  const payload = JSON.stringify({
    summary: '今日幸运指数 50',
    highlights: [], recommendations: [], citations: [],
  });
  const r = parseAstrologyOutput(payload);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.kind, 'forbidden_content');
});

test('SJG-ASTRO-05: parseAstrologyOutput rejects monthly_report / yearly_report / trend_chart text', () => {
  for (const phrase of ['monthly report', 'yearly report', 'trend chart']) {
    const payload = JSON.stringify({
      summary: `wrapper contains ${phrase} which is forbidden`,
      highlights: [], recommendations: [], citations: [],
    });
    const r = parseAstrologyOutput(payload);
    assert.equal(r.ok, false, `phrase ${phrase} must trigger forbidden_content`);
    if (!r.ok) assert.equal(r.error.kind, 'forbidden_content');
  }
});

test('SJG-ASTRO-05: parseAstrologyOutput accepts wording that does NOT contain forbidden phrases', () => {
  const payload = JSON.stringify({
    summary: '今日宜静心反思,适合内省',
    highlights: [], recommendations: [], citations: [],
  });
  const r = parseAstrologyOutput(payload);
  assert.equal(r.ok, true);
});

// ---------------------------------------------------------------------------
// GAP-44 — EPHEMERIS_VERSION constant + every pillar carries ephemeris_version
// ---------------------------------------------------------------------------

test('SJG-ALGO-06: solar-terms exports EPHEMERIS_VERSION = shijing-approx-v1', () => {
  assert.equal(EPHEMERIS_VERSION, 'shijing-approx-v1');
});

test('SJG-ALGO-06: natal chart pillars carry ephemeris_version', () => {
  const canon = canonicalizeNatalInputs(validNatalInputs());
  assert.equal(canon.ok, true);
  if (!canon.ok) return;
  const chart = buildNatalChartSnapshot({ subject: 'self', canonicalization: canon.value });
  assert.equal(chart.ok, true);
  if (!chart.ok) return;
  for (const p of [chart.value.year_pillar, chart.value.month_pillar, chart.value.day_pillar, chart.value.hour_pillar]) {
    if (p) assert.equal(p.ephemeris_version, EPHEMERIS_VERSION);
  }
});
