import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { validateMirrorOutput } from '../src/contracts/mirror-output-validator.ts';
import { validateReading } from '../src/contracts/reading-validator.ts';
import { generateReading } from '../src/product/astrology/generate-reading.ts';
import { generateMingJingZiweiNatalOutput } from '../src/product/astrology/mingjing-ziwei-reading-generator.ts';
import { buildMingJingRouteProjection } from '../src/product/astrology/mingjing-route-projection.ts';
import {
  applyRuntimeAiWordingPatch,
  validateRuntimeAiWordingPatchValue,
} from '../src/product/astrology/runtime-ai-wording-patch.ts';
import { runtimeAiWordingPatchAppliedSource } from '../src/product/astrology/runtime-ai-client.ts';
import { natalMirrorScope, validNatalInputs, validShiJingSpace } from './_fixtures.mjs';
import { mingjingCssFiles, readCssBundle } from './css-bundles.mjs';

const NOW = new Date('2026-06-22T01:00:00Z');
const SCOPE = natalMirrorScope({ anchor_year: 2026 });

function ziweiSpace() {
  return validShiJingSpace({
    self_subject: { natal_inputs: validNatalInputs({ calculation_sex: 'male' }) },
    settings: {
      ui_language: 'zh',
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
      method_profile_id: 'ziwei_sanhe_v1',
    },
  });
}

function fillZiweiNatalOutput(base) {
  return {
    ...base,
    summary: 'Runtime AI words a concise Ziwei natal brief from the deterministic chart.',
    profile: {
      life_pattern: 'The Ziwei chart shows a steady life pattern rooted in the soul palace.',
      strengths: 'The major-star structure highlights sustained focus and adaptive judgement.',
      long_term_theme: 'The long arc asks for deliberate pacing across the decadal palaces.',
      relationship_pattern: 'Relationships work best when expectations are named early.',
      career_inclination: 'Career energy is strongest when structure and discretion work together.',
    },
    decade_guidance: base.decade_guidance.map((item) => ({
      ...item,
      theme: `Runtime theme for ${item.age_range}.`,
      strategy: `Runtime strategy for ${item.palace_name}.`,
    })),
  };
}

test('Ziwei MingJing route builds a real route projection from Ziwei evidence', () => {
  const result = buildMingJingRouteProjection({ space: ziweiSpace(), reference_year: 2026 });

  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(result.value.kind, 'ziwei_sanhe_v1');
  assert.equal(result.value.route_id, 'mingjing.route.ziwei_sanhe_v1');
  assert.equal(result.value.chart.palaces.length, 12);
  assert.equal(result.value.feature_snapshot.method_evidence.method_id, 'ziwei_sanhe_v1');
});

test('Ziwei MingJing natal seed includes every deterministic decadal palace range', () => {
  const projection = buildMingJingRouteProjection({ space: ziweiSpace(), reference_year: 2026 });

  assert.equal(projection.ok, true, JSON.stringify(projection));
  if (!projection.ok) return;
  const output = generateMingJingZiweiNatalOutput({
    feature_snapshot: projection.value.feature_snapshot,
    method_profile_id: 'ziwei_sanhe_v1',
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
  });

  assert.equal(output.ok, true, JSON.stringify(output));
  if (!output.ok) return;
  assert.equal(output.value.decade_guidance.length, projection.value.chart.palaces.length);
  assert.equal(output.value.decade_guidance.length, 12);
  assert.deepEqual(
    output.value.decade_guidance.map((item) => item.age_range),
    [...projection.value.chart.palaces]
      .sort((a, b) => a.decadal_start_age - b.decadal_start_age)
      .map((palace) => `${palace.decadal_start_age}-${palace.decadal_end_age}`),
  );
});

test('generateReading succeeds for Ziwei MingJing natal vertical slice', async () => {
  let deterministicOutput = null;
  const runtimeClient = {
    async generate(_mirrorKind, request) {
      deterministicOutput = request.deterministic_output;
      assert.equal(request.deterministic_output.output_kind, 'ziwei_natal_brief');
      return { ok: true, output: fillZiweiNatalOutput(request.deterministic_output) };
    },
  };

  const result = await generateReading(
    {
      id: 'rdg_mj_ziwei_natal_1',
      created_at: '2026-06-22T00:00:00Z',
      mirror_kind: 'mingjing',
      mirror_scope: SCOPE,
      related_person_refs: [],
      concern_tag_refs: [],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space: ziweiSpace(),
    },
    { runtime_ai_client: runtimeClient, now: NOW },
  );

  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.ok(deterministicOutput);
  assert.equal(result.reading.inputs_summary.method_profile.id, 'ziwei_sanhe_v1');
  assert.equal(result.reading.output.output_kind, 'ziwei_natal_brief');
  assert.equal(result.reading.output.profile.life_pattern.includes('Ziwei'), true);
  assert.equal(result.reading.output.chart_basis.palace_count, 12);
  assert.equal(validateMirrorOutput(result.reading.output).ok, true);
  assert.equal(validateReading(result.reading).ok, true, JSON.stringify(validateReading(result.reading)));
});

test('generateReading applies Ziwei MingJing wording patches through the Runtime AI boundary', async () => {
  let prompt = '';
  const runtimeClient = {
    async generate(_mirrorKind, request) {
      prompt = request.user_prompt;
      const patch = {
        patch_kind: 'shijing.runtime_ai_wording_patch.v1',
        mirror_kind: 'mingjing',
        output_kind: 'ziwei_natal_brief',
        summary: 'Runtime patch words the Ziwei natal route without changing chart basis.',
        profile: {
          life_pattern: 'Patched life pattern from Ziwei evidence.',
          strengths: 'Patched strengths from the major-star structure.',
          long_term_theme: 'Patched long-term theme across the decadal palaces.',
          relationship_pattern: 'Patched relationship pattern without compatibility scoring.',
          career_inclination: 'Patched career inclination without inventing occupations.',
        },
        decade_guidance: request.deterministic_output.decade_guidance.map((item) => ({
          age_range: item.age_range,
          palace_name: item.palace_name,
          theme: `Patched theme for ${item.age_range}.`,
          strategy: `Patched strategy for ${item.palace_name}.`,
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
      id: 'rdg_mj_ziwei_patch_1',
      created_at: '2026-06-22T00:00:00Z',
      mirror_kind: 'mingjing',
      mirror_scope: SCOPE,
      related_person_refs: [],
      concern_tag_refs: [],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space: ziweiSpace(),
    },
    { runtime_ai_client: runtimeClient, now: NOW },
  );

  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.match(prompt, /output_kind: ziwei_natal_brief/u);
  assert.equal(result.reading.output.output_kind, 'ziwei_natal_brief');
  assert.equal(result.reading.output.summary, 'Runtime patch words the Ziwei natal route without changing chart basis.');
  assert.equal(result.reading.output.chart_basis.palace_count, 12);
  assert.match(result.reading.output.decade_guidance[0].theme, /Patched theme/u);
  assert.equal(validateReading(result.reading).ok, true, JSON.stringify(validateReading(result.reading)));
});

test('MingJing shell routes Ziwei projections to the Ziwei route component', () => {
  const shell = readFileSync(
    new URL('../src/product/tabs/mingjing-tab.tsx', import.meta.url),
    'utf8',
  );
  const route = readFileSync(
    new URL('../src/product/tabs/mingjing/ziwei-mingjing-route.tsx', import.meta.url),
    'utf8',
  );

  assert.match(shell, /buildMingJingRouteProjection/u);
  assert.match(shell, /ZiweiMingJingRoute/u);
  assert.match(shell, /projection\.value\.kind === 'bazi_ziping_v1'/u);
  assert.match(shell, /projection\.value\.kind === 'ziwei_sanhe_v1'/u);
  assert.doesNotMatch(route, /ZiweiAstrolabe/u);
  assert.match(route, /MingJingZiweiReadingView/u);
  assert.doesNotMatch(route, /MingJingRelationshipReadingView/u);
});

test('Ziwei MingJing route matches the attachment-style palace workspace structure', () => {
  const route = readFileSync(
    new URL('../src/product/tabs/mingjing/ziwei-mingjing-route.tsx', import.meta.url),
    'utf8',
  );
  const readingView = readFileSync(
    new URL('../src/product/tabs/mingjing/mingjing-ziwei-reading-view.tsx', import.meta.url),
    'utf8',
  );
  const ziweiStyles = readCssBundle(mingjingCssFiles);

  assert.match(route, /shijing-mingjing__panels--ziwei/u);
  assert.doesNotMatch(route, /shijing-ziwei-hero/u);
  assert.doesNotMatch(route, /heroTitle/u);
  assert.match(route, /shijing-ziwei-persona/u);
  assert.match(route, /shijing-ziwei-workspace/u);
  assert.match(route, /shijing-ziwei-palace/u);
  assert.match(route, /aria-pressed=\{selected\}/u);
  assert.match(route, /shijing-ziwei-detail/u);
  assert.match(route, /shijing-ziwei-detail__decade/u);
  assert.match(readingView, /shijing-ziwei-brief/u);
  assert.doesNotMatch(readingView, /shijing-ziwei-decade/u);
  assert.match(ziweiStyles, /\.shijing-mingjing__panels--ziwei/u);
  assert.match(ziweiStyles, /\.shijing-ziwei-workspace/u);
  assert.match(ziweiStyles, /\.shijing-ziwei-brief/u);
  assert.match(ziweiStyles, /\.shijing-ziwei-detail__decade/u);
});

test('Ziwei palace cards only tint the selected item green', () => {
  const ziweiStyles = readCssBundle(mingjingCssFiles);

  assert.doesNotMatch(
    ziweiStyles,
    /\.shijing-ziwei-palace\[data-soul\]\s*\{[^}]*background/u,
  );
  assert.doesNotMatch(
    ziweiStyles,
    /\.shijing-ziwei-palace:hover,\s*\.shijing-ziwei-palace\[data-selected\]/u,
  );
  assert.match(
    ziweiStyles,
    /\.shijing-ziwei-palace\[data-selected\]\s*\{[^}]*border-color:\s*color-mix\(in srgb, var\(--mingjing-accent\)/u,
  );
});

test('Ziwei palace detail explains the selected palace instead of generic terms', () => {
  const route = readFileSync(
    new URL('../src/product/tabs/mingjing/ziwei-mingjing-route.tsx', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(route, /PALACE_DETAIL_TERMS/u);
  assert.doesNotMatch(route, /glossaryTitle/u);
  assert.doesNotMatch(route, /名词通俗解释/u);
  assert.match(route, /PALACE_DOMAIN_COPY/u);
  assert.match(route, /palaceInterpretationSections/u);
  assert.match(route, /子女、晚辈、学生/u);
  assert.match(route, /不是生育数量/u);
});
