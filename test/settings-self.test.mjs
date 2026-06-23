// W-c03 — Settings > Self editor state tests.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildSelfNatalInputs,
  commitSelfDraft,
  selfDraftFromSpace,
} from '../src/product/self/self-editor-state.ts';
import { buildEmptyShiJingSpace } from '../src/product/dev/initial-space.ts';
import { isUnknownClockTimeChecked } from '../src/product/natal/birth-time-precision.ts';
import { validShiJingSpace } from './_fixtures.mjs';

const selfEditorSource = readFileSync(
  new URL('../src/product/self/self-editor.tsx', import.meta.url),
  'utf8',
);

function gregorianDraft(overrides = {}) {
  return {
    calendar_system: 'gregorian',
    local_date_text: '1990-04-12',
    local_time_text: '08:30',
    place_text: 'Shanghai',
    lunar_year: '',
    lunar_month: '',
    lunar_day: '',
    lunar_is_leap_month: 'unanswered',
    birth_datetime_utc: '1990-04-12T00:30:00Z',
    birth_precision: 'exact',
    calculation_sex: 'unspecified',
    cultural_marker: '',
    latitude: '31.2304',
    longitude: '121.4737',
    iana_time_zone: 'Asia/Shanghai',
    place_name: 'Shanghai',
    notes: '',
    ...overrides,
  };
}

test('selfDraftFromSpace mirrors snapshot natal inputs', () => {
  const draft = selfDraftFromSpace(validShiJingSpace());
  assert.equal(draft.calendar_system, 'gregorian');
  assert.equal(draft.birth_precision, 'exact');
});

test('empty self draft defaults to exact precision so unknown-time is not auto-checked', () => {
  const draft = selfDraftFromSpace(buildEmptyShiJingSpace('u_empty'));
  assert.equal(draft.birth_precision, 'exact');
  assert.equal(isUnknownClockTimeChecked(draft.birth_precision), false);
});

test('unknown clock-time checkbox is checked only for rough_day precision', () => {
  assert.equal(isUnknownClockTimeChecked('rough_day'), true);
  assert.equal(isUnknownClockTimeChecked('exact'), false);
  assert.equal(isUnknownClockTimeChecked('rough_month'), false);
  assert.equal(isUnknownClockTimeChecked('rough_year'), false);
  assert.equal(isUnknownClockTimeChecked('unknown'), false);
});

test('buildSelfNatalInputs returns a valid NatalInputs for gregorian draft', () => {
  const r = buildSelfNatalInputs(gregorianDraft());
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.inputs.calendar_system, 'gregorian');
    assert.equal(r.inputs.birth_location.latitude, 31.2304);
  }
});

test('buildSelfNatalInputs derives birth_datetime_utc from local date/time + IANA zone', () => {
  // 1990-04-12 08:30 in Asia/Shanghai (UTC+8) → 1990-04-12T00:30:00Z.
  const r = buildSelfNatalInputs(gregorianDraft({ birth_datetime_utc: 'ignored-now' }));
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.inputs.birth_datetime_utc, '1990-04-12T00:30:00.000Z');
});

test('buildSelfNatalInputs rejects an unparseable local date', () => {
  const r = buildSelfNatalInputs(gregorianDraft({ local_date_text: 'nope' }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'birth_datetime_underivable');
});

test('buildSelfNatalInputs rejects missing birth location before coordinate validation', () => {
  const r = buildSelfNatalInputs(gregorianDraft({
    place_text: '',
    place_name: '',
    latitude: '',
    longitude: '',
    iana_time_zone: '',
  }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'birth_location_required');
});

test('buildSelfNatalInputs resolves a known typed birth location without explicit candidate click', () => {
  const r = buildSelfNatalInputs(gregorianDraft({
    place_text: '广州',
    place_name: '',
    latitude: '',
    longitude: '',
    iana_time_zone: '',
  }));
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.inputs.birth_location.iana_time_zone, 'Asia/Shanghai');
    assert.ok(Math.abs(r.inputs.birth_location.latitude - 23.13) < 0.5);
    assert.ok(Math.abs(r.inputs.birth_location.longitude - 113.26) < 0.5);
  }
});

test('buildSelfNatalInputs rejects an unknown typed birth location as unresolved', () => {
  const r = buildSelfNatalInputs(gregorianDraft({
    place_text: 'zzzznowhere',
    place_name: '',
    latitude: '',
    longitude: '',
    iana_time_zone: '',
  }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'birth_location_unresolved');
});

test('buildSelfNatalInputs rejects non-numeric latitude', () => {
  const r = buildSelfNatalInputs(gregorianDraft({ latitude: 'whoops' }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'latitude_invalid');
});

test('buildSelfNatalInputs rejects lunar draft missing year', () => {
  const r = buildSelfNatalInputs(
    gregorianDraft({ calendar_system: 'lunar_chinese', lunar_year: '', lunar_month: '3', lunar_day: '15' }),
  );
  assert.equal(r.ok, false);
});

test('commitSelfDraft commits a valid draft and surfaces validator errors otherwise', () => {
  const space = validShiJingSpace();
  const ok = commitSelfDraft(space, gregorianDraft());
  assert.equal(ok.ok, true);
  // birth_datetime_utc is now derived, so an out-of-range latitude is used to
  // exercise the validator-error path (builds OK, fails validateNatalInputs).
  const bad = commitSelfDraft(space, gregorianDraft({ latitude: '999' }));
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.error.code, 'natal_inputs_invalid');
});

test('inline self editor surfaces a saved status after a successful save', () => {
  assert.match(selfEditorSource, /setSavedNoticeVisible\(true\)/);
  assert.match(selfEditorSource, /role="status"/);
  assert.match(selfEditorSource, /copy\.common\.saved/);
});

test('inline self editor refreshes its draft when the persisted snapshot changes', () => {
  assert.match(selfEditorSource, /if \(!inlineEditor\) return;/);
  assert.match(selfEditorSource, /setDraft\(selfDraftFromSpace\(state\.snapshot\)\);/);
  assert.match(selfEditorSource, /\[inlineEditor, state\.snapshot\]/);
});
