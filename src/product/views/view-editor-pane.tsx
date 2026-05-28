// 2026-05 redesign — inline view editor in the right pane.  Replaces
// the previous modal step-2 form.  Uses the same viewDraftReducer +
// validators as before; only the layout was redesigned around the
// workspace hero, so users stay oriented while creating or editing.

import { useEffect, useMemo, useReducer, useState, type FormEvent } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { validateView } from '../../contracts/view-validator.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import { DISPLAY_STATES, TIME_SCOPES, type View } from '../../domain/view.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { isPersonRef } from '../../domain/subject-ref.ts';
import {
  buildViewFromDraft,
  createEmptyViewDraft,
  validateViewDraft,
  viewDraftReducer,
} from './view-form-state.ts';
import { buildSubjectRoster, findRosterEntry, type SubjectRosterEntry } from './subject-roster.ts';
import { newViewId } from './view-id.ts';
import { useShijingCatalog } from '../catalog/catalog-context.tsx';
import { BUTTONS, FAILURE_HEADLINES, FIELD_LABELS } from '../i18n/copy.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import { formatSaveRefusal } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';
import { subjectNatalReadiness } from '../subjects/natal-readiness.ts';

export type ViewEditorMode =
  | { kind: 'create'; templateId?: string }
  | { kind: 'edit'; view: View };

export interface ViewEditorPaneProps {
  readonly mode: ViewEditorMode;
  readonly onCancel: () => void;
  readonly onSaved: (view: View) => void;
}

function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function timeZoneForSubject(subject: SubjectRef, space: ShiJingSpace): string {
  const readiness = subjectNatalReadiness(subject, space);
  if (readiness.ok) return readiness.inputs.birth_location.iana_time_zone;
  if (subject === 'self') {
    return space.self_subject.natal_inputs.birth_location.iana_time_zone || browserTimeZone();
  }
  if (isPersonRef(subject)) {
    return space.persons.find((person) => person.id === subject.id)?.natal_inputs.birth_location.iana_time_zone
      || browserTimeZone();
  }
  return browserTimeZone();
}

export function ViewEditorPane(props: ViewEditorPaneProps) {
  const { state, dispatch } = useShijingStore();
  const catalog = useShijingCatalog();
  const [draft, draftDispatch] = useReducer(viewDraftReducer, createEmptyViewDraft());
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'invalid_draft'; code: string }
    | { kind: 'invalid_view'; code: string }
    | { kind: 'invalid_space'; code: string }
  >({ kind: 'idle' });

  const roster = useMemo<readonly SubjectRosterEntry[]>(
    () => buildSubjectRoster(state.snapshot),
    [state.snapshot],
  );

  const isEdit = props.mode.kind === 'edit';

  useEffect(() => {
    draftDispatch({ type: 'reset' });
    if (props.mode.kind === 'edit') {
      draftDispatch({
        type: 'hydrate',
        view: props.mode.view,
        basis_time_zone: timeZoneForSubject(props.mode.view.anchor_subject, state.snapshot),
      });
      return;
    }
    draftDispatch({ type: 'assign_id', id: newViewId() });
    const defaultAnchor = roster[0];
    if (defaultAnchor) draftDispatch({ type: 'set_anchor_key', value: defaultAnchor.key });
    draftDispatch({ type: 'set_memory_locked', value: false });
    const templateId = props.mode.kind === 'create' ? props.mode.templateId : undefined;
    if (templateId) {
      const template = catalog.view_templates.find((entry) => entry.id === templateId);
      if (template) {
        draftDispatch({
          type: 'apply_template',
          template: {
            title: template.title,
            default_time_scope: template.default_time_scope,
            default_instructions: template.default_instructions,
          },
        });
      }
    }
  }, [props.mode, state.snapshot, catalog, roster]);

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
    const view = buildViewFromDraft(draft, {
      anchor: anchorEntry.ref,
      subjects,
      basis_time_zone: timeZoneForSubject(anchorEntry.ref, state.snapshot),
      ...(props.mode.kind === 'edit' ? { context_items: props.mode.view.context_items } : {}),
    });
    const viewCheck = validateView(view);
    if (!viewCheck.ok) {
      setSubmission({ kind: 'invalid_view', code: viewCheck.error.code });
      return;
    }
    const views = props.mode.kind === 'edit'
      ? state.snapshot.views.map((existing) => (existing.id === view.id ? view : existing))
      : [...state.snapshot.views, view];
    const nextSnapshot = { ...state.snapshot, views };
    const spaceCheck = validateShiJingSpace(nextSnapshot);
    if (!spaceCheck.ok) {
      setSubmission({ kind: 'invalid_space', code: spaceCheck.error.code });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    props.onSaved(view);
  }

  const anchorEntry = findRosterEntry(roster, draft.anchor_key);
  const eyebrow = isEdit ? '编辑关注' : '新关注';
  const initialTemplateId = props.mode.kind === 'create' ? props.mode.templateId : undefined;
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | undefined>(initialTemplateId);

  useEffect(() => {
    setAppliedTemplateId(initialTemplateId);
  }, [initialTemplateId, props.mode]);

  function applyTemplate(templateId: string) {
    const template = catalog.view_templates.find((entry) => entry.id === templateId);
    if (!template) return;
    draftDispatch({
      type: 'apply_template',
      template: {
        title: template.title,
        default_time_scope: template.default_time_scope,
        default_instructions: template.default_instructions,
      },
    });
    setAppliedTemplateId(templateId);
  }

  return (
    <form className="shijing-view-editor" onSubmit={onSubmit} noValidate>
      <header className="shijing-view-editor__head">
        <p className="shijing-tab__eyebrow">{eyebrow}</p>
        {!isEdit ? (
          <div
            className="shijing-view-editor__template-row"
            role="group"
            aria-label="用模板预填"
          >
            <span>用模板预填</span>
            <div className="shijing-view-editor__template-chips">
              {catalog.view_templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  data-active={appliedTemplateId === template.id ? 'true' : 'false'}
                  onClick={() => applyTemplate(template.id)}
                >
                  {template.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <input
          id="view-editor-title"
          className="shijing-view-editor__title"
          type="text"
          value={draft.title}
          required
          placeholder="给这个关注起个名字…"
          aria-label={FIELD_LABELS.view_title}
          onChange={(event) => draftDispatch({ type: 'set_title', value: event.target.value })}
        />
        <div className="shijing-view-editor__meta-row" role="group" aria-label="锚点与时间">
          <label className="shijing-view-editor__field shijing-view-editor__field--inline">
            <span>{FIELD_LABELS.anchor_subject}</span>
            <select
              value={draft.anchor_key}
              required
              onChange={(event) => draftDispatch({ type: 'set_anchor_key', value: event.target.value })}
            >
              <option value="" disabled>请选择</option>
              {roster.map((entry) => (
                <option key={entry.key} value={entry.key}>{entry.label}</option>
              ))}
            </select>
          </label>
          <div className="shijing-view-editor__field shijing-view-editor__field--inline">
            <span>{FIELD_LABELS.time_scope}</span>
            <div className="shijing-view-editor__chips" role="group" aria-label={FIELD_LABELS.time_scope}>
              {TIME_SCOPES.map((scope) => (
                <button
                  key={scope}
                  type="button"
                  aria-pressed={draft.time_scope === scope}
                  onClick={() => draftDispatch({ type: 'set_time_scope', value: scope })}
                >
                  {enumLabel('time_scope', scope)}
                </button>
              ))}
            </div>
          </div>
        </div>
        {draft.time_scope === 'bounded' ? (
          <div className="shijing-view-editor__bounded">
            <label className="shijing-view-editor__field">
              <span>{FIELD_LABELS.bounded_start}</span>
              <input
                type="date"
                value={draft.bounded_start_date}
                required
                onChange={(event) => draftDispatch({ type: 'set_bounded_start_date', value: event.target.value })}
              />
            </label>
            <label className="shijing-view-editor__field">
              <span>{FIELD_LABELS.bounded_end}</span>
              <input
                type="date"
                value={draft.bounded_end_date}
                required
                onChange={(event) => draftDispatch({ type: 'set_bounded_end_date', value: event.target.value })}
              />
            </label>
          </div>
        ) : null}
        {draft.time_scope === 'rolling' ? (
          <label className="shijing-view-editor__field shijing-view-editor__field--narrow">
            <span>{FIELD_LABELS.rolling_window_days}</span>
            <input
              type="text"
              inputMode="numeric"
              value={draft.rolling_window_days_text}
              required
              onChange={(event) => draftDispatch({ type: 'set_rolling_window_days_text', value: event.target.value })}
            />
          </label>
        ) : null}
      </header>

      <section className="shijing-view-editor__card">
        <div className="shijing-view-editor__field" role="group" aria-labelledby="view-editor-subjects-label">
          <span id="view-editor-subjects-label">{FIELD_LABELS.subjects}（锚定人物自动包含）</span>
          <div className="shijing-view-editor__subjects">
            {roster.map((entry) => {
              const isAnchor = entry.key === draft.anchor_key;
              const checked = draft.selected_subject_keys.includes(entry.key) || isAnchor;
              return (
                <label key={entry.key} data-checked={checked ? 'true' : 'false'} data-anchor={isAnchor ? 'true' : 'false'}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isAnchor}
                    onChange={() => draftDispatch({ type: 'toggle_subject_key', value: entry.key })}
                  />
                  <span>{entry.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </section>

      <details className="shijing-view-editor__advanced">
        <summary>更多选项</summary>
        <div className="shijing-view-editor__advanced-panel">
          <label className="shijing-view-editor__field" htmlFor="view-editor-instructions">
            <span>{FIELD_LABELS.instructions}</span>
            <textarea
              id="view-editor-instructions"
              value={draft.instructions}
              rows={3}
              placeholder="几句话告诉时镜要关注什么、不要做什么…"
              onChange={(event) => draftDispatch({ type: 'set_instructions', value: event.target.value })}
            />
          </label>
          <label className="shijing-view-editor__field" htmlFor="view-editor-memory">
            <span>{FIELD_LABELS.view_memory_summary}</span>
            <textarea
              id="view-editor-memory"
              value={draft.memory_summary}
              rows={3}
              placeholder="可以预先写下你已经知道的、希望时镜记住的背景。"
              onChange={(event) => draftDispatch({ type: 'set_memory_summary', value: event.target.value })}
            />
          </label>
          <div className="shijing-view-editor__field" role="group" aria-label={FIELD_LABELS.display_state}>
            <span>{FIELD_LABELS.display_state}</span>
            <div className="shijing-view-editor__chips">
              {DISPLAY_STATES.map((displayState) => (
                <button
                  key={displayState}
                  type="button"
                  aria-pressed={draft.display_state === displayState}
                  onClick={() => draftDispatch({ type: 'set_display_state', value: displayState })}
                >
                  {enumLabel('display_state', displayState)}
                </button>
              ))}
            </div>
          </div>
          <label className="shijing-view-editor__toggle">
            <input
              type="checkbox"
              checked={draft.memory_locked === true}
              onChange={(event) => draftDispatch({ type: 'set_memory_locked', value: event.target.checked })}
            />
            <span>
              <strong>{FIELD_LABELS.view_memory_locked}</strong>
              <small>锁定后，关注记忆不会被自动覆盖。</small>
            </span>
          </label>
        </div>
      </details>

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

      <footer className="shijing-view-editor__footer">
        <button type="button" data-variant="ghost" onClick={props.onCancel}>{BUTTONS.cancel}</button>
        <button type="submit" className="shijing-view-editor__save">
          {isEdit ? BUTTONS.save : '保存关注'}
        </button>
      </footer>
      {/* Anchor entry referenced for screen-reader announcement when changed. */}
      <output aria-live="polite" className="shijing-visually-hidden">
        {anchorEntry ? `锚点：${anchorEntry.label}` : ''}
      </output>
    </form>
  );
}
