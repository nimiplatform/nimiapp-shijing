// SJG-DATA-04 — ConcernTag validator.

import {
  CONCERN_TAG_ACTIVE_LIMIT,
  CONCERN_TAG_LABEL_MAX_LENGTH,
  CONCERN_TAG_STATUSES,
  type ConcernTag,
  type MentionRef,
} from '../domain/concern-tag.ts';
import { validateSubjectRef } from './subject-ref-validator.ts';

export type ConcernTagValidationError =
  | { code: 'concern_tag_id_empty' }
  | { code: 'concern_tag_label_empty' }
  | { code: 'concern_tag_label_too_long'; max: number; received: number }
  | { code: 'concern_tag_status_invalid'; received: unknown }
  | { code: 'concern_tag_sort_order_not_finite_integer'; received: unknown }
  | { code: 'concern_tag_parsed_topic_empty'; index: number }
  | { code: 'concern_tag_mention_token_empty'; index: number }
  | { code: 'concern_tag_mention_resolved_ref_invalid'; index: number; reason: string }
  | { code: 'concern_tag_mention_resolved_and_unresolved_conflict'; index: number }
  | { code: 'concern_tag_mention_missing_resolution_and_text'; index: number }
  | { code: 'concern_tag_created_at_not_iso_utc' }
  | { code: 'concern_tag_updated_at_not_iso_utc' };

export type ConcernTagValidationResult =
  | { ok: true }
  | { ok: false; error: ConcernTagValidationError };

const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export function validateMentionRef(
  mention: MentionRef,
  index: number,
): ConcernTagValidationResult {
  if (typeof mention.token !== 'string' || mention.token.length === 0) {
    return { ok: false, error: { code: 'concern_tag_mention_token_empty', index } };
  }
  const hasResolved = mention.resolved_subject_ref !== undefined;
  const hasUnresolved =
    typeof mention.unresolved_text === 'string' && mention.unresolved_text.length > 0;
  if (hasResolved && hasUnresolved) {
    return {
      ok: false,
      error: { code: 'concern_tag_mention_resolved_and_unresolved_conflict', index },
    };
  }
  if (!hasResolved && !hasUnresolved) {
    return {
      ok: false,
      error: { code: 'concern_tag_mention_missing_resolution_and_text', index },
    };
  }
  if (hasResolved) {
    const refCheck = validateSubjectRef(mention.resolved_subject_ref);
    if (!refCheck.ok) {
      return {
        ok: false,
        error: {
          code: 'concern_tag_mention_resolved_ref_invalid',
          index,
          reason: refCheck.error.code,
        },
      };
    }
  }
  return { ok: true };
}

export function validateConcernTag(tag: ConcernTag): ConcernTagValidationResult {
  if (typeof tag.id !== 'string' || tag.id.length === 0) {
    return { ok: false, error: { code: 'concern_tag_id_empty' } };
  }
  if (typeof tag.label !== 'string' || tag.label.length === 0) {
    return { ok: false, error: { code: 'concern_tag_label_empty' } };
  }
  if (tag.label.length > CONCERN_TAG_LABEL_MAX_LENGTH) {
    return {
      ok: false,
      error: {
        code: 'concern_tag_label_too_long',
        max: CONCERN_TAG_LABEL_MAX_LENGTH,
        received: tag.label.length,
      },
    };
  }
  if (!CONCERN_TAG_STATUSES.includes(tag.status)) {
    return { ok: false, error: { code: 'concern_tag_status_invalid', received: tag.status } };
  }
  if (
    typeof tag.sort_order !== 'number' ||
    !Number.isFinite(tag.sort_order) ||
    !Number.isInteger(tag.sort_order)
  ) {
    return {
      ok: false,
      error: { code: 'concern_tag_sort_order_not_finite_integer', received: tag.sort_order },
    };
  }
  for (let i = 0; i < tag.parsed_topics.length; i += 1) {
    const topic = tag.parsed_topics[i]!;
    if (typeof topic !== 'string' || topic.length === 0) {
      return { ok: false, error: { code: 'concern_tag_parsed_topic_empty', index: i } };
    }
  }
  for (let i = 0; i < tag.mention_refs.length; i += 1) {
    const refCheck = validateMentionRef(tag.mention_refs[i]!, i);
    if (!refCheck.ok) return refCheck;
  }
  if (!ISO_UTC_PATTERN.test(tag.created_at)) {
    return { ok: false, error: { code: 'concern_tag_created_at_not_iso_utc' } };
  }
  if (!ISO_UTC_PATTERN.test(tag.updated_at)) {
    return { ok: false, error: { code: 'concern_tag_updated_at_not_iso_utc' } };
  }
  return { ok: true };
}

export type ConcernTagCollectionValidationError =
  | { code: 'concern_tags_active_limit_exceeded'; limit: number; received: number }
  | { code: 'concern_tags_duplicate_id'; id: string }
  | { code: 'concern_tag_invalid'; id: string; reason: string };

export type ConcernTagCollectionValidationResult =
  | { ok: true }
  | { ok: false; error: ConcernTagCollectionValidationError };

export function validateConcernTagCollection(
  tags: readonly ConcernTag[],
): ConcernTagCollectionValidationResult {
  const seen = new Set<string>();
  let activeCount = 0;
  for (const tag of tags) {
    const check = validateConcernTag(tag);
    if (!check.ok) {
      return { ok: false, error: { code: 'concern_tag_invalid', id: tag.id, reason: check.error.code } };
    }
    if (seen.has(tag.id)) {
      return { ok: false, error: { code: 'concern_tags_duplicate_id', id: tag.id } };
    }
    seen.add(tag.id);
    if (tag.status === 'active') activeCount += 1;
  }
  if (activeCount > CONCERN_TAG_ACTIVE_LIMIT) {
    return {
      ok: false,
      error: {
        code: 'concern_tags_active_limit_exceeded',
        limit: CONCERN_TAG_ACTIVE_LIMIT,
        received: activeCount,
      },
    };
  }
  return { ok: true };
}
