// Wave-9 — add/edit View form. Binds anchor/subjects to the actual
// subject roster (no manual id typing). validateView +
// validateShiJingSpace gate every dispatch.

import { useEffect, useMemo, useReducer, useState, type FormEvent } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { SelectField, TextField } from '../inputs/natal-inputs-fields.tsx';
import { validateView } from '../../contracts/view-validator.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import { DISPLAY_STATES, TIME_SCOPES, type View } from '../../domain/view.ts';
import {
  buildViewFromDraft,
  createEmptyViewDraft,
  validateViewDraft,
  viewDraftReducer,
} from './view-form-state.ts';
import { buildSubjectRoster, findRosterEntry, type SubjectRosterEntry } from './subject-roster.ts';
import { newViewId } from './view-id.ts';
import { useShijingCatalog } from '../catalog/catalog-context.tsx';

export interface ViewFormProps {
  readonly mode: 'create' | { kind: 'edit'; view: View };
  readonly onClose: () => void;
}

export function ViewForm(props: ViewFormProps) {
  const { state, dispatch } = useShijingStore();
  const catalog = useShijingCatalog();
  const [draft, draftDispatch] = useReducer(viewDraftReducer, createEmptyViewDraft());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'invalid_draft'; code: string }
    | { kind: 'invalid_view'; code: string }
    | { kind: 'invalid_space'; code: string }
    | { kind: 'saved'; at: string }
  >({ kind: 'idle' });

  const roster = useMemo<readonly SubjectRosterEntry[]>(
    () => buildSubjectRoster(state.snapshot),
    [state.snapshot],
  );

  useEffect(() => {
    draftDispatch({ type: 'reset' });
    if (typeof props.mode === 'object') {
      draftDispatch({ type: 'hydrate', view: props.mode.view });
    } else {
      draftDispatch({ type: 'assign_id', id: newViewId() });
    }
  }, [props.mode]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draftCheck = validateViewDraft(draft);
    if (!draftCheck.ok) {
      setSubmission({ kind: 'invalid_draft', code: draftCheck.error.code });
      return;
    }
    const anchorEntry = findRosterEntry(roster, draft.anchor_key);
    if (!anchorEntry) {
      setSubmission({ kind: 'invalid_draft', code: 'view_anchor_missing' });
      return;
    }
    const subjects = draft.selected_subject_keys
      .map((key) => findRosterEntry(roster, key))
      .filter((entry): entry is SubjectRosterEntry => Boolean(entry))
      .map((entry) => entry.ref);
    const view = buildViewFromDraft(draft, { anchor: anchorEntry.ref, subjects });
    const viewCheck = validateView(view);
    if (!viewCheck.ok) {
      setSubmission({ kind: 'invalid_view', code: viewCheck.error.code });
      return;
    }
    const views = (() => {
      if (typeof props.mode === 'object') {
        return state.snapshot.views.map((existing) => (existing.id === view.id ? view : existing));
      }
      return [...state.snapshot.views, view];
    })();
    const nextSnapshot = { ...state.snapshot, views };
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
    <form className="shijing-view-form" onSubmit={onSubmit} noValidate>
      <fieldset>
        <legend>{typeof props.mode === 'object' ? 'Edit View' : 'Add View'}</legend>
        <SelectField
          id="view-template"
          label="从模板创建"
          value={selectedTemplateId}
          options={catalog.view_templates.map((template) => template.id)}
          emptyLabel="— (无模板)"
          onChange={(value) => {
            setSelectedTemplateId(value);
            if (value.length === 0) return;
            const template = catalog.view_templates.find((entry) => entry.id === value);
            if (!template) return;
            draftDispatch({
              type: 'apply_template',
              template: {
                title: template.title,
                default_time_scope: template.default_time_scope,
                default_instructions: template.default_instructions,
              },
            });
          }}
        />
        <TextField
          id="view-title"
          label="title"
          value={draft.title}
          required
          onChange={(value) => draftDispatch({ type: 'set_title', value })}
        />
        <SelectField
          id="view-anchor"
          label="anchor_subject"
          value={draft.anchor_key}
          options={roster.map((entry) => entry.key)}
          required
          emptyLabel="— (required, no implicit default)"
          onChange={(value) => draftDispatch({ type: 'set_anchor_key', value })}
        />
        <fieldset>
          <legend>subjects[] (anchor auto-included)</legend>
          {roster.map((entry) => (
            <label key={entry.key} className="shijing-input-field">
              <input
                type="checkbox"
                checked={draft.selected_subject_keys.includes(entry.key)}
                disabled={entry.key === draft.anchor_key}
                onChange={() => draftDispatch({ type: 'toggle_subject_key', value: entry.key })}
              />
              <span>{entry.label}</span>
            </label>
          ))}
        </fieldset>
        <SelectField
          id="view-time-scope"
          label="time_scope"
          value={draft.time_scope}
          options={TIME_SCOPES}
          required
          onChange={(value) => draftDispatch({ type: 'set_time_scope', value })}
        />
        {draft.time_scope === 'bounded' ? (
          <>
            <TextField
              id="view-bounded-start-utc"
              label="bounded_range.start (ISO-8601 UTC)"
              value={draft.bounded_start_utc}
              required
              onChange={(value) => draftDispatch({ type: 'set_bounded_start_utc', value })}
            />
            <TextField
              id="view-bounded-end-utc"
              label="bounded_range.end (ISO-8601 UTC)"
              value={draft.bounded_end_utc}
              required
              onChange={(value) => draftDispatch({ type: 'set_bounded_end_utc', value })}
            />
          </>
        ) : null}
        {draft.time_scope === 'rolling' ? (
          <TextField
            id="view-rolling-window-days"
            label="rolling_window_days (positive integer)"
            value={draft.rolling_window_days_text}
            required
            onChange={(value) => draftDispatch({ type: 'set_rolling_window_days_text', value })}
          />
        ) : null}
        <TextField
          id="view-instructions"
          label="instructions"
          value={draft.instructions}
          onChange={(value) => draftDispatch({ type: 'set_instructions', value })}
        />
        <TextField
          id="view-memory-summary"
          label="view_memory.summary"
          value={draft.memory_summary}
          onChange={(value) => draftDispatch({ type: 'set_memory_summary', value })}
        />
        <SelectField
          id="view-memory-locked"
          label="view_memory.locked"
          value={draft.memory_locked === null ? '' : draft.memory_locked ? 'locked' : 'unlocked'}
          options={['locked', 'unlocked']}
          required
          emptyLabel="— (required, no implicit default)"
          onChange={(value) => draftDispatch({ type: 'set_memory_locked', value: value === 'locked' })}
        />
        <SelectField
          id="view-display-state"
          label="display_state"
          value={draft.display_state}
          options={DISPLAY_STATES}
          required
          onChange={(value) => draftDispatch({ type: 'set_display_state', value })}
        />
      </fieldset>
      <div className="shijing-form-actions">
        <button type="button" data-variant="ghost" onClick={props.onClose}>Cancel</button>
        <button type="submit">Save</button>
      </div>
      {submission.kind === 'invalid_draft' ? (
        <p role="alert">View draft invalid: {submission.code}</p>
      ) : null}
      {submission.kind === 'invalid_view' ? (
        <p role="alert">validateView refused: {submission.code}</p>
      ) : null}
      {submission.kind === 'invalid_space' ? (
        <p role="alert">validateShiJingSpace refused: {submission.code}</p>
      ) : null}
      {submission.kind === 'saved' ? (
        <p role="status">Saved at {submission.at}.</p>
      ) : null}
    </form>
  );
}
