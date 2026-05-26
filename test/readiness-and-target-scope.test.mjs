import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { generateReadingForStorage } from '../src/product/reading/index.ts';
import { formatDateRange, formatReadingCreatedAt, formatTimestamp } from '../src/product/reading/reading-format.ts';
import { latestReadingForTarget } from '../src/product/reading/reading-selectors.ts';
import { todayBasisLabelFor, todayTimeWindowFor } from '../src/product/tabs/today-time-window.ts';
import {
  natalInputsReadiness,
  subjectNatalReadiness,
} from '../src/product/subjects/natal-readiness.ts';
import { RuntimeTextGeneratorAiClient } from '../src/product/astrology/index.ts';
import {
  validNatalInputs,
  validPerson,
  validReading,
  validShiJingSpace,
  validTimeWindow,
} from './_fixtures.mjs';

function scaffoldNatalInputs() {
  return validNatalInputs({
    raw_birth_input: {
      calendar_system: 'gregorian',
      local_date_text: '2000-01-01',
    },
    birth_datetime_utc: '2000-01-01T00:00:00Z',
    birth_precision: 'unknown',
    calendar_system: 'gregorian',
    calculation_sex: 'unspecified',
    birth_location: {
      latitude: 0,
      longitude: 0,
      iana_time_zone: 'Etc/UTC',
    },
  });
}

function happyClient() {
  return new RuntimeTextGeneratorAiClient({
    modelId: 'test-model',
    generator: async () => ({
      text: JSON.stringify({
        summary: 'ok',
        highlights: [],
        recommendations: [],
        citations: [],
      }),
    }),
  });
}

test('scaffold natal inputs are valid-shaped but not generation-ready', () => {
  const readiness = natalInputsReadiness(scaffoldNatalInputs());
  assert.equal(readiness.ok, false);
  if (!readiness.ok) assert.equal(readiness.reason, 'scaffold_default_natal_inputs');
});

test('subject readiness blocks unknown birth precision', () => {
  const space = validShiJingSpace({
    self_subject: {
      natal_inputs: validNatalInputs({ birth_precision: 'unknown' }),
    },
  });
  const readiness = subjectNatalReadiness('self', space);
  assert.equal(readiness.ok, false);
  if (!readiness.ok) assert.equal(readiness.reason, 'birth_precision_unknown');
});

test('generateReadingForStorage refuses scaffold self data before pipeline execution', async () => {
  const space = validShiJingSpace({
    self_subject: { natal_inputs: scaffoldNatalInputs() },
  });
  const outcome = await generateReadingForStorage({
    id: 'reading_scaffold_refused',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'today',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
    runtime_ai_client: happyClient(),
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.error.kind, 'input_readiness_failed');
});

test('generateReadingForStorage refuses DaYun-required reading without calculation sex before pipeline execution', async () => {
  const space = validShiJingSpace({
    self_subject: { natal_inputs: validNatalInputs({ calculation_sex: 'unspecified' }) },
  });
  const outcome = await generateReadingForStorage({
    id: 'reading_dayun_refused',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'period_outlook',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
    runtime_ai_client: happyClient(),
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.error.kind, 'input_readiness_failed');
    assert.equal(outcome.error.reason, 'calculation_sex_unspecified_for_dayun');
  }
});

test('latestReadingForTarget ignores same-kind readings for another subject', () => {
  const personRef = { kind: 'person', id: 'p_01' };
  const selfReading = validReading({ id: 'r_self', kind: 'today', anchor_subject: 'self', subjects: ['self'] });
  const personReading = validReading({
    id: 'r_person',
    kind: 'today',
    anchor_subject: personRef,
    subjects: [personRef],
  });
  const latest = latestReadingForTarget({
    readings: [selfReading, personReading],
    kind: 'today',
    scope: 'subject',
    target: personRef,
  });
  assert.equal(latest?.id, 'r_person');
});

test('latestReadingForTarget picks newest created_at before array insertion order', () => {
  const olderInsertedLast = validReading({ id: 'r_old', kind: 'today', created_at: '2026-05-24T00:00:00Z' });
  const newerInsertedFirst = validReading({ id: 'r_new', kind: 'today', created_at: '2026-05-25T00:00:00Z' });
  const latest = latestReadingForTarget({
    readings: [newerInsertedFirst, olderInsertedLast],
    kind: 'today',
    scope: 'subject',
    target: 'self',
  });
  assert.equal(latest?.id, 'r_new');
});

test('latestReadingForTarget uses array order only as same-created_at tie break', () => {
  const first = validReading({ id: 'r_first', kind: 'today', created_at: '2026-05-25T00:00:00Z' });
  const second = validReading({ id: 'r_second', kind: 'today', created_at: '2026-05-25T00:00:00Z' });
  const latest = latestReadingForTarget({
    readings: [first, second],
    kind: 'today',
    scope: 'subject',
    target: 'self',
  });
  assert.equal(latest?.id, 'r_second');
});

test('todayTimeWindowFor uses basis timezone local civil day, not UTC day', () => {
  const window = todayTimeWindowFor('Asia/Shanghai', new Date('2026-05-25T16:30:00.000Z'));
  assert.equal(window.mode, 'bounded');
  assert.equal(window.start_utc, '2026-05-25T16:00:00.000Z');
  assert.equal(window.end_utc, '2026-05-26T16:00:00.000Z');
  assert.equal(window.basis_time_zone, 'Asia/Shanghai');
  assert.equal(window.source, 'kind_default');
});

test('todayBasisLabelFor surfaces the timezone and local date', () => {
  assert.equal(
    todayBasisLabelFor('Asia/Shanghai', new Date('2026-05-25T16:30:00.000Z')),
    'Asia/Shanghai · 2026年5月26日',
  );
});

test('product area no longer seeds 2000-01-01 as initial self evidence', () => {
  const source = readFileSync(new URL('../src/shell/routes/product-area.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /2000-01-01T00:00:00Z/);
  assert.doesNotMatch(source, /local_date_text: '2000-01-01'/);
});

test('tab and conversation sources use target-scoped selectors and anchors', () => {
  const todaySource = readFileSync(new URL('../src/product/tabs/today.tsx', import.meta.url), 'utf8');
  const consultationSource = readFileSync(new URL('../src/product/tabs/consultation.tsx', import.meta.url), 'utf8');
  const conversationListSource = readFileSync(new URL('../src/product/conversations/conversation-list.tsx', import.meta.url), 'utf8');
  assert.match(todaySource, /latestReadingForTarget/);
  assert.match(consultationSource, /latestReadingForTarget/);
  assert.match(conversationListSource, /subject_anchor: state\.observation_target/);
});

test('today tab distinguishes readiness, running, retry, and local-day basis states', () => {
  const todaySource = readFileSync(new URL('../src/product/tabs/today.tsx', import.meta.url), 'utf8');
  assert.match(todaySource, /todayTimeWindowFor/);
  assert.match(todaySource, /todayBasisLabelFor/);
  assert.match(todaySource, /aria-busy/);
  assert.match(todaySource, /runningRef/);
  assert.match(todaySource, /complete_birth_info/);
  assert.match(todaySource, /retry_generate/);
  assert.match(todaySource, /today_reading_ready/);
  assert.match(todaySource, /today_reading_needs_birth_info/);
});

test('tabs render stored readings through the shared evidence card', () => {
  const todaySource = readFileSync(new URL('../src/product/tabs/today.tsx', import.meta.url), 'utf8');
  const consultationSource = readFileSync(new URL('../src/product/tabs/consultation.tsx', import.meta.url), 'utf8');
  assert.match(todaySource, /ReadingEvidenceCard/);
  assert.match(consultationSource, /ReadingEvidenceCard/);
  assert.doesNotMatch(todaySource, /latestToday\.output\.summary/);
  assert.doesNotMatch(consultationSource, /latestConsultation\.output\.summary/);
});

test('ReadingEvidenceCard renders persisted evidence fields without pipeline calls', () => {
  const source = readFileSync(new URL('../src/product/reading/reading-evidence-card.tsx', import.meta.url), 'utf8');
  assert.match(source, /inputs_summary/);
  assert.match(source, /feature_snapshot_hash/);
  assert.match(source, /input_hash/);
  assert.match(source, /uncertainty/);
  assert.match(source, /stage_label/);
  assert.match(source, /key_windows/);
  assert.doesNotMatch(source, /generateReading/);
  assert.doesNotMatch(source, /runtime_ai_client/);
});

test('ReadingEvidenceCard keeps raw method/hash/enum values in technical details, not the default layer', () => {
  const source = readFileSync(new URL('../src/product/reading/reading-evidence-card.tsx', import.meta.url), 'utf8');
  const defaultLayerStart = source.indexOf('function ReadingDefaultLayer');
  const technicalLayerStart = source.indexOf('function ReadingTechnicalDetails');
  assert.notEqual(defaultLayerStart, -1);
  assert.notEqual(technicalLayerStart, -1);
  const defaultLayer = source.slice(defaultLayerStart, technicalLayerStart);
  assert.match(source.slice(technicalLayerStart), /<details/);
  assert.doesNotMatch(defaultLayer, /method_profile\.id/);
  assert.doesNotMatch(defaultLayer, /input_hash/);
  assert.doesNotMatch(defaultLayer, /feature_snapshot_hash/);
  assert.doesNotMatch(defaultLayer, /bazi_ganzhi_jieqi_dayun_v1/);
  assert.doesNotMatch(defaultLayer, /\{rec\.horizon\}/);
  assert.doesNotMatch(defaultLayer, /\{reading\.uncertainty\.confidence\}/);
});

test('Reading formatting helpers use basis timezone, not machine locale timezone', () => {
  assert.equal(formatTimestamp('2026-05-25T16:30:00.000Z', 'Asia/Shanghai'), '2026年5月26日 00:30');
  assert.equal(formatTimestamp('2026-05-25T16:30:00.000Z', 'UTC'), '2026年5月25日 16:30');
  assert.equal(
    formatDateRange('2026-05-25T16:00:00.000Z', '2026-05-26T16:00:00.000Z', 'Asia/Shanghai'),
    '2026年5月26日 00:00 - 2026年5月27日 00:00',
  );
  const reading = validReading({
    created_at: '2026-05-25T16:30:00.000Z',
    time_window: validTimeWindow({ basis_time_zone: 'Asia/Shanghai' }),
    inputs_summary: validReading().inputs_summary,
  });
  assert.equal(formatReadingCreatedAt(reading), '2026年5月26日 00:30');
});

test('person target readiness can pass independently of self', () => {
  const person = validPerson('p_01', { natal_inputs: validNatalInputs() });
  const space = validShiJingSpace({
    self_subject: { natal_inputs: scaffoldNatalInputs() },
    persons: [person],
  });
  const readiness = subjectNatalReadiness({ kind: 'person', id: 'p_01' }, space);
  assert.equal(readiness.ok, true);
});
