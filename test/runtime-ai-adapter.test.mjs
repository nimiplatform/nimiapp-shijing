// SJG-ASTRO-11 + SJG-ALGO-13 — Runtime AI boundary tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseRuntimeAiOutput } from '../src/product/astrology/runtime-ai-parse.ts';
import { applyRuntimeAiWordingText } from '../src/product/astrology/runtime-ai-wording-text.ts';
import {
  rolling30DayMirrorScope,
  validMingjingRelationshipOutput,
  validRijingOutput,
  validYuejingOutput,
} from './_fixtures.mjs';
import { MockRuntimeAiClient } from './_mock-runtime-ai-client.mjs';

const TZ = 'Asia/Shanghai';

function clientReturningText(text) {
  return {
    async generate(mirrorKind, request) {
      return applyRuntimeAiWordingText(mirrorKind, request, text);
    },
  };
}

function minimalPromptRequest() {
  return {
    mirror_kind: 'rijing',
    system_prompt: 'system contract',
    user_prompt: 'user contract',
    schema_name: 'shijing.runtime_ai_wording_patch.rijing.v1',
    deterministic_output: validRijingOutput(),
  };
}

function yuejingPromptRequest() {
  const scope = rolling30DayMirrorScope({
    start_date: '2026-06-03',
    end_date: '2026-07-02',
    basis_time_zone: TZ,
  });
  return {
    mirror_kind: 'yuejing',
    system_prompt: 'system contract',
    user_prompt: 'user contract',
    schema_name: 'shijing.runtime_ai_wording_patch.yuejing.v1',
    deterministic_output: validYuejingOutput(scope, {
      cells: [
        {
          date: '2026-06-03',
          concern_tag_ref: 'tag_love',
          tendency_class: 'turning',
          summary: '#姻缘: 变化转折, 依据 domain.love / daily_relation.output@2026-06-03',
        },
        {
          date: '2026-06-03',
          concern_tag_ref: 'tag_career',
          tendency_class: 'watch',
          summary: '#事业: 需要观察, 依据 domain.career / daily_relation.output@2026-06-03',
        },
      ],
    }),
  };
}

function mingjingRelationshipPatch(overrides = {}) {
  return {
    patch_kind: 'shijing.runtime_ai_wording_patch.v1',
    mirror_kind: 'mingjing',
    output_kind: 'relationship_hepan',
    summary: 'Runtime refined relationship structure.',
    structure: {
      baseline_pattern: 'Runtime baseline wording.',
      attraction_and_support: 'Runtime support wording.',
      friction_and_misread: 'Runtime friction wording.',
      communication_rhythm: 'Runtime rhythm wording.',
      boundary_advice: 'Runtime boundary wording.',
    },
    timing_windows: [
      {
        start_date: '2026-03-01',
        end_date: '2026-04-15',
        summary: 'Runtime timing wording.',
      },
    ],
    practice: {
      communication: 'Runtime communication practice.',
      boundary: 'Runtime boundary practice.',
      repair: 'Runtime repair practice.',
    },
    ...overrides,
  };
}

function mingjingRelationshipPromptRequest(output = validMingjingRelationshipOutput()) {
  return {
    mirror_kind: 'mingjing',
    system_prompt: 'system contract',
    user_prompt: 'user contract',
    schema_name: 'shijing.runtime_ai_wording_patch.mingjing.v1',
    deterministic_output: output,
  };
}

function rijingPatch(overrides = {}) {
  return {
    patch_kind: 'shijing.runtime_ai_wording_patch.v1',
    mirror_kind: 'rijing',
    summary: 'Runtime refined day.',
    daily_overview: 'Runtime refined overview.',
    concern_projections: [
      {
        concern_tag_ref: 'tag_love',
        summary: 'Runtime refined connection.',
        recommendations: ['Runtime recommendation.'],
      },
    ],
    ...overrides,
  };
}

test('parseRuntimeAiOutput accepts valid rijing JSON', () => {
  const output = validRijingOutput();
  const result = parseRuntimeAiOutput('rijing', JSON.stringify(output));
  assert.equal(result.ok, true);
});

test('parseRuntimeAiOutput rejects invalid JSON', () => {
  const result = parseRuntimeAiOutput('rijing', 'not json');
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.kind, 'invalid_json');
});

test('parseRuntimeAiOutput rejects mirror_kind mismatch', () => {
  const output = validRijingOutput();
  const result = parseRuntimeAiOutput('yuejing', JSON.stringify(output));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.kind, 'mirror_kind_mismatch');
});

test('parseRuntimeAiOutput rejects forbidden field (luck_score)', () => {
  const output = { ...validRijingOutput(), luck_score: 50 };
  const result = parseRuntimeAiOutput('rijing', JSON.stringify(output));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.kind, 'validation_failed');
});

test('parseRuntimeAiOutput rejects markdown / prose-only', () => {
  const result = parseRuntimeAiOutput('rijing', '# heading\nbody');
  assert.equal(result.ok, false);
});

test('MockRuntimeAiClient returns canned output when configured', async () => {
  const client = new MockRuntimeAiClient({
    canned_output_by_kind: { rijing: validRijingOutput() },
  });
  const result = await client.generate('rijing', {
    mirror_kind: 'rijing',
    system_prompt: '',
    user_prompt: '',
    schema_name: 'shijing.mirror_output.rijing.v1',
  });
  assert.equal(result.ok, true);
});

test('MockRuntimeAiClient surfaces canned failure when configured', async () => {
  const client = new MockRuntimeAiClient({
    canned_failure: { kind: 'runtime_unavailable', detail: 'forced failure' },
  });
  const result = await client.generate('rijing', {
    mirror_kind: 'rijing',
    system_prompt: '',
    user_prompt: '',
    schema_name: 'shijing.mirror_output.rijing.v1',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.kind, 'runtime_unavailable');
});

test('Runtime AI wording application uses SDK structured output extraction for fenced JSON', async () => {
  const fenced = `\`\`\`json\n${JSON.stringify(rijingPatch())}\n\`\`\``;
  const client = clientReturningText(fenced);
  const result = await client.generate('rijing', minimalPromptRequest());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.output.mirror_kind, 'rijing');
    assert.equal(result.output.summary, 'Runtime refined day.');
  }
});

test('Runtime AI wording application accepts the first complete wording patch when Runtime appends trailing JSON', async () => {
  const raw = `${JSON.stringify(rijingPatch())}\n{"diagnostic":"provider appended metadata"}`;
  const client = clientReturningText(raw);
  const result = await client.generate('rijing', minimalPromptRequest());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.output.mirror_kind, 'rijing');
    assert.equal(result.output.summary, 'Runtime refined day.');
  }
});

test('Runtime AI wording application fails closed when wording patch violates ShiJing target identity', async () => {
  const client = clientReturningText(JSON.stringify({ ...rijingPatch(), mirror_kind: 'yuejing' }));
  const result = await client.generate('rijing', minimalPromptRequest());
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'mirror_kind_mismatch');
  }
});

test('Runtime AI wording application preserves deterministic recommendations when wording patch omits them', async () => {
  const patch = {
    ...rijingPatch(),
    concern_projections: [
      {
        concern_tag_ref: 'tag_love',
        summary: 'Runtime refined connection without recommendations.',
      },
    ],
  };
  const client = clientReturningText(JSON.stringify(patch));
  const result = await client.generate('rijing', minimalPromptRequest());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.output.concern_projections[0].recommendations, ['Listen first.']);
    assert.equal(
      result.output.concern_projections[0].summary,
      'Runtime refined connection without recommendations.',
    );
  }
});

test('Runtime AI wording application fails closed when YueJing wording duplicates same-date concern summaries', async () => {
  const patch = {
    patch_kind: 'shijing.runtime_ai_wording_patch.v1',
    mirror_kind: 'yuejing',
    cells: [
      {
        date: '2026-06-03',
        concern_tag_ref: 'tag_love',
        summary: '今日适合稳定推进。',
      },
      {
        date: '2026-06-03',
        concern_tag_ref: 'tag_career',
        summary: '今日适合稳定推进。',
      },
    ],
  };
  const client = clientReturningText(JSON.stringify(patch));
  const result = await client.generate('yuejing', yuejingPromptRequest());
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'validation_failed');
    assert.equal(result.failure.failure.detail, 'yuejing_cell_summary_duplicate_for_date');
  }
});

test('Runtime AI wording application applies MingJing relationship wording patch while preserving deterministic fields', async () => {
  const base = validMingjingRelationshipOutput({
    cited_event_memory_refs: ['mem_relationship'],
    cited_plan_item_refs: ['plan_relationship'],
  });
  const client = clientReturningText(JSON.stringify(mingjingRelationshipPatch()));
  const result = await client.generate('mingjing', mingjingRelationshipPromptRequest(base));

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.output.summary, 'Runtime refined relationship structure.');
  assert.equal(result.output.structure.baseline_pattern, 'Runtime baseline wording.');
  assert.equal(result.output.structure.attraction_and_support, 'Runtime support wording.');
  assert.equal(result.output.structure.friction_and_misread, 'Runtime friction wording.');
  assert.equal(result.output.structure.communication_rhythm, 'Runtime rhythm wording.');
  assert.equal(result.output.structure.boundary_advice, 'Runtime boundary wording.');
  assert.equal(result.output.timing_windows[0].summary, 'Runtime timing wording.');
  assert.equal(result.output.practice.communication, 'Runtime communication practice.');
  assert.equal(result.output.practice.boundary, 'Runtime boundary practice.');
  assert.equal(result.output.practice.repair, 'Runtime repair practice.');
  assert.deepEqual(result.output.relationship_subject, base.relationship_subject);
  assert.equal(result.output.timing_windows[0].nature, base.timing_windows[0].nature);
  assert.deepEqual(result.output.timing_windows[0].driver_refs, base.timing_windows[0].driver_refs);
  assert.deepEqual(result.output.citations, base.citations);
  assert.deepEqual(result.output.cited_event_memory_refs, ['mem_relationship']);
  assert.deepEqual(result.output.cited_plan_item_refs, ['plan_relationship']);
});

test('Runtime AI wording application rejects MingJing relationship patches that include deterministic fields', async () => {
  const cases = [
    {
      name: 'relationship_subject',
      patch: mingjingRelationshipPatch({
        relationship_subject: {
          primary_subject_ref: 'self',
          related_person_ref: { kind: 'person', id: 'p_alice' },
          anchor_year: 2026,
          basis_time_zone: TZ,
        },
      }),
      detail: 'mingjing_relationship_patch_forbidden_key:relationship_subject',
    },
    {
      name: 'citations',
      patch: mingjingRelationshipPatch({
        citations: [{ method: 'bazi_ziping_v1', reference: 'forbidden' }],
      }),
      detail: 'mingjing_relationship_patch_forbidden_key:citations',
    },
    {
      name: 'timing driver_refs',
      patch: mingjingRelationshipPatch({
        timing_windows: [
          {
            start_date: '2026-03-01',
            end_date: '2026-04-15',
            driver_refs: ['runtime:forbidden'],
            summary: 'Runtime timing wording.',
          },
        ],
      }),
      detail: 'mingjing_relationship_timing_window_forbidden_key:driver_refs',
    },
  ];

  for (const item of cases) {
    const client = clientReturningText(JSON.stringify(item.patch));
    const result = await client.generate('mingjing', mingjingRelationshipPromptRequest());

    assert.equal(result.ok, false, item.name);
    if (result.ok) continue;
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'validation_failed');
    assert.equal(result.failure.failure.detail, item.detail);
  }
});

test('Runtime AI wording application rejects MingJing relationship patch with unknown timing window target', async () => {
  const patch = mingjingRelationshipPatch({
    timing_windows: [
      {
        start_date: '2026-05-01',
        end_date: '2026-05-31',
        summary: 'Runtime timing wording for an unknown window.',
      },
    ],
  });
  const client = clientReturningText(JSON.stringify(patch));
  const result = await client.generate('mingjing', mingjingRelationshipPromptRequest());

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'validation_failed');
    assert.equal(result.failure.failure.detail, 'mingjing_relationship_timing_window_target_unknown');
  }
});

test('Runtime AI wording application rejects incomplete MingJing relationship wording patches', async () => {
  const cases = [
    {
      name: 'summary only',
      patch: {
        patch_kind: 'shijing.runtime_ai_wording_patch.v1',
        mirror_kind: 'mingjing',
        output_kind: 'relationship_hepan',
        summary: 'Only a summary is not a complete relationship reading.',
      },
      detail: 'mingjing_relationship_structure_required',
    },
    {
      name: 'missing practice',
      patch: {
        ...mingjingRelationshipPatch(),
        practice: {
          communication: 'Runtime communication practice.',
          boundary: 'Runtime boundary practice.',
        },
      },
      detail: 'repair_empty',
    },
    {
      name: 'missing timing window',
      patch: {
        ...mingjingRelationshipPatch(),
        timing_windows: [],
      },
      detail: 'mingjing_relationship_timing_windows_required',
    },
  ];

  for (const item of cases) {
    const client = clientReturningText(JSON.stringify(item.patch));
    const result = await client.generate('mingjing', mingjingRelationshipPromptRequest());

    assert.equal(result.ok, false, item.name);
    if (result.ok) continue;
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'validation_failed');
    assert.equal(result.failure.failure.detail, item.detail);
  }
});
