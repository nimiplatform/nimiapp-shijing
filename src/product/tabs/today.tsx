// Today tab. Wave-12 wires generateReading. Pipeline failure / runtime
// failure / validation failure surface verbatim as typed status; no
// synthesized substitute Reading text is ever rendered.

import { useRef, useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { describeTab } from '../navigation/tab-descriptor.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { inputsSummaryExpired } from '../astrology/inputs-summary-expiry.ts';
import { BODY, BUTTONS, EMPTY_STATES, HEADINGS, STATUS } from '../i18n/copy.ts';
import { subjectDisplayName } from '../i18n/subject-display-name.ts';
import { formatGenerateReadingFailure } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';
import { latestReadingForTarget } from '../reading/reading-selectors.ts';
import { ReadingEvidenceCard } from '../reading/reading-evidence-card.tsx';
import { natalReadinessHeadline, subjectNatalReadiness } from '../subjects/natal-readiness.ts';
import { todayBasisLabelFor, todayTimeWindowFor } from './today-time-window.ts';

const TAB = describeTab('today');

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
  const todayBasisLabel = targetReadiness.ok
    ? todayBasisLabelFor(targetReadiness.inputs.birth_location.iana_time_zone)
    : BODY.today_basis_pending;

  function goCompleteBirthInfo() {
    dispatch({ type: 'tab/activate', tab: 'me' });
  }

  async function onGenerate() {
    if (runningRef.current) return;
    if (!targetReadiness.ok) {
      setSubmission({
        kind: 'failed',
        headline: natalReadinessHeadline(targetReadiness),
        technical: targetReadiness.detail,
      });
      return;
    }
    runningRef.current = true;
    setSubmission({ kind: 'running' });
    try {
      const createdAt = new Date();
      const id = `reading_${createdAt.getTime()}`;
      const basisTimeZone = targetReadiness.inputs.birth_location.iana_time_zone;
      const outcome = await generateReadingForStorage({
        id,
        created_at: createdAt.toISOString(),
        kind: 'today',
        scope: 'subject',
        anchor_subject: state.observation_target,
        subjects: [state.observation_target],
        time_window: todayTimeWindowFor(basisTimeZone, createdAt),
        space: state.snapshot,
        runtime_ai_client,
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

  return (
    <section
      className="shijing-tab shijing-tab--today"
      aria-labelledby="shijing-today-heading"
      aria-busy={submission.kind === 'running' ? 'true' : undefined}
    >
      <header className="shijing-tab__header">
        <div>
          <p className="shijing-tab__eyebrow">{todayBasisLabel}</p>
          <h2 id="shijing-today-heading">{TAB.chinese_label}</h2>
        </div>
        <div className="shijing-tab__header-chips">
          <span className="shijing-chip">今日基准：{todayBasisLabel}</span>
          <span className="shijing-chip">查看：{subjectDisplayName(state.observation_target, state.snapshot)}</span>
        </div>
      </header>

      <div className="shijing-card shijing-card--action">
        <div className="shijing-card__copy">
          <h3>{HEADINGS.today_card_title}</h3>
          <p>{BODY.today_intro}</p>
        </div>
        <div className="shijing-card__action">
          <button
            type="button"
            onClick={onGenerate}
            disabled={submission.kind === 'running' || !targetReadiness.ok}
          >
            {submission.kind === 'running' ? BUTTONS.generating : BUTTONS.generate_today}
          </button>
          {!targetReadiness.ok ? (
            <button type="button" onClick={goCompleteBirthInfo}>
              {BUTTONS.complete_birth_info}
            </button>
          ) : null}
        </div>
      </div>

      {!targetReadiness.ok ? (
        <div className="shijing-status shijing-status--alert" role="status">
          <p>{natalReadinessHeadline(targetReadiness)}</p>
          <button type="button" onClick={goCompleteBirthInfo}>{BUTTONS.complete_birth_info}</button>
        </div>
      ) : null}
      {submission.kind === 'running' ? (
        <p className="shijing-status" role="status">{BODY.today_waiting_notice}</p>
      ) : null}
      {submission.kind === 'failed' ? (
        <>
          <p className="shijing-status shijing-status--alert" role="alert">{submission.headline}</p>
          {targetReadiness.ok ? (
            <button type="button" onClick={onGenerate}>
              {BUTTONS.retry_generate}
            </button>
          ) : (
            <button type="button" onClick={goCompleteBirthInfo}>{BUTTONS.complete_birth_info}</button>
          )}
          <TechnicalDetails content={submission.technical} />
        </>
      ) : null}
      {submission.kind === 'saved' ? (
        <p className="shijing-status shijing-status--success" role="status">{STATUS.saved_reading}</p>
      ) : null}

      {latestToday ? (
        <ReadingEvidenceCard
          reading={latestToday}
          space={state.snapshot}
          heading={HEADINGS.today_latest}
          expired={latestTodayExpired}
          expiredMessage={BODY.reading_expired_24h}
        />
      ) : (
        <div className="shijing-card shijing-card--empty">
          <p>{targetReadiness.ok ? EMPTY_STATES.today_reading_ready : EMPTY_STATES.today_reading_needs_birth_info}</p>
          {!targetReadiness.ok ? (
            <button type="button" onClick={goCompleteBirthInfo}>{BUTTONS.complete_birth_info}</button>
          ) : null}
        </div>
      )}
    </section>
  );
}
