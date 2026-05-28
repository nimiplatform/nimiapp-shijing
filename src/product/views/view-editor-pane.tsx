// 2026-05 redesign — inline view editor in the right pane.  Replaces
// the previous modal step-2 form.  Uses the same viewDraftReducer +
// validators as before; only the layout was redesigned around the
// workspace hero, so users stay oriented while creating or editing.
//
// 2026-Q2 binary-entry simplification — new-关注 creation no longer asks
// for a time range up front.  Users pick between 「关注一个人」(single-
// person follow) and 「关注一件事」(a topic).  Time-scope, instructions
// and other internal-shape fields live in 「更多选项」; the deterministic
// pipeline still uses View.time_scope (default open_ended) under the
// hood.

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

type CreateEntryMode = 'person' | 'matter';

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
  const [entryMode, setEntryMode] = useState<CreateEntryMode>('person');

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
        // A template implies the user is in matter mode (templates are
        // matter-shaped: "Q3 团队冲刺" / "春节探亲" / etc.).
        setEntryMode('matter');
      }
    }
  }, [props.mode, state.snapshot, catalog, roster]);

  // Person mode — title mirrors the picked person's display name so the
  // user never has to think about "what to call this".  We only sync
  // when the value would actually change so the reducer's identity-
  // checks short-circuit re-renders.
  useEffect(() => {
    if (isEdit) return;
    if (entryMode !== 'person') return;
    const entry = findRosterEntry(roster, draft.anchor_key);
    if (entry && draft.title !== entry.label) {
      draftDispatch({ type: 'set_title', value: entry.label });
    }
  }, [draft.anchor_key, draft.title, entryMode, isEdit, roster]);

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
    // Person mode is single-subject by definition — the picked person
    // is the entire scope.  Matter mode + edit mode keep the explicit
    // subjects roster the user managed in the form.
    const subjects = !isEdit && entryMode === 'person'
      ? [anchorEntry.ref]
      : draft.selected_subject_keys
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
            className="shijing-view-editor__entry-mode"
            role="radiogroup"
            aria-label="新关注类型"
          >
            <button
              type="button"
              role="radio"
              aria-checked={entryMode === 'person'}
              data-active={entryMode === 'person' ? 'true' : 'false'}
              onClick={() => setEntryMode('person')}
            >
              关注一个人
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={entryMode === 'matter'}
              data-active={entryMode === 'matter' ? 'true' : 'false'}
              onClick={() => setEntryMode('matter')}
            >
              关注一件事
            </button>
          </div>
        ) : null}

        {!isEdit && entryMode === 'person' ? (
          <div
            className="shijing-view-editor__person-pick"
            role="group"
            aria-label="选择关注的人物"
          >
            <span className="shijing-view-editor__pick-label">你想关注谁？</span>
            <div className="shijing-view-editor__person-chips" role="radiogroup">
              {roster.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  role="radio"
                  aria-checked={draft.anchor_key === entry.key}
                  data-active={draft.anchor_key === entry.key ? 'true' : 'false'}
                  onClick={() => draftDispatch({ type: 'set_anchor_key', value: entry.key })}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!isEdit && entryMode === 'matter' ? (
          <>
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
            <input
              id="view-editor-title"
              className="shijing-view-editor__title"
              type="text"
              value={draft.title}
              required
              placeholder="给这件事起个名字…"
              aria-label={FIELD_LABELS.view_title}
              onChange={(event) => draftDispatch({ type: 'set_title', value: event.target.value })}
            />
          </>
        ) : null}

        {isEdit ? (
          <>
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
            <div className="shijing-view-editor__meta-row" role="group" aria-label="锚定">
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
            </div>
          </>
        ) : null}
      </header>

      {(isEdit || entryMode === 'matter') ? (
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
      ) : null}

      <details className="shijing-view-editor__advanced">
        <summary>更多选项</summary>
        <div className="shijing-view-editor__advanced-panel">
          <div className="shijing-view-editor__field" role="group" aria-label={FIELD_LABELS.time_scope}>
            <span>{FIELD_LABELS.time_scope}</span>
            <div className="shijing-view-editor__chips">
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
