import type { BirthPrecision, CalculationSex, CalendarSystem, NatalInputs, RawBirthInput } from '../../domain/person.ts';

export interface NaturalBirthDraft {
  readonly calendar_system: CalendarSystem;
  readonly gregorian_date_text: string;
  readonly lunar_year_text: string;
  readonly lunar_month_text: string;
  readonly lunar_day_text: string;
  readonly lunar_is_leap_month: boolean | null;
  readonly local_time_text: string;
  readonly birth_precision: BirthPrecision;
  readonly place_text: string;
  readonly calculation_sex: CalculationSex;
  readonly notes: string;
}

export type NaturalBirthDraftAction =
  | { type: 'set_calendar_system'; value: CalendarSystem }
  | { type: 'set_gregorian_date_text'; value: string }
  | { type: 'set_lunar_year_text'; value: string }
  | { type: 'set_lunar_month_text'; value: string }
  | { type: 'set_lunar_day_text'; value: string }
  | { type: 'set_lunar_is_leap_month'; value: boolean | null }
  | { type: 'set_local_time_text'; value: string }
  | { type: 'set_birth_precision'; value: BirthPrecision }
  | { type: 'set_place_text'; value: string }
  | { type: 'set_calculation_sex'; value: CalculationSex }
  | { type: 'set_notes'; value: string }
  | { type: 'hydrate_from_natal_inputs'; value: NatalInputs };

export function createEmptyNaturalBirthDraft(): NaturalBirthDraft {
  return {
    calendar_system: 'gregorian',
    gregorian_date_text: '',
    lunar_year_text: '',
    lunar_month_text: '',
    lunar_day_text: '',
    lunar_is_leap_month: null,
    local_time_text: '',
    birth_precision: 'exact',
    place_text: '',
    calculation_sex: 'unspecified',
    notes: '',
  };
}

function textFromNumber(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

function hydrateFromNatalInputs(inputs: NatalInputs): NaturalBirthDraft {
  const raw: RawBirthInput = inputs.raw_birth_input;
  return {
    calendar_system: raw.calendar_system,
    gregorian_date_text: raw.calendar_system === 'gregorian' ? raw.local_date_text : '',
    lunar_year_text: textFromNumber(raw.lunar_year),
    lunar_month_text: textFromNumber(raw.lunar_month),
    lunar_day_text: textFromNumber(raw.lunar_day),
    lunar_is_leap_month: raw.lunar_is_leap_month ?? null,
    local_time_text: raw.local_time_text ?? '',
    birth_precision: inputs.birth_precision,
    place_text: raw.place_text ?? inputs.birth_location.place_name ?? '',
    calculation_sex: inputs.calculation_sex,
    notes: inputs.notes ?? '',
  };
}

function clearLunarFields(draft: NaturalBirthDraft): NaturalBirthDraft {
  return {
    ...draft,
    lunar_year_text: '',
    lunar_month_text: '',
    lunar_day_text: '',
    lunar_is_leap_month: null,
  };
}

export function naturalBirthDraftReducer(
  state: NaturalBirthDraft,
  action: NaturalBirthDraftAction,
): NaturalBirthDraft {
  switch (action.type) {
    case 'set_calendar_system':
      if (state.calendar_system === action.value) return state;
      if (action.value === 'gregorian') {
        return { ...clearLunarFields(state), calendar_system: 'gregorian' };
      }
      return { ...state, calendar_system: 'lunar_chinese', gregorian_date_text: '' };
    case 'set_gregorian_date_text':
      return state.calendar_system === 'gregorian' ? { ...state, gregorian_date_text: action.value } : state;
    case 'set_lunar_year_text':
      return state.calendar_system === 'lunar_chinese' ? { ...state, lunar_year_text: action.value } : state;
    case 'set_lunar_month_text':
      return state.calendar_system === 'lunar_chinese' ? { ...state, lunar_month_text: action.value } : state;
    case 'set_lunar_day_text':
      return state.calendar_system === 'lunar_chinese' ? { ...state, lunar_day_text: action.value } : state;
    case 'set_lunar_is_leap_month':
      return state.calendar_system === 'lunar_chinese' ? { ...state, lunar_is_leap_month: action.value } : state;
    case 'set_local_time_text':
      return { ...state, local_time_text: action.value };
    case 'set_birth_precision':
      return { ...state, birth_precision: action.value };
    case 'set_place_text':
      return { ...state, place_text: action.value };
    case 'set_calculation_sex':
      return { ...state, calculation_sex: action.value };
    case 'set_notes':
      return { ...state, notes: action.value };
    case 'hydrate_from_natal_inputs':
      return hydrateFromNatalInputs(action.value);
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}

