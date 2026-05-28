// Consultation tab. Wave-12 wires generateReading for ad_hoc
// consultation. Failure / runtime / validation states surface as
// typed UI alerts; no synthesized substitute content.

import { useMemo, useState, type ChangeEvent, type ReactElement } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { describeTab } from '../navigation/tab-descriptor.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { inputsSummaryExpired } from '../astrology/inputs-summary-expiry.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { Conversation } from '../../domain/conversation.ts';
import type { Reading } from '../../domain/reading.ts';
import {
  BODY,
  BUTTONS,
  FAILURE_HEADLINES,
  FIELD_PLACEHOLDERS,
  HEADINGS,
  STATUS,
} from '../i18n/copy.ts';
import { formatCreateRefusal, formatGenerateReadingFailure } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';
import { subjectDisplayName } from '../i18n/subject-display-name.ts';
import { ReadingEvidenceCard } from '../reading/reading-evidence-card.tsx';
import { natalReadinessHeadline, subjectNatalReadiness } from '../subjects/natal-readiness.ts';
import {
  buildConsultationContextText,
  consultationTimeWindowFromDays,
  parseConsultationHorizonDays,
} from '../consultation/consultation-flow.ts';
import { resolveViewTimeWindow, type ViewTimeWindowUnavailable } from '../views/view-workspace-model.ts';
import { ConversationThreadOverlay } from '../conversations/conversation-thread.tsx';
import { newConversationId } from '../conversations/conversation-id.ts';
import { latestReadingForTarget, readingMatchesObservationTarget } from '../reading/reading-selectors.ts';

const TAB = describeTab('consultation');

type ConsultationBasis = 'subject' | 'view_context';

const CONTEXT_DEFAULT_VALUE = '_default';

const HORIZON_PRESETS: readonly { readonly value: string; readonly label: string }[] = [
  { value: '7', label: '近 7 天' },
  { value: '30', label: '近 30 天' },
  { value: '90', label: '近 90 天' },
  { value: '180', label: '近 180 天' },
  { value: '365', label: '近 1 年' },
];

interface SuggestedPrompt {
  readonly id: string;
  readonly text: string;
  readonly icon: 'sparkle' | 'clock' | 'heart';
}

const SUGGESTED_PROMPTS: readonly SuggestedPrompt[] = [
  { id: 'next_30_days', text: '接下来30天，我最需要注意什么？', icon: 'sparkle' },
  { id: 'decision_timing', text: '现在这个决定，适合推进还是等待？', icon: 'clock' },
  { id: 'relationship_blocker', text: '这段关系真正的卡点是什么？', icon: 'heart' },
];

function formatViewTimeWindowUnavailable(error: ViewTimeWindowUnavailable, space: ReturnType<typeof useShijingStore>['state']['snapshot']) {
  if (error.reason === 'anchor_subject_not_ready') {
    return {
      headline: `${subjectDisplayName(error.subject, space)}：${natalReadinessHeadline(error.readiness)}`,
      technical: error.detail,
    };
  }
  if (error.reason === 'bounded_time_scope_invalid') {
    return { headline: BODY.view_bounded_generation_unavailable, technical: error.detail };
  }
  return { headline: BODY.view_rolling_generation_unavailable, technical: error.detail };
}

interface HistoryBucket {
  readonly key: 'today' | 'this_week' | 'earlier';
  readonly label: string;
  readonly entries: readonly Reading[];
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function groupConsultationHistory(readings: readonly Reading[], now: Date): readonly HistoryBucket[] {
  const todayStart = startOfLocalDay(now);
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;
  const today: Reading[] = [];
  const thisWeek: Reading[] = [];
  const earlier: Reading[] = [];
  const sorted = readings
    .filter((r) => r.kind === 'consultation' && r.scope === 'ad_hoc')
    .slice()
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  for (const reading of sorted) {
    const ms = Date.parse(reading.created_at);
    if (Number.isNaN(ms)) {
      earlier.push(reading);
      continue;
    }
    if (ms >= todayStart) today.push(reading);
    else if (ms >= weekStart) thisWeek.push(reading);
    else earlier.push(reading);
  }
  const buckets: HistoryBucket[] = [];
  if (today.length > 0) buckets.push({ key: 'today', label: BODY.consultation_history_today, entries: today });
  if (thisWeek.length > 0) buckets.push({ key: 'this_week', label: BODY.consultation_history_this_week, entries: thisWeek });
  if (earlier.length > 0) buckets.push({ key: 'earlier', label: BODY.consultation_history_earlier, entries: earlier });
  return buckets;
}

function formatHistoryTime(createdAt: string, now: Date): string {
  const ms = Date.parse(createdAt);
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms);
  const todayStart = startOfLocalDay(now);
  if (ms >= todayStart) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function historyEntryTitle(reading: Reading): string {
  const raw = (reading.inputs_summary.ad_hoc_context ?? '').trim();
  if (raw.length === 0) return BODY.consultation_history_untitled;
  const firstLine = raw.split(/\r?\n/).find((line) => line.trim().length > 0) ?? raw;
  const cleaned = firstLine.replace(/^问题[:：]\s*/, '').trim();
  return cleaned.length > 18 ? `${cleaned.slice(0, 18)}…` : cleaned;
}

interface PillIconProps {
  readonly name: 'user' | 'calendar' | 'layers' | 'sparkle' | 'clock' | 'heart' | 'search' | 'plus' | 'info';
}

function PillIcon({ name }: PillIconProps) {
  const stroke = 'currentColor';
  const paths: Record<PillIconProps['name'], ReactElement> = {
    user: (
      <>
        <circle cx="8" cy="6" r="3" />
        <path d="M2.5 13.5c.8-2.5 3-4 5.5-4s4.7 1.5 5.5 4" />
      </>
    ),
    calendar: (
      <>
        <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
        <path d="M5 2v3M11 2v3M2.5 7h11" />
      </>
    ),
    layers: (
      <>
        <path d="M8 2 2 5l6 3 6-3-6-3z" />
        <path d="M2 8.5 8 11.5l6-3M2 11.5 8 14.5l6-3" />
      </>
    ),
    sparkle: (
      <>
        <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M4 12l2-2M10 6l2-2" />
      </>
    ),
    clock: (
      <>
        <circle cx="8" cy="8" r="5.5" />
        <path d="M8 5v3l2 2" />
      </>
    ),
    heart: (
      <>
        <path d="M8 13.5s-4.5-2.7-4.5-6A2.5 2.5 0 0 1 8 5a2.5 2.5 0 0 1 4.5 2.5c0 3.3-4.5 6-4.5 6z" />
      </>
    ),
    search: (
      <>
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" />
      </>
    ),
    plus: <path d="M8 3v10M3 8h10" />,
    info: (
      <>
        <circle cx="8" cy="8" r="6" />
        <path d="M8 7.5v3M8 5.2v.1" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke={stroke}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

export function ConsultationTab() {
  const { state, dispatch, runtime_ai_client } = useShijingStore();
  const [questionText, setQuestionText] = useState('');
  const [basis, setBasis] = useState<ConsultationBasis>('subject');
  const [horizonDaysText, setHorizonDaysText] = useState('30');
  const [selectedViewId, setSelectedViewId] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationOverlayOpen, setConversationOverlayOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryReadingId, setSelectedHistoryReadingId] = useState<string | null>(null);
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'running' }
    | { kind: 'failed'; headline: string; technical: string }
    | { kind: 'saved'; reading_id: string; followup_view_id?: string }
  >({ kind: 'idle' });
  const targetReadiness = subjectNatalReadiness(state.observation_target, state.snapshot);
  const selectedView = useMemo(
    () => state.snapshot.views.find((view) => view.id === selectedViewId) ?? null,
    [selectedViewId, state.snapshot.views],
  );
  const viewTimeWindowPreview = selectedView ? resolveViewTimeWindow(selectedView, state.snapshot) : null;

  const consultationHistory = useMemo(
    () => state.snapshot.readings.filter((r) =>
      r.kind === 'consultation' &&
      r.scope === 'ad_hoc' &&
      readingMatchesObservationTarget(r, state.observation_target),
    ),
    [state.snapshot.readings, state.observation_target],
  );
  const now = new Date();
  const filteredHistory = useMemo(() => {
    const q = historySearch.trim();
    if (q.length === 0) return consultationHistory;
    return consultationHistory.filter((r) =>
      (r.inputs_summary.ad_hoc_context ?? '').toLowerCase().includes(q.toLowerCase()),
    );
  }, [consultationHistory, historySearch]);
  const historyBuckets = useMemo(() => groupConsultationHistory(filteredHistory, now), [filteredHistory, now]);

  async function onAsk() {
    const question = questionText.trim();
    if (question.length === 0) {
      setSubmission({ kind: 'failed', headline: FAILURE_HEADLINES.consultation_empty, technical: '' });
      return;
    }
    setSubmission({ kind: 'running' });
    const generatedAt = new Date();
    const request = (() => {
      if (basis === 'view_context') {
        if (!selectedView) {
          return { ok: false as const, headline: BODY.consultation_view_required, technical: 'consultation_view_missing' };
        }
        const viewTimeWindow = resolveViewTimeWindow(selectedView, state.snapshot, generatedAt);
        if (!viewTimeWindow.ok) {
          return { ok: false as const, ...formatViewTimeWindowUnavailable(viewTimeWindow.error, state.snapshot) };
        }
        return {
          ok: true as const,
          anchor_subject: selectedView.anchor_subject,
          subjects: selectedView.subjects,
          time_window: viewTimeWindow.time_window,
          ad_hoc_context_text: buildConsultationContextText({ question, view: selectedView }),
          followup_view_id: selectedView.id,
        };
      }
      if (!targetReadiness.ok) {
        return {
          ok: false as const,
          headline: natalReadinessHeadline(targetReadiness),
          technical: targetReadiness.detail,
        };
      }
      const horizon = parseConsultationHorizonDays(horizonDaysText);
      if (!horizon.ok) {
        return { ok: false as const, headline: BODY.consultation_invalid_horizon, technical: horizon.detail };
      }
      return {
        ok: true as const,
        anchor_subject: state.observation_target,
        subjects: [state.observation_target],
        time_window: consultationTimeWindowFromDays(
          targetReadiness.inputs.birth_location.iana_time_zone,
          horizon.days,
          generatedAt,
        ),
        ad_hoc_context_text: question,
      };
    })();
    if (!request.ok) {
      setSubmission({ kind: 'failed', headline: request.headline, technical: request.technical });
      return;
    }
    const outcome = await generateReadingForStorage({
      id: `reading_${Date.now()}`,
      created_at: generatedAt.toISOString(),
      kind: 'consultation',
      scope: 'ad_hoc',
      anchor_subject: request.anchor_subject,
      subjects: request.subjects,
      time_window: request.time_window,
      space: state.snapshot,
      ad_hoc_context_text: request.ad_hoc_context_text,
      runtime_ai_client,
    });
    if (!outcome.ok) {
      const formatted = formatGenerateReadingFailure(outcome.error);
      setSubmission({ kind: 'failed', headline: formatted.headline, technical: formatted.technical });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    setSelectedHistoryReadingId(null);
    setSubmission({
      kind: 'saved',
      reading_id: outcome.reading.id,
      ...(request.followup_view_id ? { followup_view_id: request.followup_view_id } : {}),
    });
  }

  function onStartFollowupConversation() {
    if (submission.kind !== 'saved') return;
    const reading = state.snapshot.readings.find((entry) => entry.id === submission.reading_id);
    if (!reading) return;
    const conversation: Conversation = {
      id: newConversationId(),
      created_at: new Date().toISOString(),
      subject_anchor: reading.anchor_subject,
      source_reading_id: reading.id,
      ...(submission.followup_view_id ? { view_id: submission.followup_view_id } : {}),
      turns: [],
    };
    const nextSnapshot = {
      ...state.snapshot,
      conversations: [...state.snapshot.conversations, conversation],
    };
    const check = validateShiJingSpace(nextSnapshot);
    if (!check.ok) {
      const formatted = formatCreateRefusal(check.error.code);
      setSubmission({ kind: 'failed', headline: formatted.headline, technical: formatted.technical });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    setSelectedConversationId(conversation.id);
    setConversationOverlayOpen(true);
  }

  function onContextChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    if (value === CONTEXT_DEFAULT_VALUE) {
      setBasis('subject');
      setSelectedViewId('');
    } else {
      setBasis('view_context');
      setSelectedViewId(value);
    }
  }

  const latestConsultation = latestReadingForTarget({
    readings: state.snapshot.readings,
    kind: 'consultation',
    scope: 'ad_hoc',
    target: state.observation_target,
  });
  const displayedConsultation = (() => {
    if (selectedHistoryReadingId) {
      const fromHistory = state.snapshot.readings.find((r) => r.id === selectedHistoryReadingId);
      if (fromHistory) return fromHistory;
    }
    if (submission.kind === 'saved') {
      return state.snapshot.readings.find((r) => r.id === submission.reading_id) ?? latestConsultation;
    }
    return latestConsultation;
  })();
  // SJG-ASTRO-09: consultation readings expire 7d after captured_at.
  const latestConsultationExpired = displayedConsultation
    ? inputsSummaryExpired(displayedConsultation, new Date())
    : false;
  const subjectBlocked = basis === 'subject' && !targetReadiness.ok;
  const viewBlocked = basis === 'view_context' && (
    !selectedView ||
    (viewTimeWindowPreview !== null && !viewTimeWindowPreview.ok)
  );
  const noViewsAvailable = state.snapshot.views.length === 0;
  const contextSelectValue = basis === 'view_context' ? selectedViewId : CONTEXT_DEFAULT_VALUE;

  return (
    <section className="shijing-tab shijing-tab--consultation" aria-labelledby="shijing-consultation-heading">
      <header className="shijing-consultation-hero">
        <div className="shijing-consultation-hero__droplet" aria-hidden />
        <h2 id="shijing-consultation-heading" className="shijing-consultation-hero__title">
          {TAB.chinese_label}
          <span className="shijing-consultation-hero__title-dot" aria-hidden>°</span>
        </h2>
      </header>

      <div className="shijing-consultation-layout">
        <aside className="shijing-consultation-sidebar" aria-label="提问历史">
          <div className="shijing-consultation-sidebar__top">
            <label className="shijing-consultation-search" htmlFor="consultation-history-search">
              <PillIcon name="search" />
              <input
                id="consultation-history-search"
                type="search"
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder={FIELD_PLACEHOLDERS.consultation_search}
              />
            </label>
          </div>

          {historyBuckets.length === 0 ? (
            <div className="shijing-consultation-sidebar__empty">
              <p className="shijing-consultation-sidebar__empty-title">{BODY.consultation_history_empty}</p>
              <p className="shijing-consultation-sidebar__empty-sub">{BODY.consultation_history_empty_sub}</p>
            </div>
          ) : (
            <ol className="shijing-consultation-history" role="list">
              {historyBuckets.map((bucket) => (
                <li key={bucket.key} className="shijing-consultation-history__group">
                  <p className="shijing-consultation-history__group-label">{bucket.label}</p>
                  <ol className="shijing-consultation-history__items" role="list">
                    {bucket.entries.map((reading) => (
                      <li key={reading.id}>
                        <button
                          type="button"
                          className={
                            selectedHistoryReadingId === reading.id
                              ? 'shijing-consultation-history__item shijing-consultation-history__item--active'
                              : 'shijing-consultation-history__item'
                          }
                          onClick={() => setSelectedHistoryReadingId(reading.id)}
                        >
                          <span className="shijing-consultation-history__title">{historyEntryTitle(reading)}</span>
                          <span className="shijing-consultation-history__time">{formatHistoryTime(reading.created_at, now)}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          )}

          {consultationHistory.length > 0 ? (
            <button type="button" className="shijing-consultation-sidebar__view-all">
              {BUTTONS.consultation_view_all_history} ›
            </button>
          ) : null}
        </aside>

        <div className="shijing-consultation-main">
          <div className="shijing-card shijing-consultation-composer">
            <h3 className="shijing-consultation-composer__heading">{BODY.consultation_compose_heading}</h3>
            <textarea
              id="consultation-question"
              className="shijing-consultation-composer__textarea"
              value={questionText}
              onChange={(event) => setQuestionText(event.target.value)}
              rows={6}
              placeholder={FIELD_PLACEHOLDERS.consultation_question_multiline}
              aria-label={BODY.consultation_label}
            />
            <div className="shijing-consultation-composer__toolbar">
              <div className="shijing-consultation-composer__pills">
                {basis === 'subject' ? (
                  <label
                    className="shijing-consultation-pill shijing-consultation-pill--horizon"
                    htmlFor="consultation-horizon-days"
                  >
                    <PillIcon name="calendar" />
                    <span className="shijing-consultation-pill__label">时间：</span>
                    <select
                      id="consultation-horizon-days"
                      value={HORIZON_PRESETS.some((p) => p.value === horizonDaysText) ? horizonDaysText : '30'}
                      onChange={(event) => setHorizonDaysText(event.target.value)}
                    >
                      {HORIZON_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>{preset.label}</option>
                      ))}
                    </select>
                    <span className="shijing-consultation-pill__chevron" aria-hidden />
                  </label>
                ) : (
                  <span className="shijing-consultation-pill shijing-consultation-pill--readonly">
                    <PillIcon name="calendar" />
                    <span className="shijing-consultation-pill__label">时间：</span>
                    <span className="shijing-consultation-pill__value">{selectedView ? '关注范围' : '—'}</span>
                    <span className="shijing-consultation-pill__chevron" aria-hidden />
                  </span>
                )}

                <label className="shijing-consultation-pill shijing-consultation-pill--context">
                  <PillIcon name="layers" />
                  <span className="shijing-consultation-pill__label">上下文：</span>
                  <select
                    aria-label="提问上下文"
                    value={contextSelectValue}
                    onChange={onContextChange}
                  >
                    <option value={CONTEXT_DEFAULT_VALUE}>默认</option>
                    {state.snapshot.views.map((view) => (
                      <option key={view.id} value={view.id}>
                        借用：{view.title}
                      </option>
                    ))}
                  </select>
                  <span className="shijing-consultation-pill__chevron" aria-hidden />
                </label>
              </div>

              <button
                type="button"
                className="shijing-consultation-composer__generate"
                onClick={onAsk}
                disabled={submission.kind === 'running' || subjectBlocked || viewBlocked || (basis === 'view_context' && noViewsAvailable)}
              >
                <PillIcon name="sparkle" />
                {submission.kind === 'running' ? BUTTONS.asking : BUTTONS.consultation_generate}
              </button>
            </div>
            {!targetReadiness.ok ? (
              <p className="shijing-consultation-composer__hint">
                <PillIcon name="info" />
                <span>{BODY.consultation_natal_incomplete_hint}</span>
              </p>
            ) : null}
          </div>

          {basis === 'view_context' && viewTimeWindowPreview !== null && !viewTimeWindowPreview.ok ? (() => {
            const formatted = formatViewTimeWindowUnavailable(viewTimeWindowPreview.error, state.snapshot);
            return (
              <>
                <p className="shijing-status shijing-status--advisory" role="status">{formatted.headline}</p>
                <TechnicalDetails content={formatted.technical} />
              </>
            );
          })() : null}
          {submission.kind === 'running' ? (
            <p className="shijing-status" role="status">{STATUS.generating}</p>
          ) : null}
          {submission.kind === 'failed' ? (
            <>
              <p className="shijing-status shijing-status--advisory" role="status">{submission.headline}</p>
              <TechnicalDetails content={submission.technical} />
            </>
          ) : null}
          {submission.kind === 'saved' ? (
            <div className="shijing-status shijing-status--success shijing-consultation-saved" role="status">
              <span>{STATUS.saved_consultation}</span>
              <button type="button" data-variant="secondary" onClick={onStartFollowupConversation}>
                {BUTTONS.start_followup_conversation}
              </button>
            </div>
          ) : null}

          <div className="shijing-consultation-suggestions">
            <p className="shijing-consultation-suggestions__heading">{BODY.consultation_suggestions_heading}</p>
            <div className="shijing-consultation-suggestions__list">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  className="shijing-consultation-suggestion"
                  onClick={() => setQuestionText(prompt.text)}
                >
                  <PillIcon name={prompt.icon} />
                  <span>{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>

          {displayedConsultation ? (
            <ReadingEvidenceCard
              reading={displayedConsultation}
              space={state.snapshot}
              heading={HEADINGS.consultation_latest}
              expired={latestConsultationExpired}
              expiredMessage={BODY.reading_expired_7d}
            />
          ) : null}
        </div>
      </div>

      <ConversationThreadOverlay
        open={conversationOverlayOpen}
        onClose={() => setConversationOverlayOpen(false)}
        conversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
      />
    </section>
  );
}
