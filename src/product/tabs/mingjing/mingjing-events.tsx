// 命镜 · 历史事件验证 — record past milestones and see where they land on the
// deterministic 大运/流年 timeline (resonance). The overlay is computed live from
// the chart (no AI); the AI 解读 separately uses these events as grounding.

import { useMemo, useState } from 'react';
import { DatePicker } from '@nimiplatform/kit/ui';
import { useProductCopy } from '../../i18n/copy.ts';
import type { ShiJingSpace } from '../../../domain/shijing-space.ts';
import type { MingJingChart } from '../../../domain/mingjing.ts';
import { computeEventResonance } from '../../astrology/engines/bazi/bazi-event-resonance.ts';
import { upsertEventMemory, deleteEventMemory } from '../../memories/memory-editor-state.ts';
import { newEventMemoryId } from '../../ids/index.ts';
import { pillarHanzi } from './ganzhi-hanzi.ts';
import { MingJingInfo } from './mingjing-info.tsx';

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function MingJingEvents({
  chart,
  space,
  onSpaceChange,
}: {
  readonly chart: MingJingChart;
  readonly space: ShiJingSpace;
  readonly onSpaceChange: (next: ShiJingSpace) => void;
}) {
  const copy = useProductCopy();
  const m = copy.mingjing.events;
  const tendencyLabels = copy.tendencyClassLabels;
  const [date, setDate] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState(false);

  const events = useMemo(
    () => [...space.event_memories].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at)),
    [space.event_memories],
  );
  const resonanceByRef = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeEventResonance>[number]>();
    for (const r of computeEventResonance(chart, events)) map.set(r.event_memory_ref, r);
    return map;
  }, [chart, events]);

  function handleAdd() {
    if (!date || body.trim().length === 0) {
      setError(true);
      return;
    }
    const now = nowIso();
    const outcome = upsertEventMemory(space, {
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
    if (outcome.ok) {
      onSpaceChange(outcome.next_space);
      setDate('');
      setBody('');
      setError(false);
    } else {
      setError(true);
    }
  }

  function handleDelete(id: string) {
    const outcome = deleteEventMemory(space, id);
    if (outcome.ok) onSpaceChange(outcome.next_space);
  }

  return (
    <section className="shijing-mingjing-panel shijing-mingjing-events" aria-label={m.title}>
      <header className="shijing-mingjing-panel__head">
        <div className="shijing-mingjing-panel__title-row">
          <h2 className="shijing-mingjing-panel__title">{m.title}</h2>
          <MingJingInfo label={`${m.title}说明`}>
            <p>{m.intro}</p>
            <p>{m.explanation}</p>
          </MingJingInfo>
        </div>
      </header>

      <div className="shijing-mj-events__recorder">
        <label className="shijing-mj-events__field shijing-mj-events__field--date">
          <span>{m.dateLabel}</span>
          <div className="shijing-mj-events__datepicker">
            <DatePicker
              id="mingjing-event-date"
              value={date}
              onChange={(next) => setDate(next)}
              placeholder={m.datePlaceholder}
              className="shijing-mj-events__date-input"
              style={{ paddingRight: 56 }}
              allowClear
              maxDate="2100-12-31"
            />
          </div>
        </label>
        <label className="shijing-mj-events__field shijing-mj-events__field--grow">
          <span>{m.bodyLabel}</span>
          <input
            type="text"
            value={body}
            placeholder={m.bodyPlaceholder}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <button type="button" className="shijing-mj-events__add" onClick={handleAdd}>
          {m.add}
        </button>
      </div>
      {error ? <p className="shijing-mj-events__error" role="alert">{m.invalidHint}</p> : null}

      {events.length === 0 ? (
        <p className="shijing-mj-events__empty">{m.empty}</p>
      ) : (
        <>
          <p className="shijing-mj-events__hint">{m.preGenHint}</p>
          <ul className="shijing-mj-events__list">
            {events.map((event) => {
              const r = resonanceByRef.get(event.id);
              return (
                <li key={event.id} className="shijing-mj-events__item" data-nature={r?.dayun_nature}>
                  <div className="shijing-mj-events__when">
                    <span className="shijing-mj-events__year">{event.occurred_at.slice(0, 10)}</span>
                  </div>
                  <p className="shijing-mj-events__body">{event.body}</p>
                  {r ? (
                    <dl className="shijing-mj-events__resonance">
                      <div>
                        <dt>{m.dayunColumn}</dt>
                        <dd>
                          {r.dayun_pillar ? pillarHanzi(r.dayun_pillar) : '—'}
                          {r.dayun_ten_god ? `·${r.dayun_ten_god}` : ''}
                          <span data-favor={r.dayun_favor}>（{tendencyLabels[r.dayun_nature]}）</span>
                        </dd>
                      </div>
                      <div>
                        <dt>{m.liunianColumn}</dt>
                        <dd>
                          {pillarHanzi(r.liunian_pillar)}
                          <span data-favor={r.liunian_favor}>（{tendencyLabels[r.liunian_nature]}）</span>
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                  <button
                    type="button"
                    className="shijing-mj-events__delete"
                    aria-label={m.delete}
                    onClick={() => handleDelete(event.id)}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
