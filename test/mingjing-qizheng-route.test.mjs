import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { validateMirrorOutput } from '../src/contracts/mirror-output-validator.ts';
import { validateReading } from '../src/contracts/reading-validator.ts';
import { generateReading } from '../src/product/astrology/generate-reading.ts';
import { buildMingJingRouteProjection } from '../src/product/astrology/mingjing-route-projection.ts';
import {
  applyRuntimeAiWordingPatch,
  validateRuntimeAiWordingPatchValue,
} from '../src/product/astrology/runtime-ai-wording-patch.ts';
import { runtimeAiWordingPatchAppliedSource } from '../src/product/astrology/runtime-ai-client.ts';
import { ZH_MINGJING_COPY } from '../src/product/i18n/zh/mingjing.ts';
import { natalMirrorScope, validNatalInputs, validShiJingSpace } from './_fixtures.mjs';

const NOW = new Date('2026-06-22T01:00:00Z');
const SCOPE = natalMirrorScope({ anchor_year: 2026 });

function qizhengSpace(overrides = {}) {
  return validShiJingSpace({
    self_subject: { natal_inputs: validNatalInputs({ calculation_sex: 'unspecified', ...overrides }) },
    settings: {
      ui_language: 'zh',
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
      method_profile_id: 'qizheng_siyu_guolao_v1',
    },
  });
}

function fillQizhengNatalOutput(base) {
  return {
    ...base,
    summary: 'Runtime AI words a concise QiZheng SiYu natal brief from the deterministic star chart.',
    profile: {
      life_pattern: 'The QiZheng chart shows a whole-life pattern through star placement and house emphasis.',
      strengths: 'The strongest bodies describe durable gifts that can be used deliberately.',
      long_term_theme: 'The long arc asks the user to balance visible drive with quieter cultivation.',
      relationship_pattern: 'Relationship rhythm is read from the relational houses without scoring compatibility.',
      career_inclination: 'Career energy is strongest when the chart emphasis is turned into steady craft.',
    },
    star_guidance: base.star_guidance.map((item) => ({
      ...item,
      theme: `Runtime theme for ${item.body_label}.`,
      strategy: `Runtime strategy for ${item.house_name}.`,
    })),
  };
}

test('QiZheng SiYu MingJing route builds a projection from QiZheng evidence', () => {
  const result = buildMingJingRouteProjection({ space: qizhengSpace(), reference_year: 2026 });

  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(result.value.kind, 'qizheng_siyu_guolao_v1');
  assert.equal(result.value.route_id, 'mingjing.route.qizheng_siyu_guolao_v1');
  assert.equal(result.value.chart.bodies.length, 11);
  assert.equal(result.value.chart.houses.length, 12);
  assert.equal(result.value.feature_snapshot.method_evidence.method_id, 'qizheng_siyu_guolao_v1');
});

test('QiZheng SiYu node axis maps LuoHou to ascending node and JiDu to descending node', () => {
  const result = buildMingJingRouteProjection({ space: qizhengSpace(), reference_year: 2026 });

  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  const luohou = result.value.chart.bodies.find((body) => body.key === 'luohou');
  const jidu = result.value.chart.bodies.find((body) => body.key === 'jidu');
  assert.ok(luohou);
  assert.ok(jidu);
  assert.equal(luohou.provenance, 'qizheng-siyu-v1:ascending-lunar-node');
  assert.equal(jidu.provenance, 'qizheng-siyu-v1:descending-lunar-node');
  const axisDelta = Math.abs(((luohou.longitude - jidu.longitude + 360) % 360) - 180);
  assert.ok(axisDelta < 0.001, `expected LuoHou/JiDu to stay opposite, got delta ${axisDelta}`);
});

test('generateReading succeeds for QiZheng SiYu MingJing natal vertical slice', async () => {
  let deterministicOutput = null;
  const runtimeClient = {
    async generate(_mirrorKind, request) {
      deterministicOutput = request.deterministic_output;
      assert.equal(request.deterministic_output.output_kind, 'qizheng_siyu_natal_brief');
      return { ok: true, output: fillQizhengNatalOutput(request.deterministic_output) };
    },
  };

  const result = await generateReading(
    {
      id: 'rdg_mj_qizheng_natal_1',
      created_at: '2026-06-22T00:00:00Z',
      mirror_kind: 'mingjing',
      mirror_scope: SCOPE,
      related_person_refs: [],
      concern_tag_refs: [],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space: qizhengSpace(),
    },
    { runtime_ai_client: runtimeClient, now: NOW },
  );

  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.ok(deterministicOutput);
  assert.equal(result.reading.inputs_summary.method_profile.id, 'qizheng_siyu_guolao_v1');
  assert.equal(result.reading.output.output_kind, 'qizheng_siyu_natal_brief');
  assert.equal(result.reading.output.chart_basis.key_body_refs.length > 0, true);
  assert.equal(validateMirrorOutput(result.reading.output).ok, true);
  assert.equal(validateReading(result.reading).ok, true, JSON.stringify(validateReading(result.reading)));
});

test('generateReading applies QiZheng SiYu MingJing wording patches through Runtime AI boundary', async () => {
  let prompt = '';
  const runtimeClient = {
    async generate(_mirrorKind, request) {
      prompt = request.user_prompt;
      const patch = {
        patch_kind: 'shijing.runtime_ai_wording_patch.v1',
        mirror_kind: 'mingjing',
        output_kind: 'qizheng_siyu_natal_brief',
        summary: 'Runtime patch words the QiZheng route without changing star evidence.',
        profile: {
          life_pattern: 'Patched QiZheng life pattern.',
          strengths: 'Patched strengths from star placement.',
          long_term_theme: 'Patched long-term theme from house emphasis.',
          relationship_pattern: 'Patched relationship pattern without compatibility scoring.',
          career_inclination: 'Patched career inclination without inventing occupations.',
        },
        star_guidance: request.deterministic_output.star_guidance.map((item) => ({
          body_key: item.body_key,
          theme: `Patched theme for ${item.body_label}.`,
          strategy: `Patched strategy for ${item.house_name}.`,
        })),
      };
      const validatedPatch = validateRuntimeAiWordingPatchValue('mingjing', patch);
      return {
        ok: true,
        output: applyRuntimeAiWordingPatch(request.deterministic_output, validatedPatch),
        output_source: runtimeAiWordingPatchAppliedSource(),
      };
    },
  };

  const result = await generateReading(
    {
      id: 'rdg_mj_qizheng_patch_1',
      created_at: '2026-06-22T00:00:00Z',
      mirror_kind: 'mingjing',
      mirror_scope: SCOPE,
      related_person_refs: [],
      concern_tag_refs: [],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space: qizhengSpace(),
    },
    { runtime_ai_client: runtimeClient, now: NOW },
  );

  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.match(prompt, /output_kind: qizheng_siyu_natal_brief/u);
  assert.match(prompt, /interpretive_evidence \(qizheng_siyu_guolao_v1/u);
  const interpretiveEvidence = prompt.split('interpretive_evidence (qizheng_siyu_guolao_v1, read-only):')[1] ?? '';
  assert.match(interpretiveEvidence, /上升度起十二等宫/u);
  assert.match(interpretiveEvidence, /二十八宿等分模型 v1/u);
  assert.doesNotMatch(interpretiveEvidence, /equal-house-from-ascendant-v1/u);
  assert.equal(result.reading.output.output_kind, 'qizheng_siyu_natal_brief');
  assert.equal(result.reading.output.summary, 'Runtime patch words the QiZheng route without changing star evidence.');
  assert.match(result.reading.output.star_guidance[0].theme, /Patched theme/u);
  assert.equal(validateReading(result.reading).ok, true, JSON.stringify(validateReading(result.reading)));
});

test('MingJing shell routes QiZheng projections to the QiZheng route component', () => {
  const shell = readFileSync(
    new URL('../src/product/tabs/mingjing-tab.tsx', import.meta.url),
    'utf8',
  );
  const route = readFileSync(
    new URL('../src/product/tabs/mingjing/qizheng-mingjing-route.tsx', import.meta.url),
    'utf8',
  );

  assert.match(shell, /QizhengMingJingRoute/u);
  assert.match(shell, /projection\.value\.kind === 'qizheng_siyu_guolao_v1'/u);
  assert.match(route, /data-mingjing-route="qizheng_siyu_guolao_v1"/u);
  assert.match(route, /MingJingQizhengReadingView/u);
});

test('QiZheng MingJing route uses product labels instead of raw model identifiers', () => {
  const route = readFileSync(
    new URL('../src/product/tabs/mingjing/qizheng-mingjing-route.tsx', import.meta.url),
    'utf8',
  );

  assert.equal(ZH_MINGJING_COPY.qizhengRoute.bodyColumns.position, '宫势');
  assert.equal(ZH_MINGJING_COPY.qizhengRoute.houseModelValues.equalHouseFromAscendantV1, '上升度起十二等宫');
  assert.equal(ZH_MINGJING_COPY.qizhengRoute.mansionModelValues.equalMansionV1, '二十八宿等分模型 v1');
  assert.equal(
    ZH_MINGJING_COPY.qizhengRoute.siyuModelValues.nodeAxisVirtualPointAndApogee,
    '罗喉/计都取月交点轴，紫气取 28 年虚点，月孛取月亮远地点',
  );
  assert.equal(ZH_MINGJING_COPY.qizhengRoute.emptyHouse, '空宫');
  assert.match(route, /formatHouseModelLabel\(basis\.house_model/u);
  assert.match(route, /formatMansionModelLabel\(basis\.mansion_model/u);
  assert.match(route, /formatSiyuModelLabel\(basis\.siyu_model/u);
  assert.match(route, /q\.emptyHouse/u);
  assert.doesNotMatch(route, /<dd>\{basis\.house_model\}<\/dd>/u);
  assert.doesNotMatch(route, /nonEmptyHouseRows/u);
});
