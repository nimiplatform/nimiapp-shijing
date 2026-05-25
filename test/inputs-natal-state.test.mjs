// Wave-7 — pure-TS NatalInputs draft reducer + draft → NatalInputs
// builder + validateDraft bridge tests. React layer is intentionally
// not exercised by node --test (Node 24 native strip does not load
// .tsx); browser-level coverage is admitted to the e2e wave.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

import {
  buildNatalInputsFromDraft,
  buildRawBirthInputFromDraft,
  createEmptyDraft,
  natalInputsDraftReducer,
} from '../src/product/inputs/natal-inputs-state.ts';
import { validateDraft, userMessageForValidationError } from '../src/product/inputs/natal-inputs-validate.ts';

function gregorianDraft(overrides = {}) {
  return {
    ...createEmptyDraft(),
    raw_local_date_text: '1990-04-12',
    raw_local_time_text: '08:30',
    raw_place_text: 'Shanghai',
    birth_datetime_utc: '1990-04-12T08:30:00Z',
    birth_precision: 'exact',
    latitude_text: '31.2304',
    longitude_text: '121.4737',
    iana_time_zone: 'Asia/Shanghai',
    place_name: 'Shanghai',
    calculation_sex: 'unspecified',
    ...overrides,
  };
}

test('empty draft defaults to gregorian + unspecified', () => {
  const draft = createEmptyDraft();
  assert.equal(draft.calendar_system, 'gregorian');
  assert.equal(draft.calculation_sex, 'unspecified');
  assert.equal(draft.raw_lunar_is_leap_month, null);
});

test('switching to lunar then back to gregorian clears lunar fields', () => {
  let state = createEmptyDraft();
  state = natalInputsDraftReducer(state, { type: 'set_calendar_system', value: 'lunar_chinese' });
  state = natalInputsDraftReducer(state, { type: 'set_raw_lunar_year', value: '1990' });
  state = natalInputsDraftReducer(state, { type: 'set_raw_lunar_month', value: '3' });
  state = natalInputsDraftReducer(state, { type: 'set_raw_lunar_day', value: '18' });
  state = natalInputsDraftReducer(state, { type: 'set_raw_lunar_is_leap_month', value: true });
  assert.equal(state.raw_lunar_year, '1990');
  assert.equal(state.raw_lunar_is_leap_month, true);
  state = natalInputsDraftReducer(state, { type: 'set_calendar_system', value: 'gregorian' });
  assert.equal(state.raw_lunar_year, '');
  assert.equal(state.raw_lunar_is_leap_month, null);
});

test('gregorian draft refuses to set lunar fields', () => {
  let state = createEmptyDraft();
  state = natalInputsDraftReducer(state, { type: 'set_raw_lunar_year', value: '1990' });
  state = natalInputsDraftReducer(state, { type: 'set_raw_lunar_is_leap_month', value: true });
  assert.equal(state.raw_lunar_year, '');
  assert.equal(state.raw_lunar_is_leap_month, null);
});

test('buildRawBirthInputFromDraft does not include lunar fields for gregorian', () => {
  const raw = buildRawBirthInputFromDraft(gregorianDraft());
  assert.equal(raw.calendar_system, 'gregorian');
  assert.equal(raw.lunar_year, undefined);
  assert.equal(raw.lunar_is_leap_month, undefined);
});

test('buildRawBirthInputFromDraft includes lunar_is_leap_month when supplied', () => {
  let state = natalInputsDraftReducer(createEmptyDraft(), { type: 'set_calendar_system', value: 'lunar_chinese' });
  state = natalInputsDraftReducer(state, { type: 'set_raw_local_date_text', value: '1990 lunar 3 18' });
  state = natalInputsDraftReducer(state, { type: 'set_raw_lunar_year', value: '1990' });
  state = natalInputsDraftReducer(state, { type: 'set_raw_lunar_month', value: '3' });
  state = natalInputsDraftReducer(state, { type: 'set_raw_lunar_day', value: '18' });
  state = natalInputsDraftReducer(state, { type: 'set_raw_lunar_is_leap_month', value: false });
  const raw = buildRawBirthInputFromDraft(state);
  assert.equal(raw.calendar_system, 'lunar_chinese');
  assert.equal(raw.lunar_year, 1990);
  assert.equal(raw.lunar_month, 3);
  assert.equal(raw.lunar_day, 18);
  assert.equal(raw.lunar_is_leap_month, false);
});

test('validateDraft returns ok for a complete gregorian draft', () => {
  const outcome = validateDraft(gregorianDraft());
  assert.equal(outcome.ok, true);
});

test('validateDraft surfaces typed error for invalid iso birth_datetime', () => {
  const outcome = validateDraft(gregorianDraft({ birth_datetime_utc: '1990-04-12 08:30:00' }));
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.error.code, 'natal_inputs_birth_datetime_utc_invalid');
  }
});

test('validateDraft surfaces typed error for invalid latitude', () => {
  const outcome = validateDraft(gregorianDraft({ latitude_text: '91' }));
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.error.code, 'birth_location_latitude_invalid');
});

test('validateDraft surfaces typed error for offset-only timezone', () => {
  const outcome = validateDraft(gregorianDraft({ iana_time_zone: 'UTC+08' }));
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.error.code, 'birth_location_iana_time_zone_offset_only_forbidden');
});

test('validateDraft for lunar without leap month surfaces typed error', () => {
  let state = natalInputsDraftReducer(createEmptyDraft(), { type: 'set_calendar_system', value: 'lunar_chinese' });
  state = natalInputsDraftReducer(state, { type: 'set_raw_local_date_text', value: '1990 lunar 3 18' });
  state = natalInputsDraftReducer(state, { type: 'set_raw_lunar_year', value: '1990' });
  state = natalInputsDraftReducer(state, { type: 'set_raw_lunar_month', value: '3' });
  state = natalInputsDraftReducer(state, { type: 'set_raw_lunar_day', value: '18' });
  state = natalInputsDraftReducer(state, { type: 'set_birth_datetime_utc', value: '1990-04-12T08:30:00Z' });
  state = natalInputsDraftReducer(state, { type: 'set_latitude_text', value: '31.2304' });
  state = natalInputsDraftReducer(state, { type: 'set_longitude_text', value: '121.4737' });
  state = natalInputsDraftReducer(state, { type: 'set_iana_time_zone', value: 'Asia/Shanghai' });
  state = natalInputsDraftReducer(state, { type: 'set_calculation_sex', value: 'female' });
  // Note: lunar_is_leap_month deliberately left null
  const outcome = validateDraft(state);
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.error.code, 'raw_birth_input_lunar_missing_leap_month_evidence');
});

test('hydrate_from_natal_inputs round-trips canonical inputs', () => {
  const original = buildNatalInputsFromDraft(gregorianDraft({ cultural_marker: 'natal_yang' }));
  const state = natalInputsDraftReducer(createEmptyDraft(), {
    type: 'hydrate_from_natal_inputs',
    value: original,
  });
  const rebuilt = buildNatalInputsFromDraft(state);
  assert.equal(rebuilt.birth_datetime_utc, original.birth_datetime_utc);
  assert.equal(rebuilt.calendar_system, original.calendar_system);
  assert.equal(rebuilt.calculation_sex, original.calculation_sex);
  assert.equal(rebuilt.cultural_marker, 'natal_yang');
  assert.equal(rebuilt.birth_location.iana_time_zone, original.birth_location.iana_time_zone);
});

test('userMessageForValidationError returns a string for every admitted code', () => {
  const codes = [
    'natal_inputs_birth_datetime_utc_invalid',
    'birth_location_iana_time_zone_offset_only_forbidden',
    'raw_birth_input_lunar_missing_leap_month_evidence',
  ];
  for (const code of codes) {
    const message = userMessageForValidationError({ code });
    assert.equal(typeof message, 'string');
    assert.ok(message.length > 0, `no user message for ${code}`);
  }
});

test('input UI source contains no fetch/HTTP/Tauri/Runtime call', () => {
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

test('NatalInputsForm calls validateDraft before dispatching snapshot/replace', () => {
  const source = readFileSync(new URL('../src/product/inputs/natal-inputs-form.tsx', import.meta.url), 'utf8');
  const validateIndex = source.indexOf('validateDraft(draft)');
  const dispatchIndex = source.indexOf("dispatch({ type: 'snapshot/replace'");
  assert.ok(validateIndex >= 0, 'form must call validateDraft');
  assert.ok(dispatchIndex >= 0, 'form must dispatch snapshot/replace');
  assert.ok(validateIndex < dispatchIndex, 'validateDraft must run BEFORE snapshot/replace dispatch');
});

test('NatalInputsForm has no hardcoded timezone or location default in component body', () => {
  const source = readFileSync(new URL('../src/product/inputs/natal-inputs-form.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Asia\/Shanghai/);
  assert.doesNotMatch(source, /America\//);
  assert.doesNotMatch(source, /Europe\//);
});
