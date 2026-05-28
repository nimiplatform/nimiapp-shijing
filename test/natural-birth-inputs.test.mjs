import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

import {
  buildNaturalBirthNatalInputs,
  userMessageForNaturalBirthError,
} from '../src/product/inputs/natural-birth-build.ts';
import {
  createEmptyNaturalBirthDraft,
  naturalBirthDraftReducer,
} from '../src/product/inputs/natural-birth-draft.ts';
import { resolveBirthPlace } from '../src/product/inputs/natural-birth-place.ts';
import { parseNaturalBirthTime } from '../src/product/inputs/natural-birth-time.ts';

function gregorianDraft(overrides = {}) {
  return {
    ...createEmptyNaturalBirthDraft(),
    gregorian_date_text: '1990-04-12',
    local_time_text: '08:30',
    birth_precision: 'exact',
    place_text: '上海市黄浦区',
    calculation_sex: 'female',
    ...overrides,
  };
}

test('empty natural birth draft starts as a gregorian natural record', () => {
  const draft = createEmptyNaturalBirthDraft();
  assert.equal(draft.calendar_system, 'gregorian');
  assert.equal(draft.gregorian_date_text, '');
  assert.equal(draft.place_text, '');
  assert.equal(draft.calculation_sex, 'unspecified');
  assert.equal(draft.lunar_is_leap_month, null);
});

test('switching calendar systems clears irrelevant date evidence', () => {
  let state = createEmptyNaturalBirthDraft();
  state = naturalBirthDraftReducer(state, { type: 'set_gregorian_date_text', value: '1990-04-12' });
  state = naturalBirthDraftReducer(state, { type: 'set_calendar_system', value: 'lunar_chinese' });
  assert.equal(state.gregorian_date_text, '');
  state = naturalBirthDraftReducer(state, { type: 'set_lunar_year_text', value: '1990' });
  state = naturalBirthDraftReducer(state, { type: 'set_lunar_month_text', value: '3' });
  state = naturalBirthDraftReducer(state, { type: 'set_lunar_day_text', value: '17' });
  state = naturalBirthDraftReducer(state, { type: 'set_lunar_is_leap_month', value: false });
  state = naturalBirthDraftReducer(state, { type: 'set_calendar_system', value: 'gregorian' });
  assert.equal(state.lunar_year_text, '');
  assert.equal(state.lunar_is_leap_month, null);
});

test('china gazetteer resolves real province/city/district names and fails unknown places explicitly', () => {
  // Modern PRC: every recognized place is Asia/Shanghai.
  assert.equal(resolveBirthPlace('上海')?.iana_time_zone, 'Asia/Shanghai');
  assert.equal(resolveBirthPlace('上海市')?.place_name, '上海市');
  assert.equal(resolveBirthPlace('上海市黄浦区')?.place_name, '上海市黄浦区');
  // 钟祥市 — the bug report case. Resolves to its Hubei record uniquely.
  const zhongxiang = resolveBirthPlace('湖北省钟祥市');
  assert.equal(zhongxiang?.place_name, '湖北省钟祥市');
  assert.ok(zhongxiang && Math.abs(zhongxiang.longitude - 112.59) < 0.1);
  assert.ok(zhongxiang && Math.abs(zhongxiang.latitude - 31.17) < 0.1);
  // Suffix-tolerant + separator-tolerant parsing.
  assert.equal(resolveBirthPlace('钟祥市')?.place_name, '湖北省钟祥市');
  assert.equal(resolveBirthPlace('钟祥')?.place_name, '湖北省钟祥市');
  assert.equal(resolveBirthPlace('湖北 钟祥市')?.place_name, '湖北省钟祥市');
  assert.equal(resolveBirthPlace('湖北省/钟祥市')?.place_name, '湖北省钟祥市');
  // Prefecture-city skip: "西安市新城区" should resolve via city+district.
  assert.equal(resolveBirthPlace('西安市新城区')?.place_name, '陕西省新城区');
  // Ambiguity fails closed — 新城区 exists in 西安 and 呼和浩特, user must qualify.
  assert.equal(resolveBirthPlace('新城区'), null);
  // Direct municipality still resolves at level 1.
  assert.equal(resolveBirthPlace('北京')?.place_name, '北京市');
  assert.equal(resolveBirthPlace('北京市')?.place_name, '北京市');
  // Multi-segment minority autonomous prefectures stay intact (no 自治州 stripping).
  assert.equal(resolveBirthPlace('格尔木市')?.place_name, '青海省格尔木市');
  assert.equal(resolveBirthPlace('青海省格尔木市')?.place_name, '青海省格尔木市');
  // Unknown / nonsense → null.
  assert.equal(resolveBirthPlace('不存在的地点'), null);
  assert.equal(resolveBirthPlace(''), null);
});

test('gregorian natural record builds NatalInputs with Shanghai UTC conversion', () => {
  const outcome = buildNaturalBirthNatalInputs(gregorianDraft());
  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.equal(outcome.inputs.birth_datetime_utc, '1990-04-12T00:30:00.000Z');
    assert.equal(outcome.inputs.birth_location.iana_time_zone, 'Asia/Shanghai');
    assert.equal(outcome.inputs.birth_location.place_name, '上海市黄浦区');
    assert.ok(Math.abs(outcome.inputs.birth_location.longitude - 121.49) < 0.1);
    assert.ok(Math.abs(outcome.inputs.birth_location.latitude - 31.24) < 0.1);
    assert.equal(outcome.inputs.birth_precision, 'exact');
    assert.equal(outcome.inputs.calculation_sex, 'female');
  }
});

test('gregorian natural record builds NatalInputs with Golmud UTC conversion', () => {
  const outcome = buildNaturalBirthNatalInputs(gregorianDraft({
    gregorian_date_text: '1987-07-17',
    local_time_text: '23:00',
    place_text: '格尔木市',
    calculation_sex: 'male',
  }));
  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.equal(outcome.inputs.birth_datetime_utc, '1987-07-17T15:00:00.000Z');
    assert.equal(outcome.inputs.birth_location.iana_time_zone, 'Asia/Shanghai');
    assert.equal(outcome.inputs.birth_location.place_name, '青海省格尔木市');
    assert.ok(Math.abs(outcome.inputs.birth_location.longitude - 94.93) < 0.1);
    assert.ok(Math.abs(outcome.inputs.birth_location.latitude - 36.41) < 0.1);
  }
});

test('湖北省钟祥市 (regression for bug report) resolves and converts cleanly', () => {
  const outcome = buildNaturalBirthNatalInputs(gregorianDraft({
    gregorian_date_text: '1987-12-05',
    local_time_text: '21:30',
    place_text: '湖北省钟祥市',
  }));
  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.equal(outcome.inputs.birth_datetime_utc, '1987-12-05T13:30:00.000Z');
    assert.equal(outcome.inputs.birth_location.place_name, '湖北省钟祥市');
    assert.ok(Math.abs(outcome.inputs.birth_location.longitude - 112.59) < 0.1);
    assert.ok(Math.abs(outcome.inputs.birth_location.latitude - 31.17) < 0.1);
  }
});

test('natural Chinese birth time examples parse to 24-hour time', () => {
  const examples = [
    ['晚上11点', { hour: 23, minute: 0, second: 0 }],
    ['晚11点', { hour: 23, minute: 0, second: 0 }],
    ['上午8点半', { hour: 8, minute: 30, second: 0 }],
    ['早上8点30分', { hour: 8, minute: 30, second: 0 }],
    ['下午3点一刻', { hour: 15, minute: 15, second: 0 }],
    ['凌晨0点', { hour: 0, minute: 0, second: 0 }],
    ['中午12点', { hour: 12, minute: 0, second: 0 }],
    ['08:30', { hour: 8, minute: 30, second: 0 }],
    ['23:00', { hour: 23, minute: 0, second: 0 }],
    ['上午 8:30', { hour: 8, minute: 30, second: 0 }],
    ['晚上 11:00', { hour: 23, minute: 0, second: 0 }],
  ];
  for (const [input, expected] of examples) {
    assert.deepEqual(parseNaturalBirthTime(input), expected, input);
  }
});

test('manager P0 sample builds Golmud NatalInputs from Chinese date and time', () => {
  const outcome = buildNaturalBirthNatalInputs(gregorianDraft({
    gregorian_date_text: '1987年7月17日',
    local_time_text: '晚上11点',
    place_text: '青海省格尔木市',
    calculation_sex: 'male',
  }));
  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.equal(outcome.inputs.birth_datetime_utc, '1987-07-17T15:00:00.000Z');
    assert.equal(outcome.inputs.raw_birth_input.local_time_text, '晚上11点');
    assert.equal(outcome.inputs.birth_location.place_name, '青海省格尔木市');
  }
});

test('rough day can save without a time but does not masquerade as exact', () => {
  const outcome = buildNaturalBirthNatalInputs(gregorianDraft({
    local_time_text: '',
    birth_precision: 'rough_day',
  }));
  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.equal(outcome.inputs.birth_precision, 'rough_day');
    assert.equal(outcome.inputs.raw_birth_input.local_time_text, undefined);
  }
});

test('exact precision requires a concrete birth time', () => {
  const outcome = buildNaturalBirthNatalInputs(gregorianDraft({ local_time_text: '' }));
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.error.code, 'natural_birth_time_required_for_exact');
});

test('unknown place refuses to build and therefore cannot write a snapshot', () => {
  const outcome = buildNaturalBirthNatalInputs(gregorianDraft({ place_text: '火星' }));
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.error.code, 'natural_birth_place_unresolved');
});

test('lunar input without leap-month evidence fails closed', () => {
  let state = naturalBirthDraftReducer(createEmptyNaturalBirthDraft(), { type: 'set_calendar_system', value: 'lunar_chinese' });
  state = naturalBirthDraftReducer(state, { type: 'set_lunar_year_text', value: '1990' });
  state = naturalBirthDraftReducer(state, { type: 'set_lunar_month_text', value: '3' });
  state = naturalBirthDraftReducer(state, { type: 'set_lunar_day_text', value: '17' });
  state = naturalBirthDraftReducer(state, { type: 'set_local_time_text', value: '08:30' });
  state = naturalBirthDraftReducer(state, { type: 'set_place_text', value: '上海' });
  const outcome = buildNaturalBirthNatalInputs(state);
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.error.code, 'natural_birth_lunar_missing_leap_month_evidence');
});

test('hydrate_from_natal_inputs restores natural evidence, not editable technical fields', () => {
  const built = buildNaturalBirthNatalInputs(gregorianDraft({ notes: 'family record' }));
  assert.equal(built.ok, true);
  if (!built.ok) return;
  const state = naturalBirthDraftReducer(createEmptyNaturalBirthDraft(), {
    type: 'hydrate_from_natal_inputs',
    value: built.inputs,
  });
  assert.equal(state.gregorian_date_text, '1990-04-12');
  assert.equal(state.local_time_text, '08:30');
  assert.equal(state.place_text, '上海市黄浦区');
  assert.equal(state.notes, 'family record');
});

test('userMessageForNaturalBirthError returns product copy', () => {
  const message = userMessageForNaturalBirthError({ code: 'natural_birth_place_unresolved', received: 'x' });
  assert.match(message, /出生地点/);
});

test('input UI source contains no network, AI, or Tauri primitive', () => {
  const dir = new URL('../src/product/inputs/', import.meta.url);
  const files = readdirSync(dir).filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'));
  const forbidden = [
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /\baxios\b/,
    /\bgrpc\b/,
    /WebSocket/,
    /\binvoke\s*\(/,
    /@tauri-apps/,
    /\bgpt-/i,
    /\bclaude-/i,
    /\bgemini-/i,
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, dir), 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} contains forbidden primitive ${pattern}`);
    }
  }
});

test('ordinary birth editors have no editable UTC, latitude, longitude, or IANA actions', () => {
  const sources = [
    readFileSync(new URL('../src/product/inputs/natal-inputs-form.tsx', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/product/inputs/natural-birth-editor.tsx', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/product/persons/natal-inputs-editor.tsx', import.meta.url), 'utf8'),
  ].join('\n');
  assert.doesNotMatch(sources, /set_birth_datetime_utc/);
  assert.doesNotMatch(sources, /set_latitude_text/);
  assert.doesNotMatch(sources, /set_longitude_text/);
  assert.doesNotMatch(sources, /set_iana_time_zone/);
  assert.doesNotMatch(sources, /id=.*birth-datetime-utc/);
  assert.doesNotMatch(sources, /id=.*latitude/);
  assert.doesNotMatch(sources, /id=.*longitude/);
  assert.doesNotMatch(sources, /id=.*iana-time-zone/);
});

test('NaturalBirthEditor no longer renders an in-form standardization preview', () => {
  // The historical "系统标准化预览" aside was retired: 4 of its 6
  // rows merely echoed fields the user had just typed, and the only
  // genuinely-new piece of information (resolved IANA timezone +
  // standardization status) is now exposed post-save on the Me tab
  // via the natal summary card and its "查看识别详情" disclosure.
  // The build pipeline (`buildNaturalBirthNatalInputs`) is still
  // exercised on submit — see the form-level builds/preflight test
  // further down — but the editor itself is just a fieldset.
  const editorSource = readFileSync(new URL('../src/product/inputs/natural-birth-editor.tsx', import.meta.url), 'utf8');
  const buildSource = readFileSync(new URL('../src/product/inputs/natural-birth-build.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(editorSource, /shijing-natural-birth__preview/);
  assert.doesNotMatch(editorSource, /<dt>本地时间<\/dt>/);
  assert.doesNotMatch(editorSource, /<dt>时区<\/dt>/);
  assert.doesNotMatch(editorSource, /<dt>状态<\/dt>/);
  assert.doesNotMatch(editorSource, /<dt>时间记忆<\/dt>/);
  assert.doesNotMatch(editorSource, /<dt>推算性别<\/dt>/);
  assert.doesNotMatch(editorSource, /natal_section_standardized_preview/);
  // The build module is still imported elsewhere (the form's submit
  // path) and continues to expose the canonical fields.
  assert.match(buildSource, /birth_datetime_utc/);
  assert.match(buildSource, /birth_location/);
});

test('NatalInputsForm uses edit title after initialized birth data and onboarding title only for scaffold', () => {
  const source = readFileSync(new URL('../src/product/inputs/natal-inputs-form.tsx', import.meta.url), 'utf8');
  const copy = readFileSync(new URL('../src/product/i18n/copy.ts', import.meta.url), 'utf8');
  assert.match(source, /natalInputsReadiness/);
  assert.match(source, /scaffold_default_natal_inputs/);
  assert.match(source, /HEADINGS\.natal_profile_title/);
  assert.match(source, /HEADINGS\.natal_profile_completion_title/);
  assert.match(copy, /natal_profile_title: '本命资料'/);
});

test('NatalInputsForm builds and preflights before snapshot/replace', () => {
  const source = readFileSync(new URL('../src/product/inputs/natal-inputs-form.tsx', import.meta.url), 'utf8');
  const buildIndex = source.indexOf('buildNaturalBirthNatalInputs(draft)');
  const spaceIndex = source.indexOf('validateShiJingSpace(nextSnapshot)');
  const dispatchIndex = source.indexOf("dispatch({ type: 'snapshot/replace'");
  assert.ok(buildIndex >= 0, 'form must build natural birth into NatalInputs');
  assert.ok(spaceIndex >= 0, 'form must validate ShiJingSpace');
  assert.ok(dispatchIndex >= 0, 'form must dispatch snapshot/replace');
  assert.ok(buildIndex < dispatchIndex);
  assert.ok(spaceIndex < dispatchIndex);
});
