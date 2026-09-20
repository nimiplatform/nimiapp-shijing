// SJG-ASTRO-11 + SJG-ALGO-13 — Runtime AI boundary tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseRuntimeAiOutput } from '../src/product/astrology/runtime-ai-parse.ts';
import { applyRuntimeAiWordingText } from '../src/product/astrology/runtime-ai-wording-text.ts';
import { validateMirrorOutput } from '../src/contracts/mirror-output-validator.ts';
import {
  rolling30DayMirrorScope,
  validMingjingRelationshipOutput,
  validMingjingRelationshipOutputUnavailableRecent,
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

function mingjingRelationshipPatternPatch(pattern, overrides = {}) {
  return {
    pattern_id: pattern.pattern_id,
    name: 'Runtime pattern name.',
    self_tendency: 'Runtime self tendency.',
    related_tendency: 'Runtime related tendency.',
    scenario: 'Runtime scenario.',
    aligned_expression: 'Runtime aligned expression.',
    friction_expression: 'Runtime friction expression.',
    signals: ['Runtime signal one.'],
    ...overrides,
  };
}

function mingjingRelationshipPatch(overrides = {}) {
  const base = validMingjingRelationshipOutput();
  return {
    patch_kind: 'shijing.runtime_ai_wording_patch.v1',
    mirror_kind: 'mingjing',
    output_kind: 'relationship_hepan',
    overview: {
      title: 'Runtime overview title.',
      summary: 'Runtime overview summary.',
      keywords: ['runtime', 'overview'],
    },
    patterns: base.patterns.map((pattern) => mingjingRelationshipPatternPatch(pattern)),
    recent_status: { window: { summary: 'Runtime recent window summary.' } },
    action: {
      situation: 'Runtime action situation.',
      step: 'Runtime action step.',
      example_phrase: 'Runtime example phrase.',
      rationale: 'Runtime action rationale.',
      observation: 'Runtime action observation.',
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
  assert.equal(result.output.overview.title, 'Runtime overview title.');
  assert.equal(result.output.overview.summary, 'Runtime overview summary.');
  assert.deepEqual(result.output.overview.keywords, ['runtime', 'overview']);
  assert.equal(result.output.patterns.length, base.patterns.length);
  for (let i = 0; i < base.patterns.length; i += 1) {
    const patched = result.output.patterns[i];
    assert.equal(patched.name, 'Runtime pattern name.');
    assert.equal(patched.pattern_id, base.patterns[i].pattern_id);
    assert.equal(patched.rule_ref, base.patterns[i].rule_ref);
    assert.equal(patched.rank, base.patterns[i].rank);
    assert.deepEqual(patched.driver_refs, base.patterns[i].driver_refs);
    assert.equal(patched.evidence_summary, base.patterns[i].evidence_summary);
  }
  assert.equal(result.output.recent_status.availability, 'available');
  assert.equal(result.output.recent_status.window.summary, 'Runtime recent window summary.');
  assert.equal(result.output.recent_status.window.nature, base.recent_status.window.nature);
  assert.deepEqual(result.output.recent_status.window.driver_refs, base.recent_status.window.driver_refs);
  assert.deepEqual(result.output.action.target, base.action.target);
  assert.equal(result.output.action.step, 'Runtime action step.');
  assert.deepEqual(result.output.relationship_subject, base.relationship_subject);
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
      name: 'pattern driver_refs',
      patch: mingjingRelationshipPatch({
        patterns: validMingjingRelationshipOutput().patterns.map((pattern) =>
          mingjingRelationshipPatternPatch(pattern, { driver_refs: ['runtime:forbidden'] })
        ),
      }),
      detail: 'mingjing_relationship_pattern_forbidden_key:driver_refs',
    },
    {
      name: 'action target',
      patch: mingjingRelationshipPatch({
        action: {
          ...mingjingRelationshipPatch().action,
          target: { kind: 'recent_window' },
        },
      }),
      detail: 'mingjing_relationship_action_forbidden_key:target',
    },
    {
      name: 'recent window nature',
      patch: mingjingRelationshipPatch({
        recent_status: { window: { summary: 'Runtime summary.', nature: 'steady' } },
      }),
      detail: 'mingjing_relationship_recent_window_forbidden_key:nature',
    },
  ];

  for (const item of cases) {
    const client = clientReturningText(JSON.stringify(item.patch));
    const result = await client.generate('mingjing', mingjingRelationshipPromptRequest());

    assert.equal(result.ok, false, item.name);
    if (result.ok) continue;
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'validation_failed');
    assert.equal(result.failure.failure.detail, item.detail, item.name);
  }
});

test('Runtime AI wording application rejects MingJing relationship patch with unknown or missing pattern targets', async () => {
  const cases = [
    {
      name: 'unknown pattern_id',
      patch: mingjingRelationshipPatch({
        patterns: [
          ...mingjingRelationshipPatch().patterns,
          mingjingRelationshipPatternPatch({ pattern_id: 'bazi_ziping_v1.hepan.invented_rule' }),
        ],
      }),
      detail: 'mingjing_relationship_pattern_target_unknown',
    },
    {
      name: 'missing pattern entry',
      patch: mingjingRelationshipPatch({
        patterns: mingjingRelationshipPatch().patterns.slice(1),
      }),
      detail: 'mingjing_relationship_pattern_target_missing',
    },
    {
      name: 'duplicate pattern_id',
      patch: mingjingRelationshipPatch({
        patterns: [
          ...mingjingRelationshipPatch().patterns,
          mingjingRelationshipPatch().patterns[0],
        ],
      }),
      detail: 'mingjing_relationship_pattern_target_duplicate',
    },
  ];

  for (const item of cases) {
    const client = clientReturningText(JSON.stringify(item.patch));
    const result = await client.generate('mingjing', mingjingRelationshipPromptRequest());

    assert.equal(result.ok, false, item.name);
    if (result.ok) continue;
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'validation_failed');
    assert.equal(result.failure.failure.detail, item.detail, item.name);
  }
});

test('Runtime AI wording application rejects MingJing relationship recent window patch when deterministic status is unavailable', async () => {
  const base = validMingjingRelationshipOutputUnavailableRecent();
  const patch = mingjingRelationshipPatch({
    recent_status: { window: { summary: 'Runtime summary for a window that does not exist.' } },
  });
  const client = clientReturningText(JSON.stringify(patch));
  const result = await client.generate('mingjing', mingjingRelationshipPromptRequest(base));

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'validation_failed');
    assert.equal(result.failure.failure.detail, 'mingjing_relationship_recent_window_patch_forbidden');
  }
});

test('Runtime AI wording application requires the recent window summary when deterministic status is available', async () => {
  const patch = mingjingRelationshipPatch();
  delete patch.recent_status;
  const client = clientReturningText(JSON.stringify(patch));
  const result = await client.generate('mingjing', mingjingRelationshipPromptRequest());

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'validation_failed');
    assert.equal(result.failure.failure.detail, 'mingjing_relationship_recent_window_patch_missing');
  }
});

test('Runtime AI wording application rejects incomplete MingJing relationship wording patches', async () => {
  const cases = [
    {
      name: 'missing overview',
      patch: {
        ...mingjingRelationshipPatch(),
        overview: undefined,
      },
      detail: 'mingjing_relationship_overview_required',
    },
    {
      name: 'missing patterns',
      patch: {
        ...mingjingRelationshipPatch(),
        patterns: [],
      },
      detail: 'mingjing_relationship_patterns_required',
    },
    {
      name: 'missing action',
      patch: {
        ...mingjingRelationshipPatch(),
        action: undefined,
      },
      detail: 'mingjing_relationship_action_required',
    },
    {
      name: 'pattern without signals',
      patch: {
        ...mingjingRelationshipPatch(),
        patterns: [
          mingjingRelationshipPatternPatch(
            validMingjingRelationshipOutput().patterns[0],
            { signals: undefined },
          ),
          ...mingjingRelationshipPatch().patterns.slice(1),
        ],
      },
      detail: 'signals_required',
    },
    {
      name: 'too many keywords',
      patch: {
        ...mingjingRelationshipPatch(),
        overview: {
          title: 'Runtime overview title.',
          summary: 'Runtime overview summary.',
          keywords: ['a', 'b', 'c', 'd'],
        },
      },
      detail: 'keywords_invalid',
    },
  ];

  for (const item of cases) {
    const client = clientReturningText(JSON.stringify(item.patch));
    const result = await client.generate('mingjing', mingjingRelationshipPromptRequest());

    assert.equal(result.ok, false, item.name);
    if (result.ok) continue;
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'validation_failed');
    assert.equal(result.failure.failure.detail, item.detail, item.name);
  }
});

test('MingJing relationship output validator rejects tampering with deterministic fields after patching', async () => {
  const base = validMingjingRelationshipOutput();
  const client = clientReturningText(JSON.stringify(mingjingRelationshipPatch()));
  const result = await client.generate('mingjing', mingjingRelationshipPromptRequest(base));
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const rankTampered = {
    ...result.output,
    patterns: result.output.patterns.map((pattern, index) => ({
      ...pattern,
      rank: index === 0 ? 2 : 1,
    })),
  };
  const rankCheck = validateMirrorOutput(rankTampered);
  assert.equal(rankCheck.ok, false);
  if (!rankCheck.ok) {
    assert.equal(rankCheck.error.code, 'mirror_output_mingjing_relationship_patterns_invalid');
  }

  const ruleTampered = {
    ...result.output,
    patterns: result.output.patterns.map((pattern, index) =>
      index === 0 ? { ...pattern, rule_ref: 'bazi_ziping_v1.hepan.invented_rule' } : pattern
    ),
  };
  const ruleCheck = validateMirrorOutput(ruleTampered);
  assert.equal(ruleCheck.ok, false);
  if (!ruleCheck.ok) {
    assert.equal(ruleCheck.error.code, 'mirror_output_mingjing_relationship_pattern_rule_unadmitted');
  }
});
