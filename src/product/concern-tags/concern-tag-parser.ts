// SJG-DATA-04 + storybook S02/S03 — ConcernTag input parser + mention
// resolver.
//
// User input is a single free-text string. The parser extracts:
//   - parsed_topics:  every `#token` (deduped, lowercased, # stripped)
//   - mention_refs:   every `@token`; resolved to an existing Person by
//                     case-insensitive display_name match, otherwise
//                     preserved as unresolved text (the literal `@token`)
//   - label:          the leading slice of input before the first parsed
//                     token, trimmed
//   - prompt_text:    the trailing free text after the last parsed token,
//                     trimmed
//
// The parser NEVER creates a Person; resolution is read-only against
// the supplied persons[].

import type { MentionRef } from '../../domain/concern-tag.ts';
import type { Person } from '../../domain/person.ts';

const TOKEN_PATTERN = /([#@])([^\s#@]+)/g;

export interface ParsedConcernTagInput {
  readonly raw_input: string;
  readonly label: string;
  readonly parsed_topics: readonly string[];
  readonly mention_refs: readonly MentionRef[];
  readonly prompt_text: string;
  readonly unresolved_mention_count: number;
}

export interface ParseConcernTagInputOptions {
  readonly persons: readonly Person[];
}

function findPersonByDisplayName(
  persons: readonly Person[],
  text: string,
): Person | undefined {
  const target = text.trim().toLowerCase();
  if (target.length === 0) return undefined;
  return persons.find((p) => p.display_name.trim().toLowerCase() === target);
}

export function parseConcernTagInput(
  input: string,
  options: ParseConcernTagInputOptions,
): ParsedConcernTagInput {
  const raw = typeof input === 'string' ? input : '';
  const topics: string[] = [];
  const seenTopics = new Set<string>();
  const mentionRefs: MentionRef[] = [];
  let firstTokenIndex: number | null = null;
  let lastTokenEnd = 0;
  let unresolvedCount = 0;

  TOKEN_PATTERN.lastIndex = 0;
  for (;;) {
    const match = TOKEN_PATTERN.exec(raw);
    if (!match) break;
    const [literal, prefix, body] = match;
    if (firstTokenIndex === null) firstTokenIndex = match.index;
    lastTokenEnd = match.index + literal.length;
    if (prefix === '#') {
      const normalized = body.toLowerCase();
      if (!seenTopics.has(normalized) && normalized.length > 0) {
        seenTopics.add(normalized);
        topics.push(normalized);
      }
    } else {
      // '@'
      const person = findPersonByDisplayName(options.persons, body);
      if (person) {
        mentionRefs.push({
          token: literal,
          resolved_subject_ref: { kind: 'person', id: person.id },
        });
      } else {
        mentionRefs.push({
          token: literal,
          unresolved_text: literal,
        });
        unresolvedCount += 1;
      }
    }
  }

  const labelEnd = firstTokenIndex ?? raw.length;
  const label = raw.slice(0, labelEnd).trim();
  const tail = raw.slice(lastTokenEnd).trim();
  const prompt_text = tail;

  return {
    raw_input: raw,
    label,
    parsed_topics: topics,
    mention_refs: mentionRefs,
    prompt_text,
    unresolved_mention_count: unresolvedCount,
  };
}

export function deriveConcernTagLabelForDisplay(parsed: ParsedConcernTagInput): string {
  if (parsed.label.length > 0) return parsed.label;
  if (parsed.parsed_topics.length > 0) return `#${parsed.parsed_topics[0]}`;
  if (parsed.mention_refs.length > 0) return parsed.mention_refs[0]!.token;
  return parsed.raw_input.trim();
}
