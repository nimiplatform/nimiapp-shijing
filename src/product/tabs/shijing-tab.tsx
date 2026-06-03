// SJG-ASTRO-07 — ShiJing consultation mirror screen (问时镜).
//
// Grounded multi-reading consultation. Source Reading ids come from the
// store's pending_shijing_source_reading_ids (mutated through the
// shijing/import-source-reading reducer action). Explicit user
// confirmation is still required to convert any user question into a
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
import { MIRROR_KIND_LABELS } from '../i18n/copy.ts';
import { consultationMirrorScopeFor } from './mirror-scope-helpers.ts';
import { CitationDrawer } from './shared/citation-drawer.tsx';
import { FailureBanner } from './shared/failure-banner.tsx';
import type { ShijingSettingsPageId } from '../../contracts/ia-contract.ts';
import type { ConcernTag } from '../../domain/concern-tag.ts';

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// Faded example questions shown inside the empty composer.
const COMPOSER_PLACEHOLDER = [
  '接下来一个月，我该不该换工作?',
  '这段关系现在最需要注意什么?',
  '最近反复焦虑，是阶段变化还是方向不清?',
].join('\n');

// "可以这样问" prompt chips — clicking one drops it into the composer.
const SUGGESTED_QUESTIONS: readonly string[] = [
  '接下来30天，我最需要注意什么?',
  '现在这个决定，适合推进还是等待?',
  '这段关系真正的卡点是什么?',
];

function firstUserQuestion(conv: Conversation): string {
  const turn = conv.turns.find((t) => t.role === 'user');
  return turn?.body ?? '(未记录问题)';
}

// History entry timestamp: today → `HH:mm`, otherwise → `M月D日`.
function sessionTimeLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  const todayIso = new Date().toISOString().slice(0, 10);
  const dateIso = `${m[1]}-${m[2]}-${m[3]}`;
  if (dateIso === todayIso) return `${m[4]}:${m[5]}`;
  return `${Number(m[2])}月${Number(m[3])}日`;
}

interface SessionGroup {
  readonly label: string;
  readonly items: readonly Conversation[];
}

// Pure presentation grouping of the history rail into 今天 / 本周 / 更早.
// No data is mutated; ordering relies on the desc-sorted input.
function groupConversations(convs: readonly Conversation[]): readonly SessionGroup[] {
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
    { label: '今天', items: today },
    { label: '本周', items: week },
    { label: '更早', items: earlier },
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

export function ShiJingTab(props: ShiJingTabProps) {
  const { state, dispatch, runtime_ai_client } = useShijingStore();
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<ReadingGenerationFailure | null>(null);
  const [question, setQuestion] = useState('');
  const [search, setSearch] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

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

  // Fallback: if no imported source, use the latest reading of each kind.
  const fallbackSourceIds = useMemo(() => {
    const ids: string[] = [];
    for (const kind of ['rijing', 'yuejing', 'nianjing'] as const) {
      const r = latestReadingByMirrorKind({
        readings: state.snapshot.readings,
        mirror_kind: kind,
      });
      if (r) ids.push(r.id);
    }
    return ids;
  }, [state.snapshot.readings]);
  const sourceReadingIds = importedIds.length > 0 ? importedIds : fallbackSourceIds;

  // History rail, newest first.
  const conversations = useMemo(
    () => [...state.snapshot.conversations].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [state.snapshot.conversations],
  );
  const filteredConversations = useMemo(() => {
    const q = search.trim();
    if (q.length === 0) return conversations;
    return conversations.filter((c) => firstUserQuestion(c).includes(q));
  }, [conversations, search]);

  const newestConversation = conversations[0] ?? null;
  const resultConversation =
    (selectedConversationId
      ? conversations.find((c) => c.id === selectedConversationId)
      : null) ?? newestConversation;
  const latestConsultation = latestReadingByMirrorKind({
    readings: state.snapshot.readings,
    mirror_kind: 'shijing',
  });
  const resultIsLatest = resultConversation != null && resultConversation === newestConversation;

  const canAsk = question.trim().length > 0 && sourceReadingIds.length > 0 && !loading;

  async function handleAsk(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (q.length === 0 || sourceReadingIds.length === 0) return;
    setLoading(true);
    setFailure(null);
    const id = newReadingId();
    const outcome = await generateReadingForStorage({
      id,
      created_at: nowIso(),
      mirror_kind: 'shijing',
      mirror_scope: consultationMirrorScopeFor(sourceReadingIds),
      related_person_refs: [],
      concern_tag_refs: state.snapshot.concern_tags
        .filter((t) => t.status === 'active')
        .map((t) => t.id),
      cited_reading_ids: sourceReadingIds,
      ...(seedMemoryIds.length > 0 ? { cited_event_memory_refs: seedMemoryIds } : {}),
      ...(seedPlanIds.length > 0 ? { cited_plan_item_refs: seedPlanIds } : {}),
      question: q,
      space: state.snapshot,
      ...(runtime_ai_client ? { deps: { runtime_ai_client } } : {}),
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
    setSelectedConversationId(convId);
    dispatch({ type: 'shijing/clear-import-bus' });
    dispatch({ type: 'shijing/clear-seed-memory' });
    dispatch({ type: 'shijing/clear-seed-plan' });
  }

  const sessionGroups = groupConversations(filteredConversations);
  const askReason = loading
    ? ''
    : question.trim().length === 0
      ? ''
      : sourceReadingIds.length === 0
        ? '尚无可引用的解读'
        : '';

  return (
    <section
      className="shijing-tab shijing-shijing shijing-ask"
      data-mirror-kind="shijing"
      aria-label={MIRROR_KIND_LABELS.shijing}
    >
      <header className="shijing-ask__hero">
        <h1 className="shijing-ask__title">
          问时镜<span className="shijing-ask__title-dot" aria-hidden>°</span>
        </h1>
      </header>

      <div className="shijing-ask__layout">
        <aside className="shijing-ask__rail" aria-label="提问记录">
          <div className="shijing-ask__rail-head">
            <div className="shijing-ask__search">
              <span className="shijing-ask__search-icon" aria-hidden>
                ⌕
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                placeholder="搜索提问"
                aria-label="搜索提问"
              />
            </div>
          </div>

          {sessionGroups.length === 0 ? (
            <div className="shijing-ask__rail-empty">
              <span className="shijing-ask__rail-empty-icon" aria-hidden>
                ✦
              </span>
              <p className="shijing-ask__rail-empty-title">
                {conversations.length === 0 ? '还没有提问记录' : '没有匹配的提问'}
              </p>
              <p className="shijing-ask__rail-empty-desc">提问后会在这里形成你的时间脉络。</p>
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
                          onClick={() => setSelectedConversationId(conv.id)}
                        >
                          <span className="shijing-ask__session-q">{firstUserQuestion(conv)}</span>
                          <span className="shijing-ask__session-time">
                            {sessionTimeLabel(conv.created_at)}
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

        <div className="shijing-ask__main">
          <form className="shijing-ask__composer" onSubmit={handleAsk} aria-label="提问">
            <h2 className="shijing-ask__composer-title">你现在最想问什么？</h2>

            {seedItems.length > 0 ? (
              <div className="shijing-ask__seed" aria-label="本次提问基于的记录">
                <span className="shijing-ask__seed-label">基于这条记录提问</span>
                <ul className="shijing-ask__seed-list">
                  {seedItems.map((item) => (
                    <li key={`${item.kind}-${item.id}`} className="shijing-ask__seed-chip" data-kind={item.kind}>
                      <span className="shijing-ask__seed-tag">
                        {item.kind === 'plan' ? '计划' : '事件'}
                      </span>
                      <span className="shijing-ask__seed-date">{item.date}</span>
                      <span className="shijing-ask__seed-body">{item.body}</span>
                      <button
                        type="button"
                        className="shijing-ask__seed-remove"
                        aria-label="移除这条记录"
                        onClick={() =>
                          dispatch(
                            item.kind === 'plan'
                              ? { type: 'shijing/clear-seed-plan', plan_id: item.id }
                              : { type: 'shijing/clear-seed-memory', memory_id: item.id },
                          )
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <textarea
              ref={composerRef}
              className="shijing-ask__textarea"
              value={question}
              onChange={(e) => setQuestion(e.currentTarget.value)}
              placeholder={COMPOSER_PLACEHOLDER}
              aria-label="你的问题"
            />

            <div className="shijing-ask__toolbar">
              <div className="shijing-ask__actions">
                <div className="shijing-ask__submit-wrap">
                  {!canAsk && askReason ? (
                    <span className="shijing-ask__submit-reason">{askReason}</span>
                  ) : null}
                  <button
                    type="submit"
                    className="shijing-ask__submit"
                    disabled={!canAsk}
                    title={askReason || '生成解读'}
                  >
                    {loading ? '生成中…' : '✦ 生成解读'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {failure ? <FailureBanner failure={failure} /> : null}

          <ContextFocusBar
            tags={state.snapshot.concern_tags}
            onManage={() => props.onRequestOpenSettings?.('concerns')}
          />

          <div className="shijing-ask__suggest">
            <span className="shijing-ask__suggest-label">可以这样问</span>
            <div className="shijing-ask__chips">
              {SUGGESTED_QUESTIONS.map((s) => (
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
            <article className="shijing-ask__result" aria-label="解读结果">
              <ConversationThread conversation={resultConversation} />
              {resultIsLatest && latestConsultation ? (
                <CitationDrawer reading={latestConsultation} />
              ) : null}
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// Read-only 上下文焦点 bar for the consultation surface. It surfaces the
// active concern tags that will shape this reading, with a link out to
// the full management surface (Settings → 关注). No active/archived
// toggling, creation, or mention resolution happens here.
function ContextFocusBar(props: {
  readonly tags: readonly ConcernTag[];
  readonly onManage?: () => void;
}) {
  const active = props.tags.filter((t) => t.status === 'active');
  return (
    <section className="shijing-ctx" aria-label="上下文焦点">
      <div className="shijing-ctx__lead">
        <span className="shijing-ctx__icon" aria-hidden>
          ✦
        </span>
        <div className="shijing-ctx__text">
          <p className="shijing-ctx__title">上下文焦点</p>
          <p className="shijing-ctx__desc">当前激活的关注会自动影响本次问时镜解读。</p>
        </div>
      </div>
      <ul className="shijing-ctx__chips">
        {active.length === 0 ? (
          <li className="shijing-ctx__empty">未设置关注</li>
        ) : (
          active.map((t) => (
            <li key={t.id} className="shijing-ctx__chip">
              {t.label}
            </li>
          ))
        )}
      </ul>
      <button type="button" className="shijing-ctx__manage" onClick={() => props.onManage?.()}>
        去设置管理 ›
      </button>
    </section>
  );
}

function ConversationThread(props: { readonly conversation: Conversation }) {
  return (
    <ol className="shijing-ask__thread">
      {props.conversation.turns.map((turn) => (
        <li key={turn.id} className="shijing-ask__turn" data-role={turn.role}>
          <span className="shijing-ask__turn-role">{turn.role === 'user' ? '我' : '时镜'}</span>
          <p className="shijing-ask__turn-body">{turn.body}</p>
          {turn.cited_reading_ids.length > 0 ? (
            <small className="shijing-ask__turn-cite">
              引用解读 {turn.cited_reading_ids.length} 份
            </small>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
