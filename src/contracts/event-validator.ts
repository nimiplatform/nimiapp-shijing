// SJG-DATA-05 — Event validator.

import type { Event } from '../domain/event.ts';
import { subjectRefEquals, subjectRefKey } from '../domain/subject-ref.ts';

export type EventValidationError =
  | { code: 'event_participants_include_primary_subject' }
  | { code: 'event_participants_duplicate'; key: string };

export type EventValidationResult = { ok: true } | { ok: false; error: EventValidationError };

export function validateEvent(event: Event): EventValidationResult {
  const seen = new Set<string>();
  for (const participant of event.participants) {
    if (subjectRefEquals(participant, event.primary_subject)) {
      return { ok: false, error: { code: 'event_participants_include_primary_subject' } };
    }
    const key = subjectRefKey(participant);
    if (seen.has(key)) {
      return { ok: false, error: { code: 'event_participants_duplicate', key } };
    }
    seen.add(key);
  }
  return { ok: true };
}
