// 本人资料 — the 档案 page's lead card.
//
// Default view is a calm summary (核心资料 / 辅助信息 / 时镜标签), never an
// open form. Accuracy reminders appear only when birth data is missing or
// uncertain (see self-summary.ts). The full natal form lives behind the
// 「编辑」button in a centered drawer, mirroring 关系人物.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@nimiplatform/kit/ui';
import { useShijingStore } from '../state/shijing-store.tsx';
import type { PersistenceError } from '../persistence/persistence-client.ts';
import { NatalFields } from '../natal/natal-fields.tsx';
import { describeNatalError } from '../natal/natal-error-copy.ts';
import {
  commitSelfDraft,
  selfDraftFromSpace,
  type SelfNatalDraft,
} from './self-editor-state.ts';
import { summarizeSelfSubject } from './self-summary.ts';
import { useProductCopy, type ProductCopy } from '../i18n/copy.ts';

export interface SelfEditorProps {
  readonly autoOpenEditor?: boolean;
  readonly mode?: 'summary' | 'inline-editor';
}

export function SelfEditor({ autoOpenEditor = false, mode = 'summary' }: SelfEditorProps) {
  const { state, replace_snapshot } = useShijingStore();
  const copy = useProductCopy();
  const summary = summarizeSelfSubject(state.snapshot, copy);
  const inlineEditor = mode === 'inline-editor';
  const [draft, setDraft] = useState<SelfNatalDraft>(() => selfDraftFromSpace(state.snapshot));
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false);
  const autoOpenedRef = useRef(false);
  const draftDirtyRef = useRef(false);

  // Close the editor drawer on Escape.
  useEffect(() => {
    if (inlineEditor) return;
    if (!editing) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (saving) return;
        setEditing(false);
        setErrorCode(null);
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [editing, inlineEditor, saving]);

  function update<K extends keyof SelfNatalDraft>(key: K, value: SelfNatalDraft[K]) {
    draftDirtyRef.current = true;
    setSavedNoticeVisible(false);
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function openEdit() {
    // Seed the draft from the latest snapshot each time the drawer opens.
    draftDirtyRef.current = false;
    setDraft(selfDraftFromSpace(state.snapshot));
    setErrorCode(null);
    setSavedNoticeVisible(false);
    setEditing(true);
  }

  useEffect(() => {
    if (!inlineEditor) return;
    if (draftDirtyRef.current) return;
    setDraft(selfDraftFromSpace(state.snapshot));
    setErrorCode(null);
    setSavedNoticeVisible(false);
  }, [inlineEditor, state.snapshot]);

  useEffect(() => {
    if (!autoOpenEditor || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    draftDirtyRef.current = false;
    setDraft(selfDraftFromSpace(state.snapshot));
    setErrorCode(null);
    setSavedNoticeVisible(false);
    setEditing(true);
  }, [autoOpenEditor, state.snapshot]);

  function closeEdit() {
    if (saving) return;
    if (inlineEditor) {
      draftDirtyRef.current = false;
      setDraft(selfDraftFromSpace(state.snapshot));
      setErrorCode(null);
      setSavedNoticeVisible(false);
      return;
    }
    setEditing(false);
    setErrorCode(null);
    setSavedNoticeVisible(false);
  }

  async function save() {
    if (saving) return;
    const outcome = commitSelfDraft(state.snapshot, draft);
    if (outcome.ok) {
      setSaving(true);
      setErrorCode(null);
      setSavedNoticeVisible(false);
      try {
        const persistence = await replace_snapshot(outcome.next_space);
        if (persistence.kind === 'saved' || persistence.kind === 'idle') {
          draftDirtyRef.current = false;
          setDraft(selfDraftFromSpace(outcome.next_space));
          setSaving(false);
          if (!inlineEditor) {
            closeEdit();
          } else {
            setSavedNoticeVisible(true);
          }
          return;
        }
        if (persistence.kind === 'error') {
          setSavedNoticeVisible(false);
          setErrorCode(describePersistenceSaveError(persistence.error, copy));
          return;
        }
        setSavedNoticeVisible(false);
        setErrorCode(copy.self.saveIncomplete(persistence.kind));
      } catch (error) {
        setSavedNoticeVisible(false);
        setErrorCode(copy.self.saveFailed(error instanceof Error ? error.message : String(error)));
      } finally {
        setSaving(false);
      }
    } else if (outcome.ok === false) {
      const err = outcome.error;
      const code =
        err.code === 'natal_inputs_invalid'
          ? err.detail.code
          : err.code === 'birth_datetime_underivable'
            ? err.reason
            : err.code;
      setSavedNoticeVisible(false);
      setErrorCode(describeNatalError(code, copy));
    }
  }

  function renderEditorFormFields(idPrefix: string) {
    return (
      <>
        <NatalFields draft={draft} onChange={update} idPrefix={idPrefix} />

        <div className="sjp-field sjp-field--full">
          <label className="sjp-label" htmlFor={`${idPrefix}-notes`}>{copy.self.notes}</label>
          <textarea
            id={`${idPrefix}-notes`}
            className="sjp-textarea"
            placeholder={copy.self.notesPlaceholder}
            value={draft.notes}
            onChange={(e) => update('notes', e.currentTarget.value)}
          />
        </div>

        {errorCode ? (
          <p className="sjp-alert" role="alert">
            {errorCode}
          </p>
        ) : null}

        <div className="sjp-actions sjp-actions--drawer">
          {savedNoticeVisible ? (
            <span className="sjp-actions__status" role="status">
              {copy.common.saved}
            </span>
          ) : null}
          <Button
            type="submit"
            tone="primary"
            loading={saving}
            disabled={saving}
            leadingIcon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            }
          >
            {saving ? copy.common.saving : copy.common.save}
          </Button>
          <Button type="button" tone="ghost" onClick={closeEdit} disabled={saving}>
            {copy.common.cancel}
          </Button>
        </div>
      </>
    );
  }

  if (inlineEditor) {
    return (
      <section className="sjp-card sjp-card--inline-self-editor" aria-label={copy.self.editDialog}>
        <header className="sjp-inline-self-editor__head">
          <h2>{copy.self.editDialog}</h2>
        </header>
        <form
          className="sjp-drawer__body sjp-grid sjp-inline-self-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {renderEditorFormFields('self-inline')}
        </form>
      </section>
    );
  }

  return (
    <section className="sjp-card">
      <div className="sjp-card-head">
        <span className="sjp-card-icon">
          <svg
            className="sjp-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-1a7 7 0 0114 0v1" />
          </svg>
        </span>
        <div className="sjp-card-headtext">
          <h2 className="sjp-card-title">{copy.self.title}</h2>
          <p className="sjp-card-desc">{copy.self.description}</p>
        </div>
        <button type="button" className="sjp-btn sjp-card-action" onClick={openEdit}>
          <svg
            className="sjp-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
          </svg>
          {copy.common.edit}
        </button>
      </div>

      <div className="sjp-profile">
        {/* 核心摘要区 — 性别 / 出生日期 · 出生时间 / 历法·城市·准确度. */}
        <div className="sjp-profile__core">
          {summary.coreFields.map((field, index) => (
            <div
              className={`sjp-stat${index === 0 ? ' sjp-stat--lead' : ''}${field.missing ? ' sjp-stat--muted' : ''}`}
              key={field.label}
            >
              <span className="sjp-stat__label">{field.label}</span>
              <span className="sjp-stat__value">{field.value}</span>
            </div>
          ))}
          <div className={`sjp-stat sjp-stat--wide${summary.metaMissing ? ' sjp-stat--muted' : ''}`}>
            <span className="sjp-stat__label">{copy.self.metaLabel}</span>
            <span className="sjp-stat__value">{summary.metaText}</span>
          </div>
        </div>

        {/* 地点与时区 — 单独弱化展示的一行. */}
        {summary.calibrationText ? (
          <p className="sjp-profile__location">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="sjp-profile__location-label">{copy.self.locationLabel}</span>
            <code>{summary.calibrationText}</code>
          </p>
        ) : null}

        {!summary.isComplete ? (
          <ul className="sjp-reminders">
            {summary.reminders.map((reminder) => (
              <li className="sjp-reminder" key={reminder}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <path d="M12 9v4M12 17h.01" />
                </svg>
                {reminder}
              </li>
            ))}
          </ul>
        ) : null}

        {/* 快捷入口区 + 右下角轻量状态. */}
        <div className="sjp-profile__foot">
          <div className="sjp-chips">
            {copy.self.tags.map((tag) => (
              <span className="sjp-chip" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          {summary.isComplete ? (
            <span className="sjp-profile__status">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {copy.self.complete}
            </span>
          ) : null}
        </div>
      </div>

      {editing
        ? createPortal(
            <div className="sjp-drawer" role="dialog" aria-modal="true" aria-label={copy.self.editDialog}>
              <div className="sjp-drawer__scrim" onClick={closeEdit} />
              <div className="sjp-drawer__panel">
                <header className="sjp-drawer__head">
                  <h3 className="sjp-drawer__title">{copy.self.editDialog}</h3>
                  <button
                    type="button"
                    className="sjp-drawer__close"
                    onClick={closeEdit}
                    aria-label={copy.common.close}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </header>

                <form
                  className="sjp-drawer__body sjp-grid"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save();
                  }}
                >
                  {renderEditorFormFields('self')}
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

function describePersistenceSaveError(error: PersistenceError, copy: ProductCopy): string {
  if (error.kind === 'save_validation_failed' && error.validation_error) {
    return copy.self.validationFailed(error.validation_error.code);
  }
  if ('cause' in error) return copy.self.saveFailed(error.cause);
  if ('reason' in error) return copy.self.saveFailed(error.reason);
  return copy.self.saveFailed(error.kind);
}
