// SJG-DATA-07 / SJG-ASTRO-* — chronological list of all persisted Readings.
// Renders every kind × scope cell (today / period_outlook / key_window /
// sign / consultation) so the user can review history across the matrix,
// not just the latest one of each kind.

import { useMemo, useState } from 'react';
import { READING_KINDS, READING_SCOPES, type ReadingKind, type ReadingScope } from '../../domain/reading-matrix.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { subjectRefKey } from '../../domain/subject-ref.ts';
import type { Reading } from '../../domain/reading.ts';

type KindFilter = 'all' | ReadingKind;
type ScopeFilter = 'all' | ReadingScope;

function readingHorizonLabel(reading: Reading): string {
  if (reading.time_window.mode === 'bounded') {
    const start = reading.time_window.start_utc?.slice(0, 10) ?? '?';
    const end = reading.time_window.end_utc?.slice(0, 10) ?? '?';
    return `${start} → ${end}`;
  }
  return '本命窗口 · 出生时刻';
}

export function ReadingHistory() {
  const { state } = useShijingStore();
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');

  const filtered = useMemo(() => {
    const list = [...state.snapshot.readings].reverse();
    return list.filter((reading) => {
      if (kindFilter !== 'all' && reading.kind !== kindFilter) return false;
      if (scopeFilter !== 'all' && reading.scope !== scopeFilter) return false;
      return true;
    });
  }, [state.snapshot.readings, kindFilter, scopeFilter]);

  return (
    <section className="shijing-reading-history" aria-label="Reading history">
      <header className="shijing-card__head">
        <h3>Reading 历史</h3>
        <small>SJG-DATA-07 · 共 {state.snapshot.readings.length} 条</small>
      </header>

      <div className="shijing-reading-history__filters">
        <label>
          <span>Kind</span>
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as KindFilter)}>
            <option value="all">全部 kind</option>
            {READING_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Scope</span>
          <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}>
            <option value="all">全部 scope</option>
            {READING_SCOPES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="shijing-reading-history__empty">
          {state.snapshot.readings.length === 0
            ? '尚无 Reading 历史。'
            : '当前筛选条件下没有匹配的 Reading。'}
        </p>
      ) : (
        <ul className="shijing-reading-history__list">
          {filtered.map((reading) => (
            <li key={reading.id} className="shijing-reading-history__item">
              <div className="shijing-reading-history__item-head">
                <span className="shijing-reading-history__kind">{reading.kind}</span>
                <span className="shijing-reading-history__scope">{reading.scope}</span>
                <span className="shijing-reading-history__anchor">
                  {subjectRefKey(reading.anchor_subject)}
                </span>
                <small className="shijing-reading-history__time">
                  {new Date(reading.created_at).toLocaleString('zh-CN')}
                </small>
              </div>
              <p className="shijing-reading-history__summary">{reading.output.summary}</p>
              <small className="shijing-reading-history__horizon">{readingHorizonLabel(reading)}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
