// SJG-ASTRO-07 — ShiJing consultation mirror screen (问镜).
//
// Grounded multi-reading consultation. Explicitly imported source Reading ids
// from pending_shijing_source_reading_ids take priority; otherwise the surface
// falls back to the latest fresh RiJing/YueJing/NianJing readings. Explicit
// user confirmation is still required to convert any user question into a
// saved EventMemory.
//
// The 问镜 redesign frames this as a calm consultation surface:
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
  newConcernTagId,
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
import {
  ArchiveTray,
  ContextFocusBar,
  ConversationThread,
  QuestionArchiveRecall,
} from './shijing/shijing-context-widgets.tsx';
import { ShiJingComposer } from './shijing/shijing-composer.tsx';
import { ShiJingHistoryRail } from './shijing/shijing-history-rail.tsx';
import {
  activateArchiveConcernOption,
  buildPendingConversationPreview,
  concernMatchesQuestion,
  conversationMatchesQuestionArchive,
  conversationMatchesConcernFilter,
  followUpFailureAsReadingFailure,
  groupConversations,
  nowIso,
  questionArchiveMatches,
  sameStringArray,
  suggestArchiveConcernOptions,
  type ArchiveConcernOption,
  type SeedItem,
} from './shijing/shijing-session-model.ts';

export interface ShiJingTabProps {
  readonly onRequestOpenSettings?: (page?: ShijingSettingsPageId) => void;
}

export function ShiJingTab(_props: ShiJingTabProps) {
  const copy = useProductCopy();
  const {
    state,
    dispatch,
    replace_snapshot,
    runtime_ai_client,
    conversation_chat_bridge,
  } = useShijingStore();
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<ReadingGenerationFailure | null>(null);
  const [question, setQuestion] = useState('');
  const [search, setSearch] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [pendingConversation, setPendingConversation] = useState<Conversation | null>(null);
  const [pendingTurnIds, setPendingTurnIds] = useState<readonly string[]>([]);
  const [draftingNewQuestion, setDraftingNewQuestion] = useState(false);
  const [selectedArchiveConcernIds, setSelectedArchiveConcernIds] = useState<string[]>([]);
  const [dismissedArchiveConcernIds, setDismissedArchiveConcernIds] = useState<string[]>([]);
  const [selectedFilterConcernIds, setSelectedFilterConcernIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const importedIds = state.pending_shijing_source_reading_ids;
  // Seed records pushed from another mirror's "去问镜问这条" action.
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

  // When a seed arrives (user clicked 去问镜问这条 on another tab),
  // pull focus into the composer so they can type immediately.
  useEffect(() => {
    if (seedCount > 0) composerRef.current?.focus();
  }, [seedCount]);

  const sourceReadingIds = useMemo(
    () =>
      resolveShiJingSourceReadingIds({
        imported_reading_ids: importedIds,
        readings: state.snapshot.readings,
        method_profile_id: state.snapshot.settings.method_profile_id,
      }),
    [importedIds, state.snapshot.readings, state.snapshot.settings.method_profile_id],
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
  const concernIds = useMemo(
    () => new Set(state.snapshot.concern_tags.map((tag) => tag.id)),
    [state.snapshot.concern_tags],
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
  const archiveTrayOptions = useMemo(
    () =>
      suggestArchiveConcernOptions({
        question,
        tags: state.snapshot.concern_tags,
        dismissedOptionIds: dismissedArchiveConcernIds,
        selectedTagIds: selectedArchiveConcernIds,
      }),
    [
      dismissedArchiveConcernIds,
      question,
      selectedArchiveConcernIds,
      state.snapshot.concern_tags,
    ],
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
      const next = ids.filter((id) => id.startsWith('preset:') || concernIds.has(id));
      return sameStringArray(ids, next) ? ids : next;
    });
  }, [activeConcernIds, concernIds, suggestedArchiveConcernIds]);

  // History rail, newest first.
  const conversations = useMemo(
    () => [...state.snapshot.conversations].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [state.snapshot.conversations],
  );

  const newestConversation = conversations[0] ?? null;
  const selectedConversation = selectedConversationId
    ? conversations.find((c) => c.id === selectedConversationId) ?? null
    : null;
  const resultConversation = pendingConversation ?? (draftingNewQuestion ? null : selectedConversation ?? newestConversation);
  const followUpConversation =
    pendingConversation == null && !draftingNewQuestion && resultConversation != null && importedIds.length === 0 && seedCount === 0
      ? resultConversation
      : null;
  const latestConsultation = latestReadingByMirrorKind({
    readings: state.snapshot.readings,
    mirror_kind: 'shijing',
    method_profile_id: state.snapshot.settings.method_profile_id,
  });
  const resultIsLatest = resultConversation != null && resultConversation === newestConversation;
  const showLatestCitation = pendingConversation == null && resultIsLatest && latestConsultation != null;

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
      const createdAt = nowIso();
      const pending = buildPendingConversationPreview({
        baseConversation: followUpConversation,
        conversationId: followUpConversation.id,
        createdAt,
        sourceReadingIds: followUpConversation.source_reading_ids,
        concernTagRefs: followUpConversation.concern_tag_refs,
        question: q,
        citedEventMemoryRefs: [],
        citedPlanItemRefs: [],
        userTurnId: newConversationTurnId(),
        aiTurnId: newConversationTurnId(),
        thinkingLabel: copy.shijing.thinking,
      });
      setPendingConversation(pending.conversation);
      setPendingTurnIds(pending.pendingTurnIds);
      setLoading(true);
      setFailure(null);
      setQuestion('');
      const outcome = await sendConversationFollowUp({
        space: state.snapshot,
        conversation_id: followUpConversation.id,
        question: q,
        bridge: conversation_chat_bridge,
      });
      setLoading(false);
      if (!outcome.ok) {
        setPendingConversation({
          ...pending.conversation,
          turns: pending.conversation.turns.filter((turn) => !pending.pendingTurnIds.includes(turn.id)),
        });
        setPendingTurnIds([]);
        setFailure(followUpFailureAsReadingFailure(outcome.failure, followUpConversation.source_reading_ids));
        return;
      }
      dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
      setPendingConversation(null);
      setPendingTurnIds([]);
      setSelectedConversationId(followUpConversation.id);
      setDraftingNewQuestion(false);
      return;
    }
    if (sourceReadingIds.length === 0) return;
    const convId = newConversationId();
    const createdAt = nowIso();
    const activeConcernTagIds = activeConcernTags.map((t) => t.id);
    const readingConcernTagIds =
      selectedArchiveConcernIds.length > 0 ? selectedArchiveConcernIds : activeConcernTagIds;
    const pending = buildPendingConversationPreview({
      conversationId: convId,
      createdAt,
      sourceReadingIds,
      concernTagRefs: selectedArchiveConcernIds,
      question: q,
      citedEventMemoryRefs: seedMemoryIds,
      citedPlanItemRefs: seedPlanIds,
      userTurnId: newConversationTurnId(),
      aiTurnId: newConversationTurnId(),
      thinkingLabel: copy.shijing.thinking,
    });
    setPendingConversation(pending.conversation);
    setPendingTurnIds(pending.pendingTurnIds);
    setDraftingNewQuestion(false);
    setLoading(true);
    setFailure(null);
    setQuestion('');
    const id = newReadingId();
    const outcome = await generateReadingForStorage({
      id,
      created_at: createdAt,
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
      setPendingConversation({
        ...pending.conversation,
        turns: pending.conversation.turns.filter((turn) => !pending.pendingTurnIds.includes(turn.id)),
      });
      setPendingTurnIds([]);
      setFailure(outcome.failure);
      return;
    }
    // Append a consultation conversation thread. The "save question as
    // EventMemory" path is currently hidden from UI; re-enable here once
    // AI integration decides whether it should come back.
    const conv: Conversation = {
      id: convId,
      created_at: createdAt,
      source_reading_ids: sourceReadingIds,
      concern_tag_refs: selectedArchiveConcernIds,
      turns: [
        {
          id: pending.conversation.turns[0]?.id ?? newConversationTurnId(),
          role: 'user',
          body: q,
          cited_reading_ids: [],
          cited_event_memory_refs: seedMemoryIds.slice(),
          cited_plan_item_refs: seedPlanIds.slice(),
          created_at: createdAt,
        } satisfies ConversationTurn,
        {
          id: pending.pendingTurnIds[0] ?? newConversationTurnId(),
          role: 'ai',
          body: (outcome.reading.output as ShiJingMirrorOutput).answer,
          cited_reading_ids: sourceReadingIds,
          cited_event_memory_refs: outcome.reading.cited_event_memory_refs.slice(),
          cited_plan_item_refs: outcome.reading.cited_plan_item_refs.slice(),
          created_at: createdAt,
        } satisfies ConversationTurn,
      ],
    };
    const nextSpace = {
      ...outcome.next_space,
      conversations: [...outcome.next_space.conversations, conv],
    };
    dispatch({ type: 'snapshot/replace', snapshot: nextSpace });
    setPendingConversation(null);
    setPendingTurnIds([]);
    setSelectedArchiveConcernIds([]);
    setDismissedArchiveConcernIds([]);
    setSelectedConversationId(convId);
    setDraftingNewQuestion(false);
    dispatch({ type: 'shijing/clear-import-bus' });
    dispatch({ type: 'shijing/clear-seed-memory' });
    dispatch({ type: 'shijing/clear-seed-plan' });
  }

  const chatActive = pendingConversation != null || (!draftingNewQuestion && resultConversation != null && importedIds.length === 0 && seedCount === 0);
  const historyLookupText = search.trim().length > 0 ? search : chatActive ? '' : question;
  const filteredConversations = useMemo(
    () =>
      conversations.filter((c) =>
        conversationMatchesQuestionArchive(c, historyLookupText, state.snapshot.concern_tags, copy) &&
        conversationMatchesConcernFilter(c, selectedFilterConcernIds),
      ),
    [conversations, historyLookupText, state.snapshot.concern_tags, copy, selectedFilterConcernIds],
  );
  const archiveRecallConversations = useMemo(
    () =>
      search.trim().length > 0 || chatActive
        ? []
        : questionArchiveMatches(conversations, question, state.snapshot.concern_tags, copy, 3),
    [chatActive, conversations, copy, question, search, state.snapshot.concern_tags],
  );
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
  const composerPlaceholder = chatActive ? '' : copy.shijing.composerPlaceholder;
  function startNewQuestion() {
    setPendingConversation(null);
    setPendingTurnIds([]);
    setDraftingNewQuestion(true);
    setSelectedConversationId(null);
    setQuestion('');
    setSelectedArchiveConcernIds([]);
    setDismissedArchiveConcernIds([]);
    setFailure(null);
    setTimeout(() => composerRef.current?.focus(), 0);
  }

  async function toggleArchiveOption(option: ArchiveConcernOption) {
    const selectedTagId = option.tag_id;
    if (selectedTagId != null && selectedArchiveConcernIds.includes(selectedTagId)) {
      setSelectedArchiveConcernIds((ids) => ids.filter((item) => item !== selectedTagId));
      return;
    }

    const activation = activateArchiveConcernOption({
      option,
      tags: state.snapshot.concern_tags,
      now: nowIso(),
      newId: newConcernTagId(),
    });
    if (!activation) return;
    if (activation.tags !== state.snapshot.concern_tags) {
      const status = await replace_snapshot({ ...state.snapshot, concern_tags: activation.tags });
      if (status.kind !== 'idle' && status.kind !== 'saved') return;
    }
    setDismissedArchiveConcernIds((ids) =>
      ids.filter((item) => item !== activation.option_id && item !== activation.selected_tag_id),
    );
    setSelectedArchiveConcernIds([activation.selected_tag_id]);
  }

  function removeArchiveOption(option: ArchiveConcernOption) {
    if (option.tag_id) {
      setSelectedArchiveConcernIds((ids) => ids.filter((item) => item !== option.tag_id));
    }
    setDismissedArchiveConcernIds((ids) =>
      ids.includes(option.option_id) ? ids : [...ids, option.option_id],
    );
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

  function selectConversation(id: string) {
    setPendingConversation(null);
    setPendingTurnIds([]);
    setDraftingNewQuestion(false);
    setSelectedConversationId(id);
    setQuestion('');
    setFailure(null);
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
          onSelectConversation={selectConversation}
        />

        <div className="shijing-ask__main" data-chat-active={chatActive ? 'true' : 'false'}>
          {chatActive ? (
            <>
              {failure ? <FailureBanner failure={failure} /> : null}
              {resultConversation ? (
                <article className="shijing-ask__result" aria-label={copy.shijing.resultAria}>
                  <ConversationThread
                    conversation={resultConversation}
                    pendingTurnIds={pendingTurnIds}
                    thinkingLabel={copy.shijing.thinking}
                  />
                  {showLatestCitation ? (
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
                submitting={loading}
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
                submitting={loading}
                textareaRef={composerRef}
                onSubmit={handleAsk}
                onQuestionChange={setQuestion}
                onClearSeed={clearSeedItem}
              />

          <QuestionArchiveRecall
            conversations={archiveRecallConversations}
            concernTags={state.snapshot.concern_tags}
            onSelectConversation={selectConversation}
          />

          <ArchiveTray
            options={archiveTrayOptions}
            selectedIds={selectedArchiveConcernIds}
            onToggleOption={toggleArchiveOption}
            onRemoveOption={removeArchiveOption}
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
              <ConversationThread
                conversation={resultConversation}
                pendingTurnIds={pendingTurnIds}
                thinkingLabel={copy.shijing.thinking}
              />
              {showLatestCitation ? (
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
