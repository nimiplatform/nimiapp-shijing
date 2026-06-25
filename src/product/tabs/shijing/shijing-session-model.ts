import type { Conversation } from '../../../domain/conversation.ts';
import {
  CONCERN_TAG_ACTIVE_LIMIT,
  type ConcernTag,
} from '../../../domain/concern-tag.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import {
  CONCERN_PRESETS,
  trimmedConcernLabel,
  type ConcernPreset,
} from '../../concern-tags/concern-presets.ts';
import type { ProductCopy } from '../../i18n/copy.ts';
import type { ConversationFollowUpFailure } from '../../conversations/conversation-follow-up.ts';
import { consultationMirrorScopeFor } from '../mirror-scope-helpers.ts';

export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const CONCERN_TOPIC_ALIASES: Record<string, readonly string[]> = {
  love: ['姻缘', '感情', '关系', '恋爱', '伴侣', '婚姻', 'love', 'relationship'],
  career: [
    '事业',
    '工作',
    '职场',
    '职业',
    '项目',
    '产出',
    '上班',
    '换工作',
    '跳槽',
    '升职',
    '创业',
    'career',
    'work',
    'job',
    'office',
    'profession',
    'business',
  ],
  body: ['身体', '健康', '状态', '睡眠', '精力', '休整', 'body', 'health'],
  health: ['身体', '健康', '状态', '睡眠', '精力', '休整', 'body', 'health'],
  wealth: ['财富', '财运', '钱', '收入', '现金流', '回报', 'wealth', 'finance', 'money'],
  study: ['学业', '学习', '考试', '研究', '课程', 'study', 'school', 'exam'],
  family: ['家人', '家庭', '父母', '伴侣', '孩子', 'family', 'home'],
};

function normalizedText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function topicAliases(topics: readonly string[]): readonly string[] {
  return topics.flatMap((topic) => CONCERN_TOPIC_ALIASES[normalizedText(topic)] ?? []);
}

function tokenMatchesQuestion(question: string, token: string): boolean {
  const q = normalizedText(question);
  const t = normalizedText(token);
  return q.length > 0 && t.length > 0 && (q.includes(t) || t.includes(q));
}

function tokensMatchQuestion(question: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => tokenMatchesQuestion(question, token));
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

function concernMatchesArchiveSuggestion(question: string, tag: ConcernTag): boolean {
  return tokensMatchQuestion(question, [
    tag.label,
    trimmedConcernLabel(tag),
    tag.prompt_text,
    ...tag.parsed_topics,
    ...topicAliases(tag.parsed_topics),
  ]);
}

function presetMatchesQuestion(question: string, preset: ConcernPreset): boolean {
  return tokensMatchQuestion(question, [
    preset.label,
    preset.label.replace(/^#/, ''),
    preset.subtitle,
    ...preset.topics,
    ...topicAliases(preset.topics),
  ]);
}

export type ArchiveConcernOptionSource = 'active' | 'archived' | 'preset';

export interface ArchiveConcernOption {
  readonly option_id: string;
  readonly label: string;
  readonly source: ArchiveConcernOptionSource;
  readonly tag_id?: string;
  readonly preset?: ConcernPreset;
}

export interface SuggestArchiveConcernOptionsInput {
  readonly question: string;
  readonly tags: readonly ConcernTag[];
  readonly dismissedOptionIds: readonly string[];
  readonly selectedTagIds: readonly string[];
  readonly limit?: number;
}

export interface ActivateArchiveConcernOptionInput {
  readonly option: ArchiveConcernOption | undefined;
  readonly tags: readonly ConcernTag[];
  readonly now: string;
  readonly newId: string;
  readonly activeLimit?: number;
}

export interface ArchiveConcernActivationResult {
  readonly tags: readonly ConcernTag[];
  readonly selected_tag_id: string;
  readonly option_id: string;
}

function archiveOptionFromTag(tag: ConcernTag): ArchiveConcernOption {
  return {
    option_id: tag.id,
    label: trimmedConcernLabel(tag),
    source: tag.status === 'archived' ? 'archived' : 'active',
    tag_id: tag.id,
  };
}

function archiveOptionFromPreset(preset: ConcernPreset): ArchiveConcernOption {
  return {
    option_id: `preset:${preset.label}`,
    label: preset.label.replace(/^#/, ''),
    source: 'preset',
    preset,
  };
}

function uniqueArchiveOptions(options: readonly ArchiveConcernOption[]): readonly ArchiveConcernOption[] {
  const seen = new Set<string>();
  const next: ArchiveConcernOption[] = [];
  for (const option of options) {
    if (seen.has(option.option_id)) continue;
    seen.add(option.option_id);
    next.push(option);
  }
  return next;
}

export function suggestArchiveConcernOptions(
  input: SuggestArchiveConcernOptionsInput,
): readonly ArchiveConcernOption[] {
  const limit = input.limit ?? 3;
  const active = input.tags
    .filter((tag) => tag.status === 'active')
    .sort((a, b) => a.sort_order - b.sort_order);
  const archived = input.tags
    .filter((tag) => tag.status === 'archived')
    .sort((a, b) => a.sort_order - b.sort_order);
  const selected = input.selectedTagIds
    .map((id) => input.tags.find((tag) => tag.id === id))
    .filter((tag): tag is ConcernTag => tag != null)
    .map(archiveOptionFromTag);
  const hasQuestion = normalizedText(input.question).length > 0;
  const matchedActive = hasQuestion
    ? active.filter((tag) => concernMatchesArchiveSuggestion(input.question, tag)).map(archiveOptionFromTag)
    : [];
  const matchedArchived = hasQuestion
    ? archived.filter((tag) => concernMatchesArchiveSuggestion(input.question, tag)).map(archiveOptionFromTag)
    : [];
  const matchedPresets = hasQuestion
    ? CONCERN_PRESETS
        .filter((preset) => !input.tags.some((tag) => tag.label === preset.label))
        .filter((preset) => presetMatchesQuestion(input.question, preset))
        .map(archiveOptionFromPreset)
    : [];
  const fallbackActive = matchedActive.length === 0 ? active.map(archiveOptionFromTag) : [];

  return uniqueArchiveOptions([
    ...selected,
    ...matchedActive,
    ...matchedArchived,
    ...matchedPresets,
    ...fallbackActive,
  ])
    .filter(
      (option) =>
        !input.dismissedOptionIds.includes(option.option_id) ||
        (option.tag_id != null && input.selectedTagIds.includes(option.tag_id)),
    )
    .slice(0, limit);
}

export function activateArchiveConcernOption(
  input: ActivateArchiveConcernOptionInput,
): ArchiveConcernActivationResult | null {
  const { option } = input;
  if (!option) return null;
  const activeLimit = input.activeLimit ?? CONCERN_TAG_ACTIVE_LIMIT;
  const activeCount = input.tags.filter((tag) => tag.status === 'active').length;
  const activateExisting = (tag: ConcernTag): ArchiveConcernActivationResult | null => {
    if (tag.status === 'active') {
      return { tags: input.tags, selected_tag_id: tag.id, option_id: option.option_id };
    }
    if (activeCount >= activeLimit) return null;
    return {
      tags: input.tags.map((candidate) =>
        candidate.id === tag.id
          ? { ...candidate, status: 'active', updated_at: input.now }
          : candidate,
      ),
      selected_tag_id: tag.id,
      option_id: option.option_id,
    };
  };

  if (option.tag_id) {
    const tag = input.tags.find((candidate) => candidate.id === option.tag_id);
    return tag ? activateExisting(tag) : null;
  }

  const preset = option.preset;
  if (!preset) return null;
  const existing = input.tags.find((tag) => tag.label === preset.label);
  if (existing) return activateExisting(existing);
  if (activeCount >= activeLimit) return null;

  const tag: ConcernTag = {
    id: input.newId,
    label: preset.label,
    status: 'active',
    sort_order: input.tags.length,
    parsed_topics: [...preset.topics],
    mention_refs: [],
    prompt_text: preset.subtitle,
    created_at: input.now,
    updated_at: input.now,
  };
  return {
    tags: [...input.tags, tag],
    selected_tag_id: tag.id,
    option_id: option.option_id,
  };
}

function textMatchesArchiveQuery(text: string, query: string): boolean {
  const normalizedText = text.trim().toLocaleLowerCase();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return normalizedQuery.length === 0 || normalizedText.includes(normalizedQuery);
}

export function conversationMatchesQuestionArchive(
  conversation: Conversation,
  query: string,
  concernTags: readonly ConcernTag[],
  copy: ProductCopy,
): boolean {
  const q = query.trim();
  if (q.length === 0) return true;
  if (conversation.turns.some((turn) => textMatchesArchiveQuery(turn.body, q))) return true;
  if (textMatchesArchiveQuery(firstUserQuestion(conversation, copy), q)) return true;

  const tagsById = new Map(concernTags.map((tag) => [tag.id, tag]));
  return conversation.concern_tag_refs.some((id) => {
    const tag = tagsById.get(id);
    if (tag) return concernMatchesQuestion(q, tag);
    return textMatchesArchiveQuery(id, q);
  });
}

export function questionArchiveMatches(
  conversations: readonly Conversation[],
  query: string,
  concernTags: readonly ConcernTag[],
  copy: ProductCopy,
  limit?: number,
): readonly Conversation[] {
  const q = query.trim();
  if (q.length === 0) return [];
  const matches = conversations.filter((conversation) =>
    conversationMatchesQuestionArchive(conversation, q, concernTags, copy),
  );
  return typeof limit === 'number' ? matches.slice(0, limit) : matches;
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

// A record seeded into the consultation via 去问镜问这条 — either a past
// EventMemory or a future PlanItem, flattened to a common shape for the
// seed-context card.
export interface SeedItem {
  readonly kind: 'memory' | 'plan';
  readonly id: string;
  readonly date: string;
  readonly body: string;
}
