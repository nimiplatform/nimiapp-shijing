// Consultation tab. Wave-12 wires generateReading for ad_hoc
// consultation. Failure / runtime / validation states surface as
// typed UI alerts; no synthesized substitute content.

import { useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { describeTab } from '../navigation/tab-descriptor.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import type { ReadingTimeWindow } from '../../domain/reading.ts';
import { inputsSummaryExpired } from '../astrology/inputs-summary-expiry.ts';
import {
  BODY,
  BUTTONS,
  EMPTY_STATES,
  FAILURE_HEADLINES,
  FIELD_PLACEHOLDERS,
  HEADINGS,
  STATUS,
  TAB_EYEBROWS,
} from '../i18n/copy.ts';
import { formatGenerateReadingFailure } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';

const TAB = describeTab('consultation');

function adHocTimeWindow(basisTimeZone: string): ReadingTimeWindow {
  const now = new Date();
  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)).toISOString();
  const endUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 30, 0, 0, 0)).toISOString();
  return {
    mode: 'bounded',
    start_utc: startUtc,
    end_utc: endUtc,
    // SJG-ALGO-03: basis_time_zone is captured at Reading creation
    // and never inferred later; read from the self subject's IANA TZ.
    basis_time_zone: basisTimeZone,
    source: 'ad_hoc_question',
  };
}

export function ConsultationTab() {
  const { state, dispatch, runtime_ai_client } = useShijingStore();
  const [questionText, setQuestionText] = useState('');
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'running' }
    | { kind: 'failed'; headline: string; technical: string }
    | { kind: 'saved'; reading_id: string }
  >({ kind: 'idle' });

  async function onAsk() {
    if (questionText.trim().length === 0) {
      setSubmission({ kind: 'failed', headline: FAILURE_HEADLINES.consultation_empty, technical: '' });
      return;
    }
    setSubmission({ kind: 'running' });
    const id = `reading_${Date.now()}`;
    const basisTimeZone = state.snapshot.self_subject.natal_inputs.birth_location.iana_time_zone;
    const outcome = await generateReadingForStorage({
      id,
      created_at: new Date().toISOString(),
      kind: 'consultation',
      scope: 'ad_hoc',
      anchor_subject: state.observation_target,
      subjects: [state.observation_target],
      time_window: adHocTimeWindow(basisTimeZone),
      space: state.snapshot,
      ad_hoc_context_text: questionText,
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

  const latestConsultation = [...state.snapshot.readings]
    .reverse()
    .find((reading) => reading.kind === 'consultation');
  // SJG-ASTRO-09: consultation readings expire 7d after captured_at.
  const latestConsultationExpired = latestConsultation
    ? inputsSummaryExpired(latestConsultation, new Date())
    : false;

  return (
    <section className="shijing-tab shijing-tab--consultation" aria-labelledby="shijing-consultation-heading">
      <header className="shijing-tab__header">
        <div>
          <p className="shijing-tab__eyebrow">{TAB_EYEBROWS.consultation}</p>
          <h2 id="shijing-consultation-heading">{TAB.chinese_label}</h2>
        </div>
      </header>

      <div className="shijing-card shijing-card--form">
        <h3>{HEADINGS.consultation_card_title}</h3>
        <p>{BODY.consultation_intro}</p>
        <label htmlFor="consultation-question">{BODY.consultation_label}</label>
        <textarea
          id="consultation-question"
          value={questionText}
          onChange={(event) => setQuestionText(event.target.value)}
          rows={4}
          placeholder={FIELD_PLACEHOLDERS.consultation_question}
        />
        <div className="shijing-card__action">
          <button type="button" onClick={onAsk} disabled={submission.kind === 'running'}>
            {submission.kind === 'running' ? BUTTONS.asking : BUTTONS.ask}
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
        <p className="shijing-status shijing-status--success" role="status">{STATUS.saved_consultation}</p>
      ) : null}

      {latestConsultation ? (
        <article className="shijing-card shijing-card--reading">
          <header className="shijing-card__head">
            <h3>{HEADINGS.consultation_latest}</h3>
            <small>{new Date(latestConsultation.created_at).toLocaleString('zh-CN')}</small>
          </header>
          {latestConsultationExpired ? (
            <p className="shijing-status shijing-status--alert" role="status">
              {BODY.reading_expired_7d}
            </p>
          ) : null}
          <p className="shijing-reading__summary">{latestConsultation.output.summary}</p>
        </article>
      ) : (
        <div className="shijing-card shijing-card--empty">
          <p>{EMPTY_STATES.consultation_reading}</p>
        </div>
      )}
    </section>
  );
}
