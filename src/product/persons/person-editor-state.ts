// W-c03 Settings > People — pure-state helpers for managing
// ShiJingSpace.persons[].

import type { Person } from '../../domain/person.ts';
import { PERSON_RELATION_MAX_LENGTH } from '../../domain/person.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { validateNatalInputs } from '../../contracts/natal-inputs-validator.ts';
import {
  natalDraftFromInputs,
  type SelfNatalDraft,
} from '../self/self-editor-state.ts';
import { findReferencesToPerson } from './dangling-reference.ts';

export interface PersonMetaDraft {
  readonly id: string;
  readonly display_name: string;
  readonly relation: string;
  readonly consent_state: Person['consent_state'];
  readonly notes: string;
}

export interface PersonEditorDraft {
  readonly meta: PersonMetaDraft;
  readonly natal: SelfNatalDraft;
}

export function personDraftFromPerson(person: Person): PersonEditorDraft {
  return {
    meta: {
      id: person.id,
      display_name: person.display_name,
      relation: person.relation ?? '',
      consent_state: person.consent_state,
      notes: person.notes ?? '',
    },
    natal: natalDraftFromInputs(person.natal_inputs),
  };
}

export type PersonUpsertError =
  | { code: 'person_id_empty' }
  | { code: 'person_display_name_empty' }
  | { code: 'person_consent_state_invalid'; received: unknown }
  | { code: 'person_relation_too_long' }
  | { code: 'person_duplicate_id'; id: string }
  | { code: 'person_natal_inputs_invalid'; reason: string };

export type PersonUpsertOutcome =
  | { ok: true; next_space: ShiJingSpace }
  | { ok: false; error: PersonUpsertError };

function isAllowedConsent(state: unknown): state is Person['consent_state'] {
  return state === 'owner_recorded' || state === 'subject_consented' || state === 'withheld';
}

export function upsertPerson(space: ShiJingSpace, person: Person): PersonUpsertOutcome {
  if (typeof person.id !== 'string' || person.id.length === 0) {
    return { ok: false, error: { code: 'person_id_empty' } };
  }
  if (typeof person.display_name !== 'string' || person.display_name.trim().length === 0) {
    return { ok: false, error: { code: 'person_display_name_empty' } };
  }
  if (!isAllowedConsent(person.consent_state)) {
    return { ok: false, error: { code: 'person_consent_state_invalid', received: person.consent_state } };
  }
  if (person.relation !== undefined && person.relation.length > PERSON_RELATION_MAX_LENGTH) {
    return { ok: false, error: { code: 'person_relation_too_long' } };
  }
  const natalCheck = validateNatalInputs(person.natal_inputs);
  if (!natalCheck.ok) {
    return {
      ok: false,
      error: { code: 'person_natal_inputs_invalid', reason: natalCheck.error.code },
    };
  }
  const existingIdx = space.persons.findIndex((p) => p.id === person.id);
  if (existingIdx === -1) {
    return {
      ok: true,
      next_space: { ...space, persons: [...space.persons, person] },
    };
  }
  const persons = space.persons.slice();
  persons[existingIdx] = person;
  return { ok: true, next_space: { ...space, persons } };
}

export type PersonDeleteError =
  | { code: 'person_not_found'; id: string }
  | { code: 'person_has_dangling_references'; id: string; references: readonly string[] };

export type PersonDeleteOutcome =
  | { ok: true; next_space: ShiJingSpace }
  | { ok: false; error: PersonDeleteError };

export function deletePerson(space: ShiJingSpace, personId: string): PersonDeleteOutcome {
  const existing = space.persons.find((p) => p.id === personId);
  if (!existing) return { ok: false, error: { code: 'person_not_found', id: personId } };
  const refs = findReferencesToPerson(space, personId);
  if (refs.length > 0) {
    return {
      ok: false,
      error: {
        code: 'person_has_dangling_references',
        id: personId,
        references: refs.map((r) => r.via),
      },
    };
  }
  return {
    ok: true,
    next_space: { ...space, persons: space.persons.filter((p) => p.id !== personId) },
  };
}
