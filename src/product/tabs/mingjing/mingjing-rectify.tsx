// 命镜 · 生时校正 — record life events, back-solve the most likely 时辰, and adopt
// it (which corrects the natal inputs). Deterministic ranking; the user confirms.

import { useMemo, useState } from 'react';
import { DatePicker } from '@nimiplatform/kit/ui';
import { useProductCopy } from '../../i18n/copy.ts';
import type { ShiJingSpace } from '../../../domain/shijing-space.ts';
import type { RectificationCandidate } from '../../../domain/rectification.ts';
import { rectifyBirthTime, applyRectifiedBirthTime } from '../../astrology/birth-time-rectification.ts';
import { upsertEventMemory, deleteEventMemory } from '../../memories/memory-editor-state.ts';
import { newEventMemoryId } from '../../ids/index.ts';
import { BRANCH_HANZI, pillarHanzi } from './ganzhi-hanzi.ts';
import { MingJingInfo } from './mingjing-info.tsx';

const MAX_SHOWN = 6;

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function MingJingRectify({
  space,
  onSpaceChange,
  onClose,
}: {
  readonly space: ShiJingSpace;
  readonly onSpaceChange: (next: ShiJingSpace) => void;
  readonly onClose?: () => void;
}) {
  const copy = useProductCopy();
  const r = copy.mingjing.rectify;
  const e = copy.mingjing.events;
  const [date, setDate] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState(false);

  const events = useMemo(
    () => [...space.event_memories].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at)),
    [space.event_memories],
  );
  const outcome = useMemo(
    () => rectifyBirthTime({ natal_inputs: space.self_subject.natal_inputs, events: space.event_memories }),
    [space.self_subject.natal_inputs, space.event_memories],
  );

  function shichenLabel(c: RectificationCandidate): string {
    if (c.hour_branch === 'zi') return c.is_late_zi ? r.lateZi : r.earlyZi;
    return `${BRANCH_HANZI[c.hour_branch]}${r.shichenSuffix}`;
  }

  function handleAdd() {
    if (!date || body.trim().length === 0) {
      setError(true);
      return;
    }
    const now = nowIso();
    const result = upsertEventMemory(space, {
      id: newEventMemoryId(),
      occurred_at: `${date}T00:00:00Z`,
      body: body.trim(),
      person_refs: [],
      concern_tag_refs: [],
      source: 'manual',
      admissible_use: 'eligible_for_retrieval',
      created_at: now,
      updated_at: now,
    });
    if (result.ok) {
      onSpaceChange(result.next_space);
      setDate('');
      setBody('');
      setError(false);
    } else {
      setError(true);
    }
  }

  function handleDelete(id: string) {
    const result = deleteEventMemory(space, id);
    if (result.ok) onSpaceChange(result.next_space);
  }

  function handleAdopt(candidate: RectificationCandidate) {
    const corrected = applyRectifiedBirthTime(space.self_subject.natal_inputs, candidate.representative_time);
    if (!corrected) return;
    onSpaceChange({ ...space, self_subject: { ...space.self_subject, natal_inputs: corrected } });
  }

  const unavailableMessage =
    outcome.ok
      ? null
      : outcome.reason === 'calendar_not_gregorian'
        ? r.unsupportedCalendar
        : outcome.reason === 'calculation_sex_unspecified'
          ? r.sexRequired
          : outcome.reason === 'not_enough_events'
            ? r.needMoreEvents
            : r.needMoreEvents;

  return (
    <section className="shijing-mingjing-panel shijing-mingjing-rectify" aria-label={r.title}>
      <header className="shijing-mingjing-panel__head shijing-mj-rectify__head">
        <div>
          <div className="shijing-mingjing-panel__title-row">
            <h2 className="shijing-mingjing-panel__title">{r.title}</h2>
            <MingJingInfo label={`${r.title}说明`}>
              <p>{r.intro}</p>
              <p>{r.howItWorks}</p>
            </MingJingInfo>
          </div>
        </div>
        {onClose ? (
          <button type="button" className="shijing-mj-rectify__close" onClick={onClose}>{r.close}</button>
        ) : null}
      </header>

      <div className="shijing-mj-events__recorder">
        <label className="shijing-mj-events__field shijing-mj-events__field--date">
          <span>{e.dateLabel}</span>
          <div className="shijing-mj-events__datepicker">
            <DatePicker
              id="mingjing-rectify-event-date"
              value={date}
              onChange={(next) => setDate(next)}
              placeholder={e.datePlaceholder}
              className="shijing-mj-events__date-input"
              style={{ paddingRight: 56 }}
              allowClear
              maxDate="2100-12-31"
            />
          </div>
        </label>
        <label className="shijing-mj-events__field shijing-mj-events__field--grow">
          <span>{e.bodyLabel}</span>
          <input type="text" value={body} placeholder={e.bodyPlaceholder} onChange={(ev) => setBody(ev.target.value)} />
        </label>
        <button type="button" className="shijing-mj-events__add" onClick={handleAdd}>{e.add}</button>
      </div>
      {error ? <p className="shijing-mj-events__error" role="alert">{e.invalidHint}</p> : null}

      {events.length > 0 ? (
        <ul className="shijing-mj-rectify__events">
          {events.map((event) => (
            <li key={event.id}>
              <span>{event.occurred_at.slice(0, 10)}</span>
              <span className="shijing-mj-rectify__event-body">{event.body}</span>
              <button type="button" aria-label={e.delete} onClick={() => handleDelete(event.id)}>×</button>
            </li>
          ))}
        </ul>
      ) : null}

      {unavailableMessage ? (
        <p className="shijing-mj-rectify__unavailable" role="status">{unavailableMessage}</p>
      ) : null}

      {outcome.ok ? (
        <div className="shijing-mj-rectify__result">
          <p className="shijing-mj-rectify__confidence" data-confidence={outcome.result.confidence}>
            {r.confidenceLabel}: {r.confidenceValues[outcome.result.confidence]}
          </p>
          {outcome.result.confidence === 'low' ? (
            <p className="shijing-mj-rectify__caveat">{r.lowConfidenceCaveat}</p>
          ) : null}
          <ol className="shijing-mj-rectify__candidates">
            {outcome.result.candidates.slice(0, MAX_SHOWN).map((c) => {
              const isRecommended = outcome.result.recommended?.representative_time === c.representative_time;
              return (
                <li
                  key={c.representative_time}
                  className="shijing-mj-rectify__candidate"
                  data-recommended={isRecommended ? '' : undefined}
                >
                  <div className="shijing-mj-rectify__cand-head">
                    <span className="shijing-mj-rectify__shichen">{shichenLabel(c)}</span>
                    <span className="shijing-mj-rectify__pillar">{pillarHanzi(c.hour_pillar)}</span>
                    {isRecommended ? <em className="shijing-mj-rectify__badge">{r.recommended}</em> : null}
                    <span className="shijing-mj-rectify__startage">{r.startAge(c.start_age_years.toFixed(1))}</span>
                  </div>
                  <div className="shijing-mj-rectify__fit">
                    <span className="shijing-mj-rectify__fit-bar">
                      <span style={{ width: `${Math.round(c.fit_score * 100)}%` }} />
                    </span>
                    <span className="shijing-mj-rectify__fit-pct">{r.fitLabel} {Math.round(c.fit_score * 100)}%</span>
                  </div>
                  {isRecommended ? (
                    <p className="shijing-mj-rectify__aligned">
                      {r.alignedLabel}:{' '}
                      {c.aligned_events
                        .filter((a) => a.hour_interaction)
                        .map((a) => `${a.year} ${a.hour_interaction}时支`)
                        .join('、') || '—'}
                    </p>
                  ) : null}
                  <button type="button" className="shijing-mj-rectify__adopt" onClick={() => handleAdopt(c)}>
                    {r.adopt}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
