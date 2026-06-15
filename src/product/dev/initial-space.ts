import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { SCAFFOLD_BIRTH_DATETIME_UTC } from '../subjects/scaffold-natal-inputs.ts';

export function buildEmptyShiJingSpace(userId: string): ShiJingSpace {
  return {
    user_id: userId,
    self_subject: {
      natal_inputs: {
        raw_birth_input: { calendar_system: 'gregorian', local_date_text: '2000-01-01' },
        birth_datetime_utc: SCAFFOLD_BIRTH_DATETIME_UTC,
        birth_precision: 'unknown',
        calendar_system: 'gregorian',
        birth_location: { latitude: 0, longitude: 0, iana_time_zone: 'Etc/UTC' },
        calculation_sex: 'unspecified',
      },
    },
    persons: [],
    concern_tags: [],
    event_memories: [],
    plan_items: [],
    readings: [],
    conversations: [],
    settings: {
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
    },
  };
}
