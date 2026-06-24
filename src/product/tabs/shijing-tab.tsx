// SJG-ASTRO-07 — ShiJing consultation mirror screen (问时镜).
//
// Grounded multi-reading consultation. Explicitly imported source Reading ids
// from pending_shijing_source_reading_ids take priority; otherwise the surface
// falls back to the latest fresh RiJing/YueJing/NianJing readings. Explicit
// user confirmation is still required to convert any user question into a
// saved EventMemory.
//
// The 问时镜 redesign frames this as a calm "ask the time mirror" surface:
// a hero, a left提问记录 rail backed by `conversations`, a composer card,
// and example prompt chips. Every AI answer still displays its cited
// readings (design-system: ShiJing) and the generation依据 drawer.

import { useEffect, useMemo, useRef, useState, type FormEvent, type SVGProps } from 'react';
import { Tooltip } from '@nimiplatform/kit/ui';
import type { ShiJingMirrorOutput } from '../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../domain/reading.ts';
import type { Conversation, ConversationTurn } from '../../domain/conversation.ts';
import type { EventMemory } from '../../domain/event-memory.ts';
import type { PlanItem } from '../../domain/plan-item.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import {
  newConversationId,
  newConversationTurnId,
  newReadingId,
} from '../ids/index.ts';
import { latestReadingByMirrorKind } from '../reading/reading-selectors.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { useProductCopy, type ProductCopy } from '../i18n/copy.ts';
import { consultationMirrorScopeFor } from './mirror-scope-helpers.ts';
import { resolveShiJingSourceReadingIds } from './shijing-source-readings.ts';
import { CitationDrawer } from './shared/citation-drawer.tsx';
import { FailureBanner } from './shared/failure-banner.tsx';
import type { ShijingSettingsPageId } from '../../contracts/ia-contract.ts';
import type { ConcernTag } from '../../domain/concern-tag.ts';
import { InlineConcernEditorPopover } from '../concern-tags/inline-concern-editor.tsx';
import { trimmedConcernLabel } from '../concern-tags/concern-presets.ts';
import {
  sendConversationFollowUp,
  type ConversationFollowUpFailure,
} from '../conversations/conversation-follow-up.ts';

type IconProps = SVGProps<SVGSVGElement>;

function ArrowUpIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 18V6" />
      <path d="M7 11l5-5 5 5" />
    </svg>
  );
}

function SearchIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function FilterIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function firstUserQuestion(conv: Conversation, copy: ProductCopy): string {
  const turn = conv.turns.find((t) => t.role === 'user');
  return turn?.body ?? copy.shijing.unrecordedQuestion;
}

function concernMatchesQuestion(question: string, tag: ConcernTag): boolean {
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

function conversationMatchesConcernFilter(
  conversation: Conversation,
  selectedConcernIds: readonly string[],
): boolean {
  if (selectedConcernIds.length === 0) return true;
  return selectedConcernIds.some((id) => conversation.concern_tag_refs.includes(id));
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function followUpFailureAsReadingFailure(
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
function sessionTimeLabel(iso: string, copy: ProductCopy): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  const todayIso = new Date().toISOString().slice(0, 10);
  const dateIso = `${m[1]}-${m[2]}-${m[3]}`;
  if (dateIso === todayIso) return `${m[4]}:${m[5]}`;
  return copy.shijing.sessionDateLabel(Number(m[2]), Number(m[3]));
}

interface SessionGroup {
  readonly label: string;
  readonly items: readonly Conversation[];
}

// Pure presentation grouping of the history rail into 今天 / 本周 / 更早.
// No data is mutated; ordering relies on the desc-sorted input.
function groupConversations(
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
interface SeedItem {
  readonly kind: 'memory' | 'plan';
  readonly id: string;
  readonly date: string;
  readonly body: string;
}

export interface ShiJingTabProps {
  readonly onRequestOpenSettings?: (page?: ShijingSettingsPageId) => void;
}

export function ShiJingTab(_props: ShiJingTabProps) {
  const copy = useProductCopy();
  const { state, dispatch, runtime_ai_client, conversation_chat_bridge } = useShijingStore();
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<ReadingGenerationFailure | null>(null);
  const [question, setQuestion] = useState('');
  const [search, setSearch] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [draftingNewQuestion, setDraftingNewQuestion] = useState(false);
  const [selectedArchiveConcernIds, setSelectedArchiveConcernIds] = useState<string[]>([]);
  const [dismissedArchiveConcernIds, setDismissedArchiveConcernIds] = useState<string[]>([]);
  const [selectedFilterConcernIds, setSelectedFilterConcernIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const importedIds = state.pending_shijing_source_reading_ids;
  // Seed records pushed from another mirror's "去时镜问这条" action.
  // Past events ground the question via `cited_event_memory_refs`,
  // future plans via `cited_plan_item_refs`.
  const seedMemoryIds = state.pending_shijing_seed_memory_ids;
  const seedPlanIds = state.pending_shijing_seed_plan_ids;
  const seedItems = useMemo<readonly SeedItem[]>(() => {
    const memories: SeedItem[] = seedMemoryIds
      .map((id) => state.snapshot.event_memories.find((m) => m.id === id))
      .filter((m): m is EventMemory => m != null)
      .map((m) => ({ kind: 'memory', id: m.id, date: m.occurred_at.slice(0, 10), body: m.body }));
    const plans: SeedItem[] = seedPlanIds
      .map((id) => state.snapshot.plan_items.find((p) => p.id === id))
      .filter((p): p is PlanItem => p != null)
      .map((p) => ({ kind: 'plan', id: p.id, date: p.planned_for.slice(0, 10), body: p.body }));
    return [...memories, ...plans];
  }, [seedMemoryIds, seedPlanIds, state.snapshot.event_memories, state.snapshot.plan_items]);
  const seedCount = seedItems.length;

  // When a seed arrives (user clicked 去时镜问这条 on another tab),
  // pull focus into the composer so they can type immediately.
  useEffect(() => {
    if (seedCount > 0) composerRef.current?.focus();
  }, [seedCount]);

  const sourceReadingIds = useMemo(
    () =>
      resolveShiJingSourceReadingIds({
        imported_reading_ids: importedIds,
        readings: state.snapshot.readings,
      }),
    [importedIds, state.snapshot.readings],
  );

  const activeConcernTags = useMemo(
    () =>
      state.snapshot.concern_tags
        .filter((t) => t.status === 'active')
        .sort((a, b) => a.sort_order - b.sort_order),
    [state.snapshot.concern_tags],
  );
  const activeConcernIds = useMemo(
    () => new Set(activeConcernTags.map((tag) => tag.id)),
    [activeConcernTags],
  );
  const suggestedArchiveConcernIds = useMemo(
    () =>
      activeConcernTags
        .filter((tag) => !dismissedArchiveConcernIds.includes(tag.id))
        .filter((tag) => concernMatchesQuestion(question, tag))
        .map((tag) => tag.id)
        .slice(0, 2),
    [activeConcernTags, dismissedArchiveConcernIds, question],
  );

  useEffect(() => {
    setSelectedArchiveConcernIds((ids) => {
      const surviving = ids.filter((id) => activeConcernIds.has(id));
      const next = surviving.length > 0 ? surviving : suggestedArchiveConcernIds;
      return sameStringArray(ids, next) ? ids : next;
    });
    setSelectedFilterConcernIds((ids) => {
      const next = ids.filter((id) => activeConcernIds.has(id));
      return sameStringArray(ids, next) ? ids : next;
    });
    setDismissedArchiveConcernIds((ids) => {
      const next = ids.filter((id) => activeConcernIds.has(id));
      return sameStringArray(ids, next) ? ids : next;
    });
  }, [activeConcernIds, suggestedArchiveConcernIds]);

  // History rail, newest first.
  const conversations = useMemo(
    () => [...state.snapshot.conversations].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [state.snapshot.conversations],
  );
  const filteredConversations = useMemo(() => {
    const q = search.trim();
    return conversations.filter((c) => {
      const matchesSearch = q.length === 0 || firstUserQuestion(c, copy).includes(q);
      return matchesSearch && conversationMatchesConcernFilter(c, selectedFilterConcernIds);
    });
  }, [conversations, search, copy, selectedFilterConcernIds]);

  const newestConversation = conversations[0] ?? null;
  const selectedConversation = selectedConversationId
    ? conversations.find((c) => c.id === selectedConversationId) ?? null
    : null;
  const resultConversation = draftingNewQuestion ? null : selectedConversation ?? newestConversation;
  const followUpConversation =
    !draftingNewQuestion && resultConversation != null && importedIds.length === 0 && seedCount === 0
      ? resultConversation
      : null;
  const latestConsultation = latestReadingByMirrorKind({
    readings: state.snapshot.readings,
    mirror_kind: 'shijing',
  });
  const resultIsLatest = resultConversation != null && resultConversation === newestConversation;

  const canAsk =
    question.trim().length > 0 &&
    !loading &&
    (followUpConversation
      ? followUpConversation.source_reading_ids.length > 0
      : sourceReadingIds.length > 0);

  async function handleAsk(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (q.length === 0) return;
    if (followUpConversation) {
      if (followUpConversation.source_reading_ids.length === 0) return;
      setLoading(true);
      setFailure(null);
      const outcome = await sendConversationFollowUp({
        space: state.snapshot,
        conversation_id: followUpConversation.id,
        question: q,
        bridge: conversation_chat_bridge,
      });
      setLoading(false);
      if (!outcome.ok) {
        setFailure(followUpFailureAsReadingFailure(outcome.failure, followUpConversation.source_reading_ids));
        return;
      }
      dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
      setQuestion('');
      setSelectedConversationId(followUpConversation.id);
      setDraftingNewQuestion(false);
      return;
    }
    if (sourceReadingIds.length === 0) return;
    setLoading(true);
    setFailure(null);
    const id = newReadingId();
    const activeConcernTagIds = activeConcernTags.map((t) => t.id);
    const readingConcernTagIds =
      selectedArchiveConcernIds.length > 0 ? selectedArchiveConcernIds : activeConcernTagIds;
    const outcome = await generateReadingForStorage({
      id,
      created_at: nowIso(),
      mirror_kind: 'shijing',
      mirror_scope: consultationMirrorScopeFor(sourceReadingIds),
      related_person_refs: [],
      concern_tag_refs: readingConcernTagIds,
      cited_reading_ids: sourceReadingIds,
      ...(seedMemoryIds.length > 0 ? { cited_event_memory_refs: seedMemoryIds } : {}),
      ...(seedPlanIds.length > 0 ? { cited_plan_item_refs: seedPlanIds } : {}),
      question: q,
      space: state.snapshot,
      deps: { runtime_ai_client },
    });
    setLoading(false);
    if (!outcome.ok) {
      setFailure(outcome.failure);
      return;
    }
    // Append a consultation conversation thread. The "save question as
    // EventMemory" path is currently hidden from UI; re-enable here once
    // AI integration decides whether it should come back.
    const convId = newConversationId();
    const conv: Conversation = {
      id: convId,
      created_at: nowIso(),
      source_reading_ids: sourceReadingIds,
      concern_tag_refs: selectedArchiveConcernIds,
      turns: [
        {
          id: newConversationTurnId(),
          role: 'user',
          body: q,
          cited_reading_ids: [],
          cited_event_memory_refs: seedMemoryIds.slice(),
          cited_plan_item_refs: seedPlanIds.slice(),
          created_at: nowIso(),
        } satisfies ConversationTurn,
        {
          id: newConversationTurnId(),
          role: 'ai',
          body: (outcome.reading.output as ShiJingMirrorOutput).answer,
          cited_reading_ids: sourceReadingIds,
          cited_event_memory_refs: outcome.reading.cited_event_memory_refs.slice(),
          cited_plan_item_refs: outcome.reading.cited_plan_item_refs.slice(),
          created_at: nowIso(),
        } satisfies ConversationTurn,
      ],
    };
    const nextSpace = {
      ...outcome.next_space,
      conversations: [...outcome.next_space.conversations, conv],
    };
    dispatch({ type: 'snapshot/replace', snapshot: nextSpace });
    setQuestion('');
    setSelectedArchiveConcernIds([]);
    setDismissedArchiveConcernIds([]);
    setSelectedConversationId(convId);
    setDraftingNewQuestion(false);
    dispatch({ type: 'shijing/clear-import-bus' });
    dispatch({ type: 'shijing/clear-seed-memory' });
    dispatch({ type: 'shijing/clear-seed-plan' });
  }

  const sessionGroups = groupConversations(filteredConversations, copy);
  const askReason = loading
    ? ''
    : question.trim().length === 0
      ? ''
      : followUpConversation
        ? followUpConversation.source_reading_ids.length === 0
          ? copy.shijing.sourceMissing
          : ''
      : sourceReadingIds.length === 0
        ? copy.shijing.sourceMissing
        : '';
  const submitTitle = followUpConversation ? copy.shijing.sendTitle : copy.shijing.generateTitle;
  const submitLabel = loading
    ? followUpConversation
      ? copy.shijing.sending
      : copy.shijing.generating
    : followUpConversation
      ? copy.shijing.send
      : copy.shijing.generate;
  const chatActive = !draftingNewQuestion && resultConversation != null && importedIds.length === 0 && seedCount === 0;
  const composerPlaceholder = chatActive ? '' : copy.shijing.composerPlaceholder;
  const archiveTrayTags = useMemo(() => {
    const selected = activeConcernTags.filter((tag) => selectedArchiveConcernIds.includes(tag.id));
    if (selected.length > 0) return selected;
    const matched = activeConcernTags.filter((tag) => concernMatchesQuestion(question, tag));
    const candidates = matched.length > 0 ? matched : activeConcernTags;
    return candidates
      .filter((tag) => !dismissedArchiveConcernIds.includes(tag.id))
      .slice(0, 3);
  }, [activeConcernTags, dismissedArchiveConcernIds, question, selectedArchiveConcernIds]);

  function startNewQuestion() {
    setDraftingNewQuestion(true);
    setSelectedConversationId(null);
    setQuestion('');
    setSelectedArchiveConcernIds([]);
    setDismissedArchiveConcernIds([]);
    setFailure(null);
    setTimeout(() => composerRef.current?.focus(), 0);
  }

  function toggleArchiveConcern(id: string) {
    setDismissedArchiveConcernIds((ids) => ids.filter((item) => item !== id));
    setSelectedArchiveConcernIds((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [id],
    );
  }

  function removeArchiveConcern(id: string) {
    setSelectedArchiveConcernIds((ids) => ids.filter((item) => item !== id));
    setDismissedArchiveConcernIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  function toggleFilterConcern(id: string) {
    setSelectedFilterConcernIds((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  }

  function renderComposer() {
    return (
      <form
        className="shijing-ask__composer"
        data-chat-composer={chatActive ? 'true' : 'false'}
        onSubmit={handleAsk}
        aria-label={copy.shijing.composerAria}
      >
        <h2 className="shijing-ask__composer-title">{copy.shijing.composerTitle}</h2>

        {seedItems.length > 0 ? (
          <div className="shijing-ask__seed" aria-label={copy.shijing.seedAria}>
            <span className="shijing-ask__seed-label">{copy.shijing.seedLabel}</span>
            <ul className="shijing-ask__seed-list">
              {seedItems.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="shijing-ask__seed-chip" data-kind={item.kind}>
                  <span className="shijing-ask__seed-tag">
                    {item.kind === 'plan' ? copy.shijing.seedKindPlan : copy.shijing.seedKindMemory}
                  </span>
                  <span className="shijing-ask__seed-date">{item.date}</span>
                  <span className="shijing-ask__seed-body">{item.body}</span>
                  <button
                    type="button"
                    className="shijing-ask__seed-remove"
                    aria-label={copy.shijing.seedRemoveAria}
                    onClick={() =>
                      dispatch(
                        item.kind === 'plan'
                          ? { type: 'shijing/clear-seed-plan', plan_id: item.id }
                          : { type: 'shijing/clear-seed-memory', memory_id: item.id },
                      )
                    }
                  >
                    x
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <textarea
          ref={composerRef}
          className="shijing-ask__textarea"
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.currentTarget.value)}
          placeholder={composerPlaceholder}
          aria-label={copy.shijing.questionAria}
        />

        <div className="shijing-ask__toolbar">
          <div className="shijing-ask__actions">
            <div className="shijing-ask__submit-wrap">
              {!canAsk && askReason ? (
                <span className="shijing-ask__submit-reason">{askReason}</span>
              ) : null}
              <Tooltip content={askReason || submitTitle} placement="top">
                <button
                  type="submit"
                  className="shijing-ask__submit"
                  disabled={!canAsk}
                >
                  <ArrowUpIcon className="shijing-ask__submit-icon" />
                  <span className="shijing-ask__submit-text">{submitLabel}</span>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </form>
    );
  }

  return (
    <section
      className="shijing-tab shijing-shijing shijing-ask"
      data-mirror-kind="shijing"
      aria-label={copy.mirrorKindLabels.shijing}
    >
      <header className="shijing-ask__hero">
        <h1 className="shijing-ask__title">
          {copy.shijing.title}<span className="shijing-ask__title-dot" aria-hidden>°</span>
        </h1>
      </header>

      <div className="shijing-ask__layout">
        <aside className="shijing-ask__rail" aria-label={copy.shijing.railAria}>
          <div className="shijing-ask__rail-head">
            <button
              type="button"
              className="shijing-ask__new-question"
              aria-label={copy.shijing.newQuestionAria}
              aria-current={draftingNewQuestion ? 'true' : undefined}
              onClick={startNewQuestion}
            >
              <span aria-hidden>+</span>
              {copy.shijing.newQuestion}
            </button>
            <div className="shijing-ask__search">
              <div className="shijing-ask__search-row">
                <div className="shijing-ask__search-input">
                  <SearchIcon className="shijing-ask__search-icon" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    placeholder={copy.shijing.searchPlaceholder}
                    aria-label={copy.shijing.searchAria}
                  />
                </div>
                <span className="shijing-ask__filter">
                  <Tooltip
                    content={
                      selectedFilterConcernIds.length > 0
                        ? copy.shijing.archive.filterButtonActive(selectedFilterConcernIds.length)
                        : copy.shijing.archive.filterButton
                    }
                    placement="top"
                  >
                    <button
                      type="button"
                      className="shijing-ask__filter-button"
                      aria-label={
                        selectedFilterConcernIds.length > 0
                          ? copy.shijing.archive.filterButtonActive(selectedFilterConcernIds.length)
                          : copy.shijing.archive.filterButton
                      }
                      aria-expanded={filterOpen}
                      aria-haspopup="menu"
                      data-active={selectedFilterConcernIds.length > 0 ? 'true' : 'false'}
                      onClick={() => setFilterOpen((open) => !open)}
                    >
                      <FilterIcon className="shijing-ask__filter-icon" />
                    </button>
                  </Tooltip>
                  {filterOpen ? (
                    <div className="shijing-ask__filter-menu" role="menu" aria-label={copy.shijing.archive.filterMenuAria}>
                      <button
                        type="button"
                        className="shijing-ask__filter-option"
                        role="menuitemcheckbox"
                        aria-checked={selectedFilterConcernIds.length === 0}
                        onClick={() => setSelectedFilterConcernIds([])}
                      >
                        <span>{copy.shijing.archive.filterAll}</span>
                        <span aria-hidden>{selectedFilterConcernIds.length === 0 ? 'x' : ''}</span>
                      </button>
                      {activeConcernTags.length === 0 ? (
                        <p className="shijing-ask__filter-empty">{copy.shijing.archive.filterEmpty}</p>
                      ) : (
                        activeConcernTags.map((tag) => {
                          const selected = selectedFilterConcernIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              className="shijing-ask__filter-option"
                              role="menuitemcheckbox"
                              aria-checked={selected}
                              onClick={() => toggleFilterConcern(tag.id)}
                            >
                              <span>{trimmedConcernLabel(tag)}</span>
                              <span aria-hidden>{selected ? 'x' : ''}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </span>
              </div>
            </div>
          </div>

          {sessionGroups.length === 0 ? (
            <div className="shijing-ask__rail-empty">
              <span className="shijing-ask__rail-empty-icon" aria-hidden>
                ✦
              </span>
              <p className="shijing-ask__rail-empty-title">
                {conversations.length === 0 ? copy.shijing.emptyHistory : copy.shijing.emptySearch}
              </p>
              <p className="shijing-ask__rail-empty-desc">{copy.shijing.emptyHistoryDescription}</p>
            </div>
          ) : (
            <div className="shijing-ask__sessions">
              {sessionGroups.map((group) => (
                <div key={group.label} className="shijing-ask__session-group">
                  <p className="shijing-ask__session-group-label">{group.label}</p>
                  <ul>
                    {group.items.map((conv) => (
                      <li key={conv.id}>
                        <button
                          type="button"
                          className="shijing-ask__session"
                          aria-current={conv === resultConversation ? 'true' : undefined}
                          onClick={() => {
                            setDraftingNewQuestion(false);
                            setSelectedConversationId(conv.id);
                          }}
                        >
                          <span className="shijing-ask__session-q">{firstUserQuestion(conv, copy)}</span>
                          <span className="shijing-ask__session-time">
                            {sessionTimeLabel(conv.created_at, copy)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </aside>

        <div className="shijing-ask__main" data-chat-active={chatActive ? 'true' : 'false'}>
          {chatActive ? (
            <>
              {failure ? <FailureBanner failure={failure} /> : null}
              {resultConversation ? (
                <article className="shijing-ask__result" aria-label={copy.shijing.resultAria}>
                  <ConversationThread conversation={resultConversation} />
                  {resultIsLatest && latestConsultation ? (
                    <CitationDrawer reading={latestConsultation} />
                  ) : null}
                </article>
              ) : null}
              {renderComposer()}
            </>
          ) : (
            <>
              {renderComposer()}

          <ArchiveTray
            tags={archiveTrayTags}
            selectedIds={selectedArchiveConcernIds}
            onToggle={toggleArchiveConcern}
            onRemove={removeArchiveConcern}
          />

          {failure ? <FailureBanner failure={failure} /> : null}

          <ContextFocusBar tags={state.snapshot.concern_tags} />

          <div className="shijing-ask__suggest">
            <span className="shijing-ask__suggest-label">{copy.shijing.suggestLabel}</span>
            <div className="shijing-ask__chips">
              {copy.shijing.suggestedQuestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="shijing-ask__chip"
                  onClick={() => setQuestion(s)}
                >
                  ✦ {s}
                </button>
              ))}
            </div>
          </div>

          {resultConversation ? (
            <article className="shijing-ask__result" aria-label={copy.shijing.resultAria}>
              <ConversationThread conversation={resultConversation} />
              {resultIsLatest && latestConsultation ? (
                <CitationDrawer reading={latestConsultation} />
              ) : null}
            </article>
          ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ArchiveTray(props: {
  readonly tags: readonly ConcernTag[];
  readonly selectedIds: readonly string[];
  readonly onToggle: (id: string) => void;
  readonly onRemove: (id: string) => void;
}) {
  const copy = useProductCopy();
  if (props.tags.length === 0) return null;
  return (
    <section className="shijing-archive" aria-label={copy.shijing.archive.aria}>
      <div className="shijing-archive__lead">
        <span className="shijing-archive__icon" aria-hidden>
          +
        </span>
        <span className="shijing-archive__label">{copy.shijing.archive.addPrefix}</span>
      </div>
      <div className="shijing-archive__chips">
        {props.tags.map((tag) => {
          const selected = props.selectedIds.includes(tag.id);
          const label = trimmedConcernLabel(tag);
          return (
            <span key={tag.id} className="shijing-archive__chip" data-selected={selected ? 'true' : 'false'}>
              <button
                type="button"
                className="shijing-archive__chip-main"
                onClick={() => props.onToggle(tag.id)}
              >
                {label}
              </button>
              <button
                type="button"
                className="shijing-archive__close"
                aria-label={copy.shijing.archive.removeAria(label)}
                onClick={() => props.onRemove(tag.id)}
              >
                x
              </button>
            </span>
          );
        })}
      </div>
    </section>
  );
}

// Context focus bar for the consultation surface. It surfaces the active
// concern tags that will shape this reading and opens the same compact
// inline concern editor used by the time-window mirrors.
function ContextFocusBar(props: {
  readonly tags: readonly ConcernTag[];
}) {
  const copy = useProductCopy();
  const [editorOpen, setEditorOpen] = useState(false);
  const active = props.tags.filter((t) => t.status === 'active');
  return (
    <section className="shijing-ctx" aria-label={copy.shijing.context.aria}>
      <div className="shijing-ctx__lead">
        <span className="shijing-ctx__icon" aria-hidden>
          ✦
        </span>
        <div className="shijing-ctx__text">
          <p className="shijing-ctx__title">{copy.shijing.context.title}</p>
          <p className="shijing-ctx__desc">{copy.shijing.context.description}</p>
        </div>
      </div>
      <div className="shijing-ctx__focus">
        <ul className="shijing-ctx__chips">
          {active.length === 0 ? (
            <li className="shijing-ctx__empty">{copy.shijing.context.empty}</li>
          ) : (
            active.map((t) => (
              <li key={t.id} className="shijing-ctx__chip">
                {t.label}
              </li>
            ))
          )}
        </ul>
        <span className="shijing-ctx__editor-anchor">
          <button
            type="button"
            className="shijing-ctx__manage"
            aria-expanded={editorOpen}
            aria-haspopup="dialog"
            onClick={() => setEditorOpen((open) => !open)}
          >
            ✎ {copy.shijing.context.manage}
          </button>
          {editorOpen ? (
            <InlineConcernEditorPopover
              classNamePrefix="shijing-ctx-editor"
              ariaLabel={copy.shijing.context.manage}
              title={copy.shijing.context.manage}
              subtitle={copy.shijing.context.editorSubtitle}
              onClose={() => setEditorOpen(false)}
            />
          ) : null}
        </span>
      </div>
    </section>
  );
}

function ConversationThread(props: { readonly conversation: Conversation }) {
  const copy = useProductCopy();
  return (
    <ol className="shijing-ask__thread">
      {props.conversation.turns.map((turn) => (
        <li key={turn.id} className="shijing-ask__turn" data-role={turn.role}>
          <span className="shijing-ask__turn-role">{copy.conversationRoleLabels[turn.role]}</span>
          <p className="shijing-ask__turn-body">{turn.body}</p>
          {turn.cited_reading_ids.length > 0 ? (
            <small className="shijing-ask__turn-cite">
              {copy.shijing.citedReadings(turn.cited_reading_ids.length)}
            </small>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
