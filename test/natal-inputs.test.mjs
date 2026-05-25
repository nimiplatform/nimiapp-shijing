// SJG-DATA-03 — NatalInputs + RawBirthInput + BirthLocation validator tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateBirthLocation,
  validateNatalInputs,
  validateRawBirthInput,
} from '../src/contracts/natal-inputs-validator.ts';
import { validNatalInputs, validRawBirthInput } from './_fixtures.mjs';

function inputs(overrides = {}) {
  return validNatalInputs(overrides);
}

test('fully-formed inputs validate', () => {
  assert.equal(validateNatalInputs(inputs()).ok, true);
});

test('birth_datetime_utc must be ISO-8601 UTC', () => {
  const result = validateNatalInputs(inputs({ birth_datetime_utc: '1990-04-12 08:30:00' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'natal_inputs_birth_datetime_utc_invalid');
});

test('birth_datetime_utc with offset (no Z) is rejected', () => {
  const result = validateNatalInputs(inputs({ birth_datetime_utc: '1990-04-12T08:30:00+08:00' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'natal_inputs_birth_datetime_utc_invalid');
});

test('unknown birth_precision is rejected', () => {
  const result = validateNatalInputs(inputs({ birth_precision: 'roughly' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'natal_inputs_birth_precision_invalid');
});

test('unknown calendar_system is rejected', () => {
  const result = validateNatalInputs(inputs({ calendar_system: 'julian' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'natal_inputs_calendar_system_invalid');
});

test('calendar_system mismatch between raw and canonical is rejected', () => {
  const result = validateNatalInputs(
    inputs({
      raw_birth_input: validRawBirthInput({ calendar_system: 'lunar_chinese', lunar_year: 1990, lunar_month: 3, lunar_day: 18, lunar_is_leap_month: false }),
      calendar_system: 'gregorian',
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'natal_inputs_calendar_system_mismatch_raw_and_canonical');
});

test('calculation_sex enum required', () => {
  const result = validateNatalInputs(inputs({ calculation_sex: 'other' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'natal_inputs_calculation_sex_invalid');
});

test('cultural_marker accepts admitted enum or undefined', () => {
  assert.equal(validateNatalInputs(inputs({ cultural_marker: 'natal_yang' })).ok, true);
  assert.equal(validateNatalInputs(inputs({ cultural_marker: 'unspecified' })).ok, true);
  const invalid = validateNatalInputs(inputs({ cultural_marker: 'other' }));
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.error.code, 'natal_inputs_cultural_marker_invalid');
});

test('latitude out of range is rejected', () => {
  const result = validateBirthLocation({ latitude: 91, longitude: 0, iana_time_zone: 'Asia/Shanghai' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'birth_location_latitude_invalid');
});

test('longitude out of range is rejected', () => {
  const result = validateBirthLocation({ latitude: 0, longitude: -181, iana_time_zone: 'Asia/Shanghai' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'birth_location_longitude_invalid');
});

test('offset-only timezone string is rejected', () => {
  const result = validateBirthLocation({ latitude: 0, longitude: 0, iana_time_zone: 'UTC+08' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'birth_location_iana_time_zone_offset_only_forbidden');
});

test('plain offset string is rejected as not an IANA id', () => {
  const result = validateBirthLocation({ latitude: 0, longitude: 0, iana_time_zone: '+08:00' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'birth_location_iana_time_zone_offset_only_forbidden');
});

test('empty timezone is rejected', () => {
  const result = validateBirthLocation({ latitude: 0, longitude: 0, iana_time_zone: '' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'birth_location_iana_time_zone_invalid');
});

test('IANA-formatted timezone is accepted', () => {
  assert.equal(
    validateBirthLocation({ latitude: 0, longitude: 0, iana_time_zone: 'America/New_York' }).ok,
    true,
  );
});

test('raw_birth_input gregorian must not carry lunar fields', () => {
  const result = validateRawBirthInput(validRawBirthInput({ lunar_year: 1990 }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'raw_birth_input_gregorian_must_not_carry_lunar_fields');
    assert.equal(result.error.field, 'lunar_year');
  }
});

test('raw_birth_input lunar without leap_month evidence is rejected', () => {
  const raw = validRawBirthInput({
    calendar_system: 'lunar_chinese',
    lunar_year: 1990,
    lunar_month: 3,
    lunar_day: 18,
  });
  delete raw.lunar_is_leap_month;
  const result = validateRawBirthInput(raw);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'raw_birth_input_lunar_missing_leap_month_evidence');
});

test('raw_birth_input lunar with complete fields passes', () => {
  const raw = validRawBirthInput({
    calendar_system: 'lunar_chinese',
    lunar_year: 1990,
    lunar_month: 3,
    lunar_day: 18,
    lunar_is_leap_month: false,
  });
  assert.equal(validateRawBirthInput(raw).ok, true);
});

test('raw_birth_input lunar with non-integer month is rejected', () => {
  const raw = validRawBirthInput({
    calendar_system: 'lunar_chinese',
    lunar_year: 1990,
    lunar_month: 13,
    lunar_day: 18,
    lunar_is_leap_month: false,
  });
  const result = validateRawBirthInput(raw);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'raw_birth_input_lunar_field_invalid');
    assert.equal(result.error.field, 'lunar_month');
  }
});

test('raw_birth_input empty local_date_text is rejected', () => {
  const raw = validRawBirthInput({ local_date_text: '' });
  const result = validateRawBirthInput(raw);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'raw_birth_input_local_date_text_empty');
});
