// Compact persons list for the "我" tab. Per the redesign, the
// standalone "人物关系" panel is folded in here: each person row shows
// the relation that ties them to `self` (if any) plus consent state as
// a secondary line. CRUD lives in the persons-manage overlay so this
// card stays read-only.

import { useMemo } from 'react';
import { Surface } from '@nimiplatform/kit/ui';

import { useShijingStore } from '../state/shijing-store.tsx';
import type { Person, ConsentState } from '../../domain/person.ts';
import type { Relation } from '../../domain/relation.ts';
import { isPersonRef, isSelfRef } from '../../domain/subject-ref.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import { MeIcon } from './me-icons.tsx';

export interface MePersonsSummaryProps {
  readonly onOpenPersonsManager: () => void;
}

interface PersonRow {
  readonly person: Person;
  readonly relation_label: string | null;
  readonly consent_label: string;
}

function relationLabelForSelf(person: Person, relations: readonly Relation[]): string | null {
  // Prefer the relation that explicitly originates from `self` and
  // points at this person. Fall back to the reverse direction if the
  // user happened to record it the other way (validator allows both).
  for (const relation of relations) {
    if (isSelfRef(relation.from_subject)
      && isPersonRef(relation.to_subject)
      && relation.to_subject.id === person.id) {
      return relation.relation_kind;
    }
    if (isSelfRef(relation.to_subject)
      && isPersonRef(relation.from_subject)
      && relation.from_subject.id === person.id) {
      return relation.relation_kind;
    }
  }
  return person.relation_hint ?? null;
}

function consentLabelFor(state: ConsentState): string {
  switch (state) {
    case 'subject_consented':
      return '已告知 · 同意记录';
    case 'owner_recorded':
      return '由你代录';
    case 'withheld':
      return '隐私状态待确认';
    default: {
      const exhaustive: never = state;
      void exhaustive;
      return enumLabel('consent_state', state);
    }
  }
}

function initialsOf(displayName: string): string {
  const trimmed = displayName.trim();
  if (trimmed.length === 0) return '?';
  // For CJK names, use the first character; for latin, first letter.
  const first = Array.from(trimmed)[0]!;
  return first.toUpperCase();
}

export function MePersonsSummary(props: MePersonsSummaryProps) {
  const { state } = useShijingStore();
  const rows: readonly PersonRow[] = useMemo(() => {
    return state.snapshot.persons.map((person) => ({
      person,
      relation_label: relationLabelForSelf(person, state.snapshot.relations),
      consent_label: consentLabelFor(person.consent_state),
    }));
  }, [state.snapshot.persons, state.snapshot.relations]);

  const showHeaderAction = rows.length > 1;

  return (
    <Surface
      as="section"
      tone="card"
      material="solid"
      padding="none"
      elevation="base"
      className="shijing-me-card shijing-me-card--persons"
      aria-label="关心的人"
    >
      <header className="shijing-me-card__head">
        <span className="shijing-me-card__icon" aria-hidden="true">
          <MeIcon name="users" size={20} />
        </span>
        <h3 className="shijing-me-card__title">关心的人</h3>
        {showHeaderAction ? (
          <button
            type="button"
            className="shijing-me-card__head-action"
            onClick={props.onOpenPersonsManager}
          >
            <span>管理</span>
            <MeIcon name="chevron-right" size={14} />
          </button>
        ) : null}
      </header>

      {rows.length === 0 ? (
        <>
          <p className="shijing-me-card__empty">
            还没有添加其他人物。点击下方「管理」开始添加你想观察的人。
          </p>
          <div className="shijing-me-card__footer">
            <button
              type="button"
              className="shijing-me-card__edit"
              onClick={props.onOpenPersonsManager}
            >
              <span>管理</span>
              <MeIcon name="chevron-right" size={14} />
            </button>
          </div>
        </>
      ) : (
        <ul className="shijing-me-persons">
          {rows.map(({ person, relation_label, consent_label }) => (
            <li key={person.id} className="shijing-me-persons__item">
              <span className="shijing-me-persons__avatar" aria-hidden="true">
                {initialsOf(person.display_name)}
              </span>
              <div className="shijing-me-persons__main">
                <span className="shijing-me-persons__name">{person.display_name}</span>
                <span className="shijing-me-persons__meta">
                  {relation_label ? `${relation_label} · ` : ''}
                  {consent_label}
                </span>
              </div>
              {!showHeaderAction ? (
                <button
                  type="button"
                  className="shijing-me-persons__action"
                  onClick={props.onOpenPersonsManager}
                >
                  <span>管理</span>
                  <MeIcon name="chevron-right" size={14} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}
