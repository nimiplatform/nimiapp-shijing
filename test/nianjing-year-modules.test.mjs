import assert from 'node:assert/strict';
import test from 'node:test';

const output = {
  mirror_kind: 'nianjing',
  summary: 'long horizon',
  horizon: { start_date: '2026-01-01', end_date: '2027-12-31' },
  phase_bands: [
    {
      concern_tag_ref: 'tag_body',
      start_date: '2026-01-01',
      end_date: '2026-06-30',
      nature: 'supportive',
      driver_refs: ['bazi:period.2026a'],
      summary: 'body first half',
    },
    {
      concern_tag_ref: 'tag_body',
      start_date: '2026-07-01',
      end_date: '2027-02-28',
      nature: 'watch',
      driver_refs: ['bazi:period.2026b'],
      summary: 'body bridge',
    },
    {
      concern_tag_ref: 'tag_body',
      start_date: '2027-03-01',
      end_date: '2027-12-31',
      nature: 'steady',
      driver_refs: ['bazi:period.2027'],
      summary: 'body second year',
    },
    {
      concern_tag_ref: 'tag_family',
      start_date: '2026-01-01',
      end_date: '2027-12-31',
      nature: 'blocked',
      driver_refs: ['bazi:period.family'],
      summary: 'family long phase',
    },
  ],
  inflection_points: [
    {
      concern_tag_ref: 'tag_body',
      date: '2026-07-01',
      kind: 'annual_transition',
      driver_refs: ['bazi:annual_transition@2026'],
      summary: 'annual switch',
    },
    {
      concern_tag_ref: 'tag_body',
      date: '2027-03-01',
      kind: 'marker_cluster',
      driver_refs: ['bazi:cluster@2027'],
      summary: 'cluster',
    },
  ],
  cited_event_memory_refs: [],
  cited_plan_item_refs: [],
  citations: [{ method: 'bazi_ziping_v1', reference: 'fixture' }],
};

const activeTags = [
  { id: 'tag_body', label: '#Body', status: 'active' },
  { id: 'tag_family', label: '#Family', status: 'active' },
];

async function loadYearModules() {
  try {
    return await import('../src/product/tabs/nianjing/nianjing-year-modules.ts');
  } catch (error) {
    assert.fail(`expected nianjing-year-modules helper to exist: ${error.message}`);
  }
}

test('NianJing year modules derive year cells from phase bands and inflections', async () => {
  const { buildNianJingYearModules } = await loadYearModules();

  const modules = buildNianJingYearModules({
    output,
    active_concern_tags: activeTags,
    today: '2026-08-15',
  });

  assert.deepEqual(
    modules.map((module) => module.year),
    [2026, 2027],
  );
  assert.deepEqual(
    modules[0].cells.map((cell) => cell.concern_tag_ref),
    ['tag_body', 'tag_family'],
    'cell order follows active concern order',
  );

  const body2026 = modules[0].cells[0];
  assert.equal(body2026.primary_nature, 'watch');
  assert.deepEqual(
    {
      start_date: body2026.primary_segment?.start_date,
      end_date: body2026.primary_segment?.end_date,
      nature: body2026.primary_segment?.nature,
      is_current: body2026.primary_segment?.is_current,
    },
    {
      start_date: '2026-07-01',
      end_date: '2026-12-31',
      nature: 'watch',
      is_current: true,
    },
    'current clipped phase is the primary annual module segment',
  );
  assert.equal(body2026.is_current_year, true);
  assert.deepEqual(
    body2026.segments.map((segment) => ({
      start_date: segment.start_date,
      end_date: segment.end_date,
      nature: segment.nature,
      is_current: segment.is_current,
    })),
    [
      {
        start_date: '2026-01-01',
        end_date: '2026-06-30',
        nature: 'supportive',
        is_current: false,
      },
      {
        start_date: '2026-07-01',
        end_date: '2026-12-31',
        nature: 'watch',
        is_current: true,
      },
    ],
  );
  assert.deepEqual(
    body2026.inflections.map((inflection) => inflection.date),
    ['2026-07-01'],
  );

  const body2027 = modules[1].cells[0];
  assert.equal(body2027.primary_nature, 'steady');
  assert.deepEqual(
    {
      start_date: body2027.primary_segment?.start_date,
      end_date: body2027.primary_segment?.end_date,
      nature: body2027.primary_segment?.nature,
    },
    { start_date: '2027-03-01', end_date: '2027-12-31', nature: 'steady' },
    'longest clipped phase is the primary annual module segment when no current phase applies',
  );
  assert.deepEqual(
    body2027.segments.map((segment) => ({
      start_date: segment.start_date,
      end_date: segment.end_date,
      nature: segment.nature,
    })),
    [
      { start_date: '2027-01-01', end_date: '2027-02-28', nature: 'watch' },
      { start_date: '2027-03-01', end_date: '2027-12-31', nature: 'steady' },
    ],
  );
  assert.deepEqual(
    body2027.inflections.map((inflection) => inflection.kind),
    ['marker_cluster'],
  );
});

test('NianJing year modules do not introduce forbidden trend or score fields', async () => {
  const { buildNianJingYearModules } = await loadYearModules();

  const modules = buildNianJingYearModules({
    output,
    active_concern_tags: activeTags,
    today: '2026-08-15',
  });
  const serialized = JSON.stringify(modules);

  for (const forbidden of [
    'score',
    'luck_score',
    'trend_chart',
    'trend_curve',
    'numeric_series',
    'k_line',
  ]) {
    assert.equal(
      serialized.includes(forbidden),
      false,
      `year-module view model must not expose ${forbidden}`,
    );
  }
});
