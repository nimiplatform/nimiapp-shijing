// Consultation tab. Wave-12 wires generateReading for ad_hoc
// consultation. Failure / runtime / validation states surface as
// typed UI alerts; no synthesized substitute content.

import { useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { describeTab } from '../navigation/tab-descriptor.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import type { ReadingTimeWindow } from '../../domain/reading.ts';
import type { GenerateReadingFailure } from '../astrology/generate-reading.ts';
import { inputsSummaryExpired } from '../astrology/inputs-summary-expiry.ts';

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

function describeGenerateFailure(error: GenerateReadingFailure): string {
  if (error.kind === 'pipeline_stage_failed') {
    return `pipeline_stage_failed: ${error.stage_failure.stage} / ${error.stage_failure.kind}`;
  }
  if (error.kind === 'runtime_ai_failed') {
    return `runtime_ai_failed: ${error.ai_failure.kind}`;
  }
  return `reading_validation_failed: ${error.validation_error.code}`;
}

export function ConsultationTab() {
  const { state, dispatch, runtime_ai_client } = useShijingStore();
  const [questionText, setQuestionText] = useState('');
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'running' }
    | { kind: 'failed'; detail: string }
    | { kind: 'saved'; reading_id: string }
  >({ kind: 'idle' });

  async function onAsk() {
    if (questionText.trim().length === 0) {
      setSubmission({ kind: 'failed', detail: 'question text required' });
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
      setSubmission({ kind: 'failed', detail: describeGenerateFailure(outcome.error) });
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
          <p className="shijing-tab__eyebrow">Ad-hoc · 当下问题</p>
          <h2 id="shijing-consultation-heading">{TAB.chinese_label}</h2>
        </div>
      </header>

      <div className="shijing-card shijing-card--form">
        <h3>提出你的问题</h3>
        <p>
          描述当下的具体情境或决策困惑。生成器会基于观察对象的 deterministic
          特征 + 你提供的语境，给出一份 Reading；失败状态原样回显。
        </p>
        <label htmlFor="consultation-question">问题描述</label>
        <textarea
          id="consultation-question"
          value={questionText}
          onChange={(event) => setQuestionText(event.target.value)}
          rows={4}
          placeholder="例如：下个月要不要换工作？目前的犹豫主要是…"
        />
        <div className="shijing-card__action">
          <button type="button" onClick={onAsk} disabled={submission.kind === 'running'}>
            {submission.kind === 'running' ? '生成中…' : '生成 Consultation Reading'}
          </button>
        </div>
      </div>

      {submission.kind === 'running' ? (
        <p className="shijing-status" role="status">Generating…</p>
      ) : null}
      {submission.kind === 'failed' ? (
        <p className="shijing-status shijing-status--alert" role="alert">Generation refused: {submission.detail}</p>
      ) : null}
      {submission.kind === 'saved' ? (
        <p className="shijing-status shijing-status--success" role="status">Saved consultation {submission.reading_id}.</p>
      ) : null}

      {latestConsultation ? (
        <article className="shijing-card shijing-card--reading">
          <header className="shijing-card__head">
            <h3>最新 Consultation</h3>
            <small>{new Date(latestConsultation.created_at).toLocaleString('zh-CN')}</small>
          </header>
          {latestConsultationExpired ? (
            <p className="shijing-status shijing-status--alert" role="status">
              此 Reading 已超过 7d 的快照新鲜窗口,建议重新生成 (SJG-ASTRO-09)。
            </p>
          ) : null}
          <p className="shijing-reading__summary">{latestConsultation.output.summary}</p>
        </article>
      ) : (
        <div className="shijing-card shijing-card--empty">
          <p>尚无 Consultation Reading。</p>
        </div>
      )}
    </section>
  );
}
