// 命镜关系合盘 — MingJing-owned "self + one person" relationship output.

import type { Person } from '../../../domain/person.ts';
import type { MingJingRelationshipMirrorOutput } from '../../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { useProductCopy } from '../../i18n/copy.ts';
import { FailureBanner } from '../shared/failure-banner.tsx';
import { ImportToShiJingButton } from '../shared/import-to-shijing-button.tsx';
import { MingJingInfo } from './mingjing-info.tsx';

const STRUCTURE_ORDER = [
  'baseline_pattern',
  'attraction_and_support',
  'friction_and_misread',
  'communication_rhythm',
  'boundary_advice',
] as const;

const PRACTICE_ORDER = [
  'communication',
  'boundary',
  'repair',
] as const;

export function MingJingRelationshipReadingView({
  persons,
  selectedPersonId,
  readingId,
  output,
  stale,
  loading,
  failure,
  onSelectPerson,
  onGenerate,
  onOpenPeople,
}: {
  readonly persons: readonly Person[];
  readonly selectedPersonId: string;
  readonly readingId: string | null;
  readonly output: MingJingRelationshipMirrorOutput | null;
  readonly stale: boolean;
  readonly loading: boolean;
  readonly failure: ReadingGenerationFailure | null;
  readonly onSelectPerson: (personId: string) => void;
  readonly onGenerate: () => void;
  readonly onOpenPeople: () => void;
}) {
  const copy = useProductCopy();
  const r = copy.mingjing.relationshipReading;
  const hasPeople = persons.length > 0;
  const selectedPerson = persons.find((person) => person.id === selectedPersonId) ?? null;

  return (
    <section
      className="shijing-mingjing-panel shijing-mj-relationship"
      aria-label={r.title}
    >
      <header className="shijing-mingjing-panel__head shijing-mj-relationship__head">
        <div>
          <p className="shijing-mingjing__eyebrow">{r.eyebrow}</p>
          <div className="shijing-mingjing-panel__title-row">
            <h2 className="shijing-mingjing-panel__title">{r.title}</h2>
            <MingJingInfo label={`${r.title}说明`}>
              <p>{r.explanation}</p>
            </MingJingInfo>
          </div>
        </div>
      </header>

      <div className="shijing-mj-relationship__controls">
        <label className="shijing-mj-relationship__picker" htmlFor="mingjing-relationship-person">
          <span>{r.personLabel}</span>
          <select
            id="mingjing-relationship-person"
            value={selectedPersonId}
            disabled={!hasPeople || loading}
            onChange={(event) => onSelectPerson(event.currentTarget.value)}
          >
            {persons.map((person) => (
              <option key={person.id} value={person.id}>
                {person.relation ? `${person.display_name} · ${person.relation}` : person.display_name}
              </option>
            ))}
          </select>
        </label>
        {hasPeople ? (
          <button
            type="button"
            className="shijing-mj-reading__generate"
            onClick={onGenerate}
            disabled={loading || !selectedPerson}
          >
            {loading ? r.generating : output ? r.regenerate : r.generate}
          </button>
        ) : (
          <button
            type="button"
            className="shijing-mj-relationship__manage"
            onClick={onOpenPeople}
          >
            {r.addPerson}
          </button>
        )}
      </div>

      {failure ? <FailureBanner failure={failure} /> : null}

      {!hasPeople ? (
        <p className="shijing-mj-relationship__empty">{r.noPeople}</p>
      ) : null}

      {hasPeople && !output && !loading && !failure ? (
        <p className="shijing-mj-relationship__empty">
          {selectedPerson ? r.empty(selectedPerson.display_name) : r.emptyFallback}
        </p>
      ) : null}

      {output ? (
        <>
          {stale ? (
            <p className="shijing-mj-reading__stale" role="status">{r.stale}</p>
          ) : null}
          <p className="shijing-mj-relationship__subject">
            {r.subjectLine(selectedPerson?.display_name ?? r.personFallback)}
          </p>
          <p className="shijing-mj-reading__summary">{output.summary}</p>

          <dl className="shijing-mj-relationship__grid">
            {STRUCTURE_ORDER.map((key) => (
              <div key={key} className="shijing-mj-reading__core-item">
                <dt>{r.structureLabels[key]}</dt>
                <dd>{output.structure[key]}</dd>
              </div>
            ))}
          </dl>

          <h3 className="shijing-mj-reading__subtitle">{r.timingTitle}</h3>
          <ol className="shijing-mj-relationship__windows">
            {output.timing_windows.map((window) => (
              <li
                key={`${window.start_date}:${window.end_date}`}
                className="shijing-mj-relationship__window"
                data-nature={window.nature}
              >
                <div className="shijing-mj-relationship__window-head">
                  <span>{r.dateRange(window.start_date, window.end_date)}</span>
                  <em>{r.natureLabels[window.nature]}</em>
                </div>
                <p>{window.summary}</p>
                <details className="shijing-mj-relationship__drivers">
                  <summary>{r.driverRefs}</summary>
                  <ul>
                    {window.driver_refs.map((ref) => (
                      <li key={ref}>{ref}</li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ol>

          <h3 className="shijing-mj-reading__subtitle">{r.practiceTitle}</h3>
          <dl className="shijing-mj-relationship__grid">
            {PRACTICE_ORDER.map((key) => (
              <div key={key} className="shijing-mj-reading__core-item">
                <dt>{r.practiceLabels[key]}</dt>
                <dd>{output.practice[key]}</dd>
              </div>
            ))}
          </dl>

          {output.citations.length > 0 ? (
            <p className="shijing-mj-relationship__citation">
              {r.citation(output.citations.map((citation) => citation.reference).join(' · '))}
            </p>
          ) : null}
          {readingId ? (
            <div className="shijing-mj-relationship__actions">
              <ImportToShiJingButton readingId={readingId} />
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
