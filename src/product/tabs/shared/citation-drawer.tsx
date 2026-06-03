// W06 — Reading citation drawer (shared across mirror tabs).

import type { Reading } from '../../../domain/reading.ts';

export interface CitationDrawerProps {
  readonly reading: Reading;
}

export function CitationDrawer(props: CitationDrawerProps) {
  const { reading } = props;
  return (
    <details className="shijing-citation-drawer" aria-label="生成依据">
      <summary>生成依据 / 引用</summary>
      <dl>
        <div>
          <dt>方法</dt>
          <dd>{reading.inputs_summary.method_profile.id}</dd>
        </div>
        <div>
          <dt>input_hash</dt>
          <dd>
            <code>{reading.inputs_summary.input_hash.slice(0, 16)}…</code>
          </dd>
        </div>
        <div>
          <dt>feature_snapshot_hash</dt>
          <dd>
            <code>{reading.inputs_summary.feature_snapshot_hash.slice(0, 16)}…</code>
          </dd>
        </div>
        <div>
          <dt>canonical_window</dt>
          <dd>
            {reading.inputs_summary.feature_snapshot.canonical_window.start_utc} →{' '}
            {reading.inputs_summary.feature_snapshot.canonical_window.end_utc}
          </dd>
        </div>
      </dl>
      {reading.output.citations.length > 0 ? (
        <ul>
          {reading.output.citations.map((c, i) => (
            <li key={i}>
              <strong>{c.method}</strong> · {c.reference}
            </li>
          ))}
        </ul>
      ) : null}
      {reading.cited_event_memory_refs.length > 0 ? (
        <p>引用记忆: {reading.cited_event_memory_refs.join(', ')}</p>
      ) : null}
      {reading.cited_plan_item_refs.length > 0 ? (
        <p>引用计划: {reading.cited_plan_item_refs.join(', ')}</p>
      ) : null}
    </details>
  );
}
