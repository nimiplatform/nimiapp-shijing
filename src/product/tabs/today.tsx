// Today tab. Wave-12 wires generateReading. Pipeline failure / runtime
// failure / validation failure surface verbatim as typed status; no
// synthesized substitute Reading text is ever rendered.
//
// The Today surface composes the generation flow into a layered layout:
//
//   Today header         — "今日" title + inline date / weekday
//   TodayHero            — conclusion / keywords / leanings + a reminder
//                          slot that doubles as a "natal gap notice"
//                          (warning + 去补全 button) when the observation
//                          target still has incomplete birth info; plus
//                          an icon-only refresh control pinned to the
//                          top-right, a "今日节奏" three-column morning
//                          / afternoon / evening strip, and a "今日参考
//                          的事件" footer that surfaces the inputs the
//                          conclusion was read against.
//   TodayEventInputCard  — "今天有特别的事情吗？" lightweight input
//   TodayActions         — three small action cards (do / say / avoid)
//   TodaySplit           — interpretation + relations/affairs dual card
//   TodayReflectionCard  — single "best question to ask yourself" callout
//   TodayEvidenceRow     — collapsible evidence + ReadingEvidenceCard

import { useRef, useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { describeTab } from '../navigation/tab-descriptor.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { inputsSummaryExpired } from '../astrology/inputs-summary-expiry.ts';
import { BODY, BUTTONS, EMPTY_STATES, STATUS } from '../i18n/copy.ts';
import { formatGenerateReadingFailure } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';
import { latestReadingForTarget } from '../reading/reading-selectors.ts';
import { ReadingEvidenceCard } from '../reading/reading-evidence-card.tsx';
import {
  enumerateNatalGaps,
  natalReadinessHeadline,
  subjectNatalReadiness,
  type NatalGap,
} from '../subjects/natal-readiness.ts';
import type { NatalInputs } from '../../domain/person.ts';
import type { ReadingTimeWindow } from '../../domain/reading.ts';
import { isPersonRef, isSelfRef } from '../../domain/subject-ref.ts';
import { todayBasisLabelFor, todayTimeWindowFor } from './today-time-window.ts';
import {
  deriveEvidenceChips,
  deriveTodayActions,
  deriveTodayHero,
  deriveTodayReflection,
  deriveTodaySplitCards,
  deriveTodayTimeSlots,
  todayDateLabel,
} from './today-derive.ts';
import { TodayHero } from './today-hero.tsx';
import { TodayActions } from './today-actions.tsx';
import { TodaySplit } from './today-split-cards.tsx';
import { TodayReflectionCard } from './today-reflection.tsx';
import { TodayEvidenceRow } from './today-evidence.tsx';
import { TodayEventInputCard } from './today-event-input.tsx';

const TAB = describeTab('today');

function natalInputsForObservationTarget(
  state: ReturnType<typeof useShijingStore>['state'],
): NatalInputs | null {
  const target = state.observation_target;
  if (isSelfRef(target)) return state.snapshot.self_subject.natal_inputs;
  if (isPersonRef(target)) {
    return state.snapshot.persons.find((p) => p.id === target.id)?.natal_inputs ?? null;
  }
  return null;
}

export function TodayTab() {
  const { state, dispatch, runtime_ai_client } = useShijingStore();
  const runningRef = useRef(false);
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'running' }
    | { kind: 'failed'; headline: string; technical: string }
    | { kind: 'saved'; reading_id: string }
  >({ kind: 'idle' });
  const targetReadiness = subjectNatalReadiness(state.observation_target, state.snapshot);
  const basisTimeZone = targetReadiness.ok
    ? targetReadiness.inputs.birth_location.iana_time_zone
    : 'Etc/UTC';
  const dateLabel = todayDateLabel(basisTimeZone);
  // The legacy basis label is still surfaced as a small aria description so
  // assistive tooling has the canonical "Asia/Shanghai · 2026 年 5 月 26 日"
  // string available even when the visual layout splits it across chips.
  const todayBasisLabel = targetReadiness.ok
    ? todayBasisLabelFor(basisTimeZone)
    : BODY.today_basis_pending;

  const targetInputs = natalInputsForObservationTarget(state);
  const placeholderWindow: ReadingTimeWindow = {
    mode: 'natal',
    basis_time_zone: 'Etc/UTC',
    source: 'kind_default',
  };
  const gaps: readonly NatalGap[] = enumerateNatalGaps({
    inputs: targetInputs,
    kind: 'today',
    scope: 'subject',
    time_window: placeholderWindow,
  });
  const hasBlockerGap = gaps.some((g) => g.severity === 'blocker');
  const canGenerate = !hasBlockerGap;

  function goCompleteBirthInfo() {
    dispatch({ type: 'tab/activate', tab: 'me' });
  }

  function goAskShijing() {
    dispatch({ type: 'tab/activate', tab: 'consultation' });
  }

  async function onGenerate() {
    if (runningRef.current) return;
    if (hasBlockerGap) {
      const firstBlocker = gaps.find((g) => g.severity === 'blocker');
      setSubmission({
        kind: 'failed',
        headline: targetReadiness.ok
          ? '生成前还需要补全必填字段。'
          : natalReadinessHeadline(targetReadiness),
        technical: firstBlocker ? `${firstBlocker.label}: ${firstBlocker.help}` : '',
      });
      return;
    }
    runningRef.current = true;
    setSubmission({ kind: 'running' });
    try {
      const createdAt = new Date();
      const id = `reading_${createdAt.getTime()}`;
      const generationBasisTz = targetReadiness.ok
        ? targetReadiness.inputs.birth_location.iana_time_zone
        : basisTimeZone;
      const outcome = await generateReadingForStorage({
        id,
        created_at: createdAt.toISOString(),
        kind: 'today',
        scope: 'subject',
        anchor_subject: state.observation_target,
        subjects: [state.observation_target],
        time_window: todayTimeWindowFor(generationBasisTz, createdAt),
        space: state.snapshot,
        runtime_ai_client,
        allow_warnings: true,
      });
      if (!outcome.ok) {
        const formatted = formatGenerateReadingFailure(outcome.error);
        setSubmission({ kind: 'failed', headline: formatted.headline, technical: formatted.technical });
        return;
      }
      dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
      setSubmission({ kind: 'saved', reading_id: outcome.reading.id });
    } finally {
      runningRef.current = false;
    }
  }

  const latestToday = latestReadingForTarget({
    readings: state.snapshot.readings,
    kind: 'today',
    scope: 'subject',
    target: state.observation_target,
  });
  // SJG-ASTRO-09: today readings expire 24h after captured_at. We
  // surface a regeneration suggestion banner; we never refuse to
  // render the expired Reading (it is retained as evidence).
  const latestTodayExpired = latestToday ? inputsSummaryExpired(latestToday, new Date()) : false;

  const hero = deriveTodayHero(latestToday);
  const actions = deriveTodayActions(latestToday);
  const timeSlots = deriveTodayTimeSlots(latestToday);
  const splitCards = deriveTodaySplitCards(latestToday);
  const reflection = deriveTodayReflection(latestToday);
  const evidenceChips = deriveEvidenceChips(latestToday);

  const refreshLabel = submission.kind === 'running' ? BUTTONS.generating : '刷新今日';

  return (
    <section
      className="shijing-tab shijing-tab--today"
      aria-labelledby="shijing-today-heading"
      aria-busy={submission.kind === 'running' ? 'true' : undefined}
    >
      <header className="shijing-today-header">
        <div className="shijing-today-header__title">
          <h2 id="shijing-today-heading">{TAB.chinese_label}</h2>
          <span className="shijing-today-header__date" aria-hidden>
            <span className="shijing-today-header__date-main">{dateLabel.date}</span>
            <span className="shijing-today-header__date-sep" aria-hidden>·</span>
            <span>{dateLabel.weekday}</span>
          </span>
          {/* The canonical IANA basis label is kept in the accessibility
              tree (e.g. "Etc/UTC · 2026 年 5 月 27 日") for assistive
              tooling; the visible header only shows the friendly date
              and weekday. */}
          <span className="sr-only">
            {todayBasisLabel}
            {latestToday
              ? null
              : canGenerate
                ? ` · ${EMPTY_STATES.today_reading_ready}`
                : ` · ${EMPTY_STATES.today_reading_needs_birth_info}`}
          </span>
        </div>
      </header>

      <TodayHero
        content={hero}
        refreshDisabled={submission.kind === 'running' || !canGenerate}
        refreshAriaLabel={refreshLabel}
        onRefresh={onGenerate}
        timeSlots={timeSlots}
        gaps={gaps}
        onCompleteBirthInfo={goCompleteBirthInfo}
      />

      <TodayEventInputCard primarySubject={state.observation_target} />

      <TodayActions items={actions} />

      <TodaySplit content={splitCards} />

      <TodayReflectionCard
        content={reflection}
        ctaLabel="把这个问题带去问时镜"
        onAsk={goAskShijing}
      />

      <TodayEvidenceRow chips={evidenceChips} disabled={!latestToday}>
        {latestToday ? (
          <ReadingEvidenceCard
            reading={latestToday}
            space={state.snapshot}
            heading="今日推演证据"
            expired={latestTodayExpired}
            expiredMessage={BODY.reading_expired_24h}
          />
        ) : null}
      </TodayEvidenceRow>

      {submission.kind === 'running' ? (
        <p className="shijing-status" role="status">{BODY.today_waiting_notice}</p>
      ) : null}
      {submission.kind === 'failed' ? (
        <div className="shijing-today-submission shijing-today-submission--failed">
          <p className="shijing-status shijing-status--alert" role="alert">{submission.headline}</p>
          {canGenerate ? (
            <button type="button" onClick={onGenerate}>
              {BUTTONS.retry_generate}
            </button>
          ) : (
            <button type="button" onClick={goCompleteBirthInfo}>{BUTTONS.complete_birth_info}</button>
          )}
          <TechnicalDetails content={submission.technical} />
        </div>
      ) : null}
      {submission.kind === 'saved' ? (
        <p className="shijing-status shijing-status--success" role="status">{STATUS.saved_reading}</p>
      ) : null}
    </section>
  );
}
