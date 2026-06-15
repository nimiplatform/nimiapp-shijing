import type { NatalInputs } from '../../domain/person.ts';

export const SCAFFOLD_BIRTH_DATETIME_UTC = '2000-01-01T00:00:00Z';

export function isScaffoldNatalInputs(inputs: NatalInputs): boolean {
  const raw = inputs.raw_birth_input;
  const location = inputs.birth_location;
  return (
    raw.calendar_system === 'gregorian' &&
    raw.local_date_text === '2000-01-01' &&
    raw.local_time_text === undefined &&
    raw.place_text === undefined &&
    inputs.birth_datetime_utc === SCAFFOLD_BIRTH_DATETIME_UTC &&
    inputs.birth_precision === 'unknown' &&
    inputs.calendar_system === 'gregorian' &&
    inputs.calculation_sex === 'unspecified' &&
    location.latitude === 0 &&
    location.longitude === 0 &&
    location.iana_time_zone === 'Etc/UTC' &&
    location.place_name === undefined
  );
}
