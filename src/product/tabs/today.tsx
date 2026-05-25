// Today tab. Wave-12 wires generateReading. Pipeline failure / runtime
// failure / validation failure surface verbatim as typed status; no
// synthesized substitute Reading text is ever rendered.

import { useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { describeTab } from '../navigation/tab-descriptor.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import type { ReadingTimeWindow } from '../../domain/reading.ts';
import { inputsSummaryExpired } from '../astrology/inputs-summary-expiry.ts';
import { BODY, BUTTONS, EMPTY_STATES, HEADINGS, STATUS } from '../i18n/copy.ts';
import { subjectDisplayName } from '../i18n/subject-display-name.ts';
import { formatGenerateReadingFailure } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';

const TAB = describeTab('today');

function todayTimeWindow(basisTimeZone: string): ReadingTimeWindow {
  const now = new Date();
  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)).toISOString();
  const endUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)).toISOString();
  return {
    mode: 'bounded',
    start_utc: startUtc,
    end_utc: endUtc,
    // SJG-ALGO-03: basis_time_zone is captured at Reading creation
    // and never inferred later; we read it from the self subject's
    // recorded natal birth location so the user's stored IANA TZ is
    // the single source of truth.
    basis_time_zone: basisTimeZone,
    source: 'kind_default',
  };
}

function todayDateLabel(): string {
  const now = new Date();
  return now.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
}

export function TodayTab() {
  const { state, dispatch, runtime_ai_client } = useShijingStore();
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'running' }
    | { kind: 'failed'; headline: string; technical: string }
    | { kind: 'saved'; reading_id: string }
  >({ kind: 'idle' });

  async function onGenerate() {
    setSubmission({ kind: 'running' });
    const id = `reading_${Date.now()}`;
    const basisTimeZone = state.snapshot.self_subject.natal_inputs.birth_location.iana_time_zone;
    const outcome = await generateReadingForStorage({
      id,
      created_at: new Date().toISOString(),
      kind: 'today',
      scope: 'subject',
      anchor_subject: state.observation_target,
      subjects: [state.observation_target],
      time_window: todayTimeWindow(basisTimeZone),
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
  }

  const latestToday = [...state.snapshot.readings]
    .reverse()
    .find((reading) => reading.kind === 'today');
  // SJG-ASTRO-09: today readings expire 24h after captured_at. We
  // surface a regeneration suggestion banner; we never refuse to
  // render the expired Reading (it is retained as evidence).
  const latestTodayExpired = latestToday ? inputsSummaryExpired(latestToday, new Date()) : false;

  return (
    <section className="shijing-tab shijing-tab--today" aria-labelledby="shijing-today-heading">
      <header className="shijing-tab__header">
        <div>
          <p className="shijing-tab__eyebrow">{todayDateLabel()}</p>
          <h2 id="shijing-today-heading">{TAB.chinese_label}</h2>
        </div>
        <span className="shijing-chip">查看：{subjectDisplayName(state.observation_target, state.snapshot)}</span>
      </header>

      <div className="shijing-card shijing-card--action">
        <div className="shijing-card__copy">
          <h3>{HEADINGS.today_card_title}</h3>
          <p>{BODY.today_intro}</p>
        </div>
        <div className="shijing-card__action">
          <button type="button" onClick={onGenerate} disabled={submission.kind === 'running'}>
            {submission.kind === 'running' ? BUTTONS.generating : BUTTONS.generate_today}
          </button>
        </div>
      </div>

      {submission.kind === 'running' ? (
        <p className="shijing-status" role="status">{STATUS.generating}</p>
      ) : null}
      {submission.kind === 'failed' ? (
        <>
          <p className="shijing-status shijing-status--alert" role="alert">{submission.headline}</p>
          <TechnicalDetails content={submission.technical} />
        </>
      ) : null}
      {submission.kind === 'saved' ? (
        <p className="shijing-status shijing-status--success" role="status">{STATUS.saved_reading}</p>
      ) : null}

      {latestToday ? (
        <article className="shijing-card shijing-card--reading">
          <header className="shijing-card__head">
            <h3>{HEADINGS.today_latest}</h3>
            <small>{new Date(latestToday.created_at).toLocaleString('zh-CN')}</small>
          </header>
          {latestTodayExpired ? (
            <p className="shijing-status shijing-status--alert" role="status">
              {BODY.reading_expired_24h}
            </p>
          ) : null}
          <p className="shijing-reading__summary">{latestToday.output.summary}</p>
          {latestToday.output.recommendations.length > 0 ? (
            <ul className="shijing-reading__recs">
              {latestToday.output.recommendations.map((rec, idx) => (
                <li key={idx}>
                  <span className="shijing-reading__rec-body">{rec.body}</span>
                  <span className="shijing-reading__rec-horizon">{rec.horizon}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ) : (
        <div className="shijing-card shijing-card--empty">
          <p>{EMPTY_STATES.today_reading}</p>
        </div>
      )}
    </section>
  );
}
