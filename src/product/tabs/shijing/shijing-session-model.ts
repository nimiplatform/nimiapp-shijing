import type { Conversation } from '../../../domain/conversation.ts';
import type { ConcernTag } from '../../../domain/concern-tag.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { trimmedConcernLabel } from '../../concern-tags/concern-presets.ts';
import type { ProductCopy } from '../../i18n/copy.ts';
import type { ConversationFollowUpFailure } from '../../conversations/conversation-follow-up.ts';
import { consultationMirrorScopeFor } from '../mirror-scope-helpers.ts';

export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function firstUserQuestion(conv: Conversation, copy: ProductCopy): string {
  const turn = conv.turns.find((t) => t.role === 'user');
  return turn?.body ?? copy.shijing.unrecordedQuestion;
}

export function concernMatchesQuestion(question: string, tag: ConcernTag): boolean {
  const q = question.trim().toLocaleLowerCase();
  if (q.length === 0) return false;
  const tokens = [
    tag.label,
    trimmedConcernLabel(tag),
    tag.prompt_text,
    ...tag.parsed_topics,
  ]
    .map((item) => item.trim().toLocaleLowerCase())
    .filter((item) => item.length > 0);
  return tokens.some((token) => q.includes(token) || token.includes(q));
}

export function conversationMatchesConcernFilter(
  conversation: Conversation,
  selectedConcernIds: readonly string[],
): boolean {
  if (selectedConcernIds.length === 0) return true;
  return selectedConcernIds.some((id) => conversation.concern_tag_refs.includes(id));
}

export function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function followUpFailureAsReadingFailure(
  failure: ConversationFollowUpFailure,
  sourceReadingIds: readonly string[],
): ReadingGenerationFailure {
  if (failure.kind === 'chat_bridge_failed') {
    return {
      kind: 'runtime_ai_failed',
      mirror_kind: 'shijing',
      mirror_scope: consultationMirrorScopeFor(sourceReadingIds),
      detail: failure.detail,
    };
  }
  return {
    kind: 'pipeline_stage_failed',
    mirror_kind: 'shijing',
    mirror_scope: consultationMirrorScopeFor(sourceReadingIds),
    stage: `conversation_follow_up.${failure.kind}`,
    detail: failure.detail,
  };
}

// History entry timestamp: today → `HH:mm`, otherwise → `M月D日`.
export function sessionTimeLabel(iso: string, copy: ProductCopy): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  const todayIso = new Date().toISOString().slice(0, 10);
  const dateIso = `${m[1]}-${m[2]}-${m[3]}`;
  if (dateIso === todayIso) return `${m[4]}:${m[5]}`;
  return copy.shijing.sessionDateLabel(Number(m[2]), Number(m[3]));
}

export interface SessionGroup {
  readonly label: string;
  readonly items: readonly Conversation[];
}

// Pure presentation grouping of the history rail into 今天 / 本周 / 更早.
// No data is mutated; ordering relies on the desc-sorted input.
export function groupConversations(
  convs: readonly Conversation[],
  copy: ProductCopy,
): readonly SessionGroup[] {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const weekAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const today: Conversation[] = [];
  const week: Conversation[] = [];
  const earlier: Conversation[] = [];
  for (const c of convs) {
    const dateIso = c.created_at.slice(0, 10);
    if (dateIso === todayIso) today.push(c);
    else if (Date.parse(c.created_at) >= weekAgoMs) week.push(c);
    else earlier.push(c);
  }
  return [
    { label: copy.shijing.sessionGroups.today, items: today },
    { label: copy.shijing.sessionGroups.week, items: week },
    { label: copy.shijing.sessionGroups.earlier, items: earlier },
  ].filter((g) => g.items.length > 0);
}

// A record seeded into the consultation via 去时镜问这条 — either a past
// EventMemory or a future PlanItem, flattened to a common shape for the
// seed-context card.
export interface SeedItem {
  readonly kind: 'memory' | 'plan';
  readonly id: string;
  readonly date: string;
  readonly body: string;
}
