// W06 — Reading citation drawer (shared across mirror tabs).

import type { Reading } from '../../../domain/reading.ts';
import { ZiweiAstrolabe } from './ziwei-astrolabe.tsx';
import { deriveMethodEvidenceChips } from './method-evidence-chips.ts';
import { useProductCopy } from '../../i18n/copy.ts';

export interface CitationDrawerProps {
  readonly reading: Reading;
}

export function CitationDrawer(props: CitationDrawerProps) {
  const copy = useProductCopy();
  const { reading } = props;
  const evidenceChips = deriveMethodEvidenceChips(reading);
  return (
    <details className="shijing-citation-drawer" aria-label={copy.citationDrawer.ariaLabel}>
      <summary>{copy.citationDrawer.summary}</summary>
      {evidenceChips.length > 0 ? (
        <ul className="shijing-citation-drawer__chips">
          {evidenceChips.map((chip, i) => (
            <li key={`${i}-${chip.group}`} className="shijing-citation-drawer__chip">
              <span className="shijing-citation-drawer__chip-label">{chip.group}</span>
              <span className="shijing-citation-drawer__chip-value">{chip.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <dl>
        <div>
          <dt>{copy.citationDrawer.method}</dt>
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
      {reading.inputs_summary.feature_snapshot.method_evidence.method_id === 'ziwei_sanhe_v1' ? (
        <div style={{ margin: '12px 0' }}>
          <ZiweiAstrolabe chart={reading.inputs_summary.feature_snapshot.method_evidence.ziwei.self_subject} />
        </div>
      ) : null}
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
        <p>{copy.citationDrawer.citedMemories}: {reading.cited_event_memory_refs.join(', ')}</p>
      ) : null}
      {reading.cited_plan_item_refs.length > 0 ? (
        <p>{copy.citationDrawer.citedPlans}: {reading.cited_plan_item_refs.join(', ')}</p>
      ) : null}
    </details>
  );
}
