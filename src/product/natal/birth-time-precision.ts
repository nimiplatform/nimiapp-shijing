import type { BirthPrecision } from '../../domain/person.ts';

export function isUnknownClockTimeChecked(precision: BirthPrecision): boolean {
  return precision === 'rough_day';
}
