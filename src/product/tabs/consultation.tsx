// Consultation tab. Wave-12 wires generateReading for ad_hoc
// consultation. Failure / runtime / validation states surface as
// typed UI alerts; no synthesized substitute content.

import { useMemo, useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { describeTab } from '../navigation/tab-descriptor.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { inputsSummaryExpired } from '../astrology/inputs-summary-expiry.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { Conversation } from '../../domain/conversation.ts';
import {
  BODY,
  BUTTONS,
  EMPTY_STATES,
  FAILURE_HEADLINES,
  FIELD_LABELS,
  FIELD_PLACEHOLDERS,
  HEADINGS,
  SELECT_REQUIRED_PLACEHOLDER,
  STATUS,
  TAB_EYEBROWS,
} from '../i18n/copy.ts';
import { formatCreateRefusal, formatGenerateReadingFailure } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';
import { subjectDisplayName } from '../i18n/subject-display-name.ts';
import { latestReadingForTarget } from '../reading/reading-selectors.ts';
import { ReadingEvidenceCard } from '../reading/reading-evidence-card.tsx';
import { natalReadinessHeadline, subjectNatalReadiness } from '../subjects/natal-readiness.ts';
import { SelectField, TextField } from '../inputs/natal-inputs-fields.tsx';
import {
  buildConsultationContextText,
  consultationTimeWindowFromDays,
  parseConsultationHorizonDays,
} from '../consultation/consultation-flow.ts';
import { resolveViewTimeWindow, type ViewTimeWindowUnavailable } from '../views/view-workspace-model.ts';
import { ConversationThreadOverlay } from '../conversations/conversation-thread.tsx';
import { newConversationId } from '../conversations/conversation-id.ts';

const TAB = describeTab('consultation');

type ConsultationBasis = 'subject' | 'view_context';

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

export function ConsultationTab() {
  const { state, dispatch, runtime_ai_client } = useShijingStore();
  const [questionText, setQuestionText] = useState('');
  const [basis, setBasis] = useState<ConsultationBasis>('subject');
  const [horizonDaysText, setHorizonDaysText] = useState('30');
  const [selectedViewId, setSelectedViewId] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationOverlayOpen, setConversationOverlayOpen] = useState(false);
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

  const latestConsultation = latestReadingForTarget({
    readings: state.snapshot.readings,
    kind: 'consultation',
    scope: 'ad_hoc',
    target: state.observation_target,
  });
  const savedConsultation = submission.kind === 'saved'
    ? state.snapshot.readings.find((reading) => reading.id === submission.reading_id)
    : undefined;
  const displayedConsultation = savedConsultation ?? latestConsultation;
  // SJG-ASTRO-09: consultation readings expire 7d after captured_at.
  const latestConsultationExpired = displayedConsultation
    ? inputsSummaryExpired(displayedConsultation, new Date())
    : false;
  const subjectBlocked = basis === 'subject' && !targetReadiness.ok;
  const viewBlocked = basis === 'view_context' && (
    !selectedView ||
    (viewTimeWindowPreview !== null && !viewTimeWindowPreview.ok)
  );

  return (
    <section className="shijing-tab shijing-tab--consultation" aria-labelledby="shijing-consultation-heading">
      <header className="shijing-tab__header">
        <div>
          <p className="shijing-tab__eyebrow">{TAB_EYEBROWS.consultation}</p>
          <h2 id="shijing-consultation-heading">{TAB.chinese_label}</h2>
        </div>
        <span className="shijing-chip">查看：{subjectDisplayName(state.observation_target, state.snapshot)}</span>
      </header>

      <div className="shijing-card shijing-card--form">
        <h3>{HEADINGS.consultation_card_title}</h3>
        <p>{BODY.consultation_intro}</p>
        <fieldset className="shijing-consultation-basis">
          <legend>{HEADINGS.consultation_flow_basis}</legend>
          <label>
            <input
              type="radio"
              name="consultation-basis"
              checked={basis === 'subject'}
              onChange={() => setBasis('subject')}
            />
            <span>{BODY.consultation_subject_basis}</span>
          </label>
          <label>
            <input
              type="radio"
              name="consultation-basis"
              checked={basis === 'view_context'}
              disabled={state.snapshot.views.length === 0}
              onChange={() => setBasis('view_context')}
            />
            <span>{BODY.consultation_view_basis}</span>
          </label>
        </fieldset>
        {basis === 'subject' ? (
          <TextField
            id="consultation-horizon-days"
            label={FIELD_LABELS.consultation_horizon_days}
            value={horizonDaysText}
            required
            onChange={setHorizonDaysText}
          />
        ) : (
          <SelectField
            id="consultation-view-context"
            label={FIELD_LABELS.consultation_view_context}
            value={selectedViewId}
            options={state.snapshot.views.map((view) => view.id)}
            optionLabel={(id) => state.snapshot.views.find((view) => view.id === id)?.title ?? id}
            emptyLabel={SELECT_REQUIRED_PLACEHOLDER}
            required
            onChange={setSelectedViewId}
          />
        )}
        <label htmlFor="consultation-question">{BODY.consultation_label}</label>
        <textarea
          id="consultation-question"
          value={questionText}
          onChange={(event) => setQuestionText(event.target.value)}
          rows={4}
          placeholder={FIELD_PLACEHOLDERS.consultation_question}
        />
        <div className="shijing-card__action">
          <button
            type="button"
            onClick={onAsk}
            disabled={submission.kind === 'running' || subjectBlocked || viewBlocked}
          >
            {submission.kind === 'running' ? BUTTONS.asking : BUTTONS.ask}
          </button>
        </div>
      </div>

      {basis === 'subject' && !targetReadiness.ok ? (
        <p className="shijing-status shijing-status--alert" role="status">
          {natalReadinessHeadline(targetReadiness)}
        </p>
      ) : null}
      {basis === 'view_context' && viewTimeWindowPreview !== null && !viewTimeWindowPreview.ok ? (() => {
        const formatted = formatViewTimeWindowUnavailable(viewTimeWindowPreview.error, state.snapshot);
        return (
          <>
            <p className="shijing-status shijing-status--alert" role="status">{formatted.headline}</p>
            <TechnicalDetails content={formatted.technical} />
          </>
        );
      })() : null}
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
        <div className="shijing-status shijing-status--success shijing-consultation-saved" role="status">
          <span>{STATUS.saved_consultation}</span>
          <button type="button" data-variant="secondary" onClick={onStartFollowupConversation}>
            {BUTTONS.start_followup_conversation}
          </button>
        </div>
      ) : null}

      {displayedConsultation ? (
        <ReadingEvidenceCard
          reading={displayedConsultation}
          space={state.snapshot}
          heading={HEADINGS.consultation_latest}
          expired={latestConsultationExpired}
          expiredMessage={BODY.reading_expired_7d}
        />
      ) : (
        <div className="shijing-card shijing-card--empty">
          <p>{EMPTY_STATES.consultation_reading}</p>
        </div>
      )}

      <ConversationThreadOverlay
        open={conversationOverlayOpen}
        onClose={() => setConversationOverlayOpen(false)}
        conversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
      />
    </section>
  );
}
