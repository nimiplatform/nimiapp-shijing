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
import {
  BUTTONS,
  FAILURE_HEADLINES,
  FIELD_LABELS,
  HEADINGS,
  MEMORY_LOCKED_LABELS,
  SELECT_REQUIRED_PLACEHOLDER,
  SELECT_TEMPLATE_PLACEHOLDER,
} from '../i18n/copy.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import { formatSaveRefusal } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';

export interface ViewFormProps {
  readonly mode: 'create' | { kind: 'edit'; view: View };
  readonly onClose: () => void;
}

const MEMORY_LOCKED_OPTIONS = ['locked', 'unlocked'] as const;

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
  const rosterLabelOf = useMemo(() => {
    const map = new Map(roster.map((entry) => [entry.key, entry.label]));
    return (key: string) => map.get(key) ?? key;
  }, [roster]);

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
        <legend>{typeof props.mode === 'object' ? HEADINGS.edit_view : HEADINGS.add_view}</legend>
        <SelectField
          id="view-template"
          label="从模板创建"
          value={selectedTemplateId}
          options={catalog.view_templates.map((template) => template.id)}
          optionLabel={(id) => catalog.view_templates.find((t) => t.id === id)?.title ?? id}
          emptyLabel={SELECT_TEMPLATE_PLACEHOLDER}
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
          label={FIELD_LABELS.view_title}
          value={draft.title}
          required
          onChange={(value) => draftDispatch({ type: 'set_title', value })}
        />
        <SelectField
          id="view-anchor"
          label={FIELD_LABELS.anchor_subject}
          value={draft.anchor_key}
          options={roster.map((entry) => entry.key)}
          optionLabel={rosterLabelOf}
          required
          emptyLabel={SELECT_REQUIRED_PLACEHOLDER}
          onChange={(value) => draftDispatch({ type: 'set_anchor_key', value })}
        />
        <fieldset>
          <legend>{FIELD_LABELS.subjects}（锚定人物自动包含）</legend>
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
          label={FIELD_LABELS.time_scope}
          value={draft.time_scope}
          options={TIME_SCOPES}
          optionLabel={(v) => enumLabel('time_scope', v)}
          required
          onChange={(value) => draftDispatch({ type: 'set_time_scope', value })}
        />
        {draft.time_scope === 'bounded' ? (
          <>
            <TextField
              id="view-bounded-start-utc"
              label={FIELD_LABELS.bounded_start}
              value={draft.bounded_start_utc}
              required
              onChange={(value) => draftDispatch({ type: 'set_bounded_start_utc', value })}
            />
            <TextField
              id="view-bounded-end-utc"
              label={FIELD_LABELS.bounded_end}
              value={draft.bounded_end_utc}
              required
              onChange={(value) => draftDispatch({ type: 'set_bounded_end_utc', value })}
            />
          </>
        ) : null}
        {draft.time_scope === 'rolling' ? (
          <TextField
            id="view-rolling-window-days"
            label={FIELD_LABELS.rolling_window_days}
            value={draft.rolling_window_days_text}
            required
            onChange={(value) => draftDispatch({ type: 'set_rolling_window_days_text', value })}
          />
        ) : null}
        <TextField
          id="view-instructions"
          label={FIELD_LABELS.instructions}
          value={draft.instructions}
          onChange={(value) => draftDispatch({ type: 'set_instructions', value })}
        />
        <TextField
          id="view-memory-summary"
          label={FIELD_LABELS.view_memory_summary}
          value={draft.memory_summary}
          onChange={(value) => draftDispatch({ type: 'set_memory_summary', value })}
        />
        <SelectField
          id="view-memory-locked"
          label={FIELD_LABELS.view_memory_locked}
          value={draft.memory_locked === null ? '' : draft.memory_locked ? 'locked' : 'unlocked'}
          options={MEMORY_LOCKED_OPTIONS}
          optionLabel={(v) => MEMORY_LOCKED_LABELS[v as 'locked' | 'unlocked']}
          required
          emptyLabel={SELECT_REQUIRED_PLACEHOLDER}
          onChange={(value) => draftDispatch({ type: 'set_memory_locked', value: value === 'locked' })}
        />
        <SelectField
          id="view-display-state"
          label={FIELD_LABELS.display_state}
          value={draft.display_state}
          options={DISPLAY_STATES}
          optionLabel={(v) => enumLabel('display_state', v)}
          required
          onChange={(value) => draftDispatch({ type: 'set_display_state', value })}
        />
      </fieldset>
      <div className="shijing-form-actions">
        <button type="button" data-variant="ghost" onClick={props.onClose}>{BUTTONS.cancel}</button>
        <button type="submit">{BUTTONS.save}</button>
      </div>
      {submission.kind === 'invalid_draft' || submission.kind === 'invalid_view' ? (
        <>
          <p role="alert">{FAILURE_HEADLINES.view_invalid}</p>
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
