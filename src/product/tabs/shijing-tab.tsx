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

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
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
import { useProductCopy } from '../i18n/copy.ts';
import { consultationMirrorScopeFor } from './mirror-scope-helpers.ts';
import { resolveShiJingSourceReadingIds } from './shijing-source-readings.ts';
import { CitationDrawer } from './shared/citation-drawer.tsx';
import { FailureBanner } from './shared/failure-banner.tsx';
import type { ShijingSettingsPageId } from '../../contracts/ia-contract.ts';
import { sendConversationFollowUp } from '../conversations/conversation-follow-up.ts';
import { ArchiveTray, ContextFocusBar, ConversationThread } from './shijing/shijing-context-widgets.tsx';
import { ShiJingComposer } from './shijing/shijing-composer.tsx';
import { ShiJingHistoryRail } from './shijing/shijing-history-rail.tsx';
import {
  concernMatchesQuestion,
  conversationMatchesConcernFilter,
  firstUserQuestion,
  followUpFailureAsReadingFailure,
  groupConversations,
  nowIso,
  sameStringArray,
  type SeedItem,
} from './shijing/shijing-session-model.ts';

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

  function clearSeedItem(item: SeedItem) {
    dispatch(
      item.kind === 'plan'
        ? { type: 'shijing/clear-seed-plan', plan_id: item.id }
        : { type: 'shijing/clear-seed-memory', memory_id: item.id },
    );
  }

  function toggleFilterConcern(id: string) {
    setSelectedFilterConcernIds((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
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
        <ShiJingHistoryRail
          search={search}
          filterOpen={filterOpen}
          selectedFilterConcernIds={selectedFilterConcernIds}
          activeConcernTags={activeConcernTags}
          sessionGroups={sessionGroups}
          conversationsLength={conversations.length}
          resultConversation={resultConversation}
          draftingNewQuestion={draftingNewQuestion}
          onSearchChange={setSearch}
          onToggleFilterOpen={() => setFilterOpen((open) => !open)}
          onClearFilter={() => setSelectedFilterConcernIds([])}
          onToggleFilterConcern={toggleFilterConcern}
          onStartNewQuestion={startNewQuestion}
          onSelectConversation={(id) => {
            setDraftingNewQuestion(false);
            setSelectedConversationId(id);
          }}
        />

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
              <ShiJingComposer
                chatActive={chatActive}
                seedItems={seedItems}
                question={question}
                composerPlaceholder={composerPlaceholder}
                canAsk={canAsk}
                askReason={askReason}
                submitTitle={submitTitle}
                submitLabel={submitLabel}
                textareaRef={composerRef}
                onSubmit={handleAsk}
                onQuestionChange={setQuestion}
                onClearSeed={clearSeedItem}
              />
            </>
          ) : (
            <>
              <ShiJingComposer
                chatActive={chatActive}
                seedItems={seedItems}
                question={question}
                composerPlaceholder={composerPlaceholder}
                canAsk={canAsk}
                askReason={askReason}
                submitTitle={submitTitle}
                submitLabel={submitLabel}
                textareaRef={composerRef}
                onSubmit={handleAsk}
                onQuestionChange={setQuestion}
                onClearSeed={clearSeedItem}
              />

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
