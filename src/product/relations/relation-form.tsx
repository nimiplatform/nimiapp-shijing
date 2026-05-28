// SJG-DATA-04 — add/edit Relation form. Binds from_subject /
// to_subject to the actual subject roster (no manual id typing);
// relation_kind is a closed UI vocabulary. validateRelationDraft +
// validateShiJingSpace gate every dispatch.

import { useEffect, useMemo, useReducer, useState, type FormEvent } from 'react';
import { Button } from '@nimiplatform/kit/ui';

import { useShijingStore } from '../state/shijing-store.tsx';
import { SelectField, TextField } from '../inputs/natal-inputs-fields.tsx';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { Relation } from '../../domain/relation.ts';
import {
  RELATION_KIND_OPTIONS,
  buildRelationFromDraft,
  createEmptyRelationDraft,
  relationDraftReducer,
  validateRelationDraft,
  type RelationKindOption,
} from './relation-form-state.ts';
import { buildSubjectRoster, findRosterEntry, type SubjectRosterEntry } from '../views/subject-roster.ts';
import { newRelationId } from './relation-id.ts';
import { BUTTONS, FAILURE_HEADLINES, FIELD_LABELS, HEADINGS, SELECT_REQUIRED_PLACEHOLDER } from '../i18n/copy.ts';
import { formatSaveRefusal } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';

export interface RelationFormProps {
  readonly mode: 'create' | { kind: 'edit'; relation: Relation };
  readonly onClose: () => void;
}

export function RelationForm(props: RelationFormProps) {
  const { state, dispatch } = useShijingStore();
  const [draft, draftDispatch] = useReducer(relationDraftReducer, createEmptyRelationDraft());
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'invalid_draft'; code: string }
    | { kind: 'invalid_space'; code: string }
    | { kind: 'saved'; at: string }
  >({ kind: 'idle' });

  const roster = useMemo<readonly SubjectRosterEntry[]>(
    () => buildSubjectRoster(state.snapshot),
    [state.snapshot],
  );
  const rosterLabelOf = useMemo(() => {
    const map = new Map(roster.map((entry) => [entry.key, entry.label]));
    return (key: string) => map.get(key) ?? key;
  }, [roster]);

  useEffect(() => {
    draftDispatch({ type: 'reset' });
    if (typeof props.mode === 'object') {
      draftDispatch({ type: 'hydrate', relation: props.mode.relation });
    } else {
      draftDispatch({ type: 'assign_id', id: newRelationId() });
    }
  }, [props.mode]);

  function onSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const draftCheck = validateRelationDraft(draft);
    if (!draftCheck.ok) {
      setSubmission({ kind: 'invalid_draft', code: draftCheck.error.code });
      return;
    }
    const fromEntry = findRosterEntry(roster, draft.from_subject_key);
    const toEntry = findRosterEntry(roster, draft.to_subject_key);
    if (!fromEntry) {
      setSubmission({ kind: 'invalid_draft', code: 'relation_from_subject_missing' });
      return;
    }
    if (!toEntry) {
      setSubmission({ kind: 'invalid_draft', code: 'relation_to_subject_missing' });
      return;
    }
    const relation = buildRelationFromDraft(draft, {
      from_subject: fromEntry.ref,
      to_subject: toEntry.ref,
    });
    const relations = (() => {
      if (typeof props.mode === 'object') {
        return state.snapshot.relations.map((existing) =>
          existing.id === relation.id ? relation : existing,
        );
      }
      return [...state.snapshot.relations, relation];
    })();
    const nextSnapshot = { ...state.snapshot, relations };
    const spaceCheck = validateShiJingSpace(nextSnapshot);
    if (!spaceCheck.ok) {
      setSubmission({ kind: 'invalid_space', code: spaceCheck.error.code });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    setSubmission({ kind: 'saved', at: new Date().toISOString() });
    props.onClose();
  }

  return (
    <form className="shijing-relation-form" onSubmit={onSubmit} noValidate>
      <fieldset>
        <legend>{typeof props.mode === 'object' ? HEADINGS.edit_relation : HEADINGS.add_relation}</legend>
        <SelectField
          id="relation-from-subject"
          label={FIELD_LABELS.from_subject}
          value={draft.from_subject_key}
          options={roster.map((entry) => entry.key)}
          optionLabel={rosterLabelOf}
          required
          emptyLabel={SELECT_REQUIRED_PLACEHOLDER}
          onChange={(value) => draftDispatch({ type: 'set_from_subject_key', value })}
        />
        <SelectField
          id="relation-to-subject"
          label={FIELD_LABELS.to_subject}
          value={draft.to_subject_key}
          options={roster.map((entry) => entry.key)}
          optionLabel={rosterLabelOf}
          required
          emptyLabel={SELECT_REQUIRED_PLACEHOLDER}
          onChange={(value) => draftDispatch({ type: 'set_to_subject_key', value })}
        />
        <SelectField
          id="relation-kind"
          label={FIELD_LABELS.relation_kind}
          value={draft.relation_kind}
          options={RELATION_KIND_OPTIONS}
          required
          emptyLabel={SELECT_REQUIRED_PLACEHOLDER}
          onChange={(value) =>
            draftDispatch({ type: 'set_relation_kind', value: value as RelationKindOption | '' })
          }
        />
        <TextField
          id="relation-notes"
          label={FIELD_LABELS.notes}
          value={draft.notes}
          onChange={(value) => draftDispatch({ type: 'set_notes', value })}
        />
      </fieldset>
      <div className="shijing-form-actions">
        <Button type="button" tone="ghost" onClick={props.onClose}>{BUTTONS.cancel}</Button>
        <Button type="submit" tone="primary">{BUTTONS.save}</Button>
      </div>
      {submission.kind === 'invalid_draft' ? (
        <>
          <p role="alert">{FAILURE_HEADLINES.relation_invalid}</p>
          <TechnicalDetails content={submission.code} />
        </>
      ) : null}
      {submission.kind === 'invalid_space' ? (() => {
        const formatted = formatSaveRefusal(submission.code);
        return (
          <>
            <p role="alert">{formatted.headline}</p>
            <TechnicalDetails content={formatted.technical} />
          </>
        );
      })() : null}
      {submission.kind === 'saved' ? (
        <p role="status">已保存。</p>
      ) : null}
    </form>
  );
}
