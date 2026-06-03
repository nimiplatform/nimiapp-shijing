// 关系人物 — manage ShiJingSpace.persons[].
//
// Default view is a roster (or an empty state), never an open form. Adding a
// person opens a right-hand drawer holding the full natal form, so the main
// 档案 page stays calm and scannable.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, ConfirmDialog } from '@nimiplatform/kit/ui';
import type { Person } from '../../domain/person.ts';
import { CONSENT_STATES, PERSON_RELATION_MAX_LENGTH } from '../../domain/person.ts';
import { CONSENT_STATE_LABELS, CONSENT_STATE_ORDER } from '../i18n/copy.ts';
import { SjpSelect } from '../components/sjp-select.tsx';
import { newUlid } from '../ids/index.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { NatalFields } from '../natal/natal-fields.tsx';
import {
  buildSelfNatalInputs,
  emptyNatalDraft,
  type SelfNatalDraft,
} from '../self/self-editor-state.ts';
import { describeNatalError } from '../natal/natal-error-copy.ts';
import { deletePerson, upsertPerson } from './person-editor-state.ts';

// Identity + provenance metadata for a new person. The ULID is generated up
// front but kept out of the UI — it carries no meaning for the user. The
// person's birth data lives in a separate NatalInputs draft.
interface PersonMetaDraft {
  readonly id: string;
  readonly display_name: string;
  readonly relation: string;
  readonly consent_state: Person['consent_state'];
  readonly notes: string;
}

function emptyMeta(): PersonMetaDraft {
  return {
    id: newUlid(),
    display_name: '',
    relation: '',
    consent_state: 'subject_consented',
    notes: '',
  };
}

// 资料来源 options ordered per product copy (本人提供 first).
const CONSENT_OPTIONS = CONSENT_STATE_ORDER.filter((c) => CONSENT_STATES.includes(c)).map((c) => ({
  value: c,
  label: CONSENT_STATE_LABELS[c],
}));

export function PersonEditor() {
  const { state, dispatch } = useShijingStore();
  const [meta, setMeta] = useState<PersonMetaDraft>(emptyMeta);
  const [natal, setNatal] = useState<SelfNatalDraft>(emptyNatalDraft);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<Person | null>(null);
  const persons = state.snapshot.persons;

  // Close drawer on Escape. Inlining the state setters here (rather than
  // calling closeDrawer) keeps the effect's dependency list honest.
  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setDrawerOpen(false);
        setErrorCode(null);
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [drawerOpen]);

  function updateNatal<K extends keyof SelfNatalDraft>(key: K, value: SelfNatalDraft[K]) {
    setNatal((prev) => ({ ...prev, [key]: value }));
  }

  function openDrawer() {
    setMeta(emptyMeta());
    setNatal(emptyNatalDraft());
    setErrorCode(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setErrorCode(null);
  }

  function add() {
    // A Person is a first-class astrology subject (SJG-PROD-06): it carries
    // its own complete natal inputs rather than inheriting the self subject's.
    const built = buildSelfNatalInputs(natal);
    if (!built.ok) {
      const code =
        built.error.code === 'birth_datetime_underivable' ? built.error.reason : built.error.code;
      setErrorCode(describeNatalError(code));
      return;
    }
    const relation = meta.relation.trim();
    const person: Person = {
      id: meta.id,
      display_name: meta.display_name.trim(),
      kind: 'person',
      natal_inputs: built.inputs,
      consent_state: meta.consent_state,
      ...(relation.length > 0 ? { relation } : {}),
      ...(meta.notes.length > 0 ? { notes: meta.notes } : {}),
    };
    const outcome = upsertPerson(state.snapshot, person);
    if (!outcome.ok) {
      const code =
        outcome.error.code === 'person_natal_inputs_invalid'
          ? outcome.error.reason
          : outcome.error.code;
      setErrorCode(describeNatalError(code));
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    closeDrawer();
  }

  function confirmDelete() {
    const person = confirmingDelete;
    if (!person) return;
    const outcome = deletePerson(state.snapshot, person.id);
    if (!outcome.ok) {
      const detail =
        outcome.error.code === 'person_has_dangling_references'
          ? '无法删除：仍有关注标签等内容引用了该人物，请先解除引用再删除。'
          : describeNatalError(outcome.error.code);
      setErrorCode(detail);
      setConfirmingDelete(null);
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    setErrorCode(null);
    setConfirmingDelete(null);
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
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        </span>
        <div className="sjp-card-headtext">
          <h2 className="sjp-card-title">关系人物</h2>
          <p className="sjp-card-desc">添加家人、伴侣或重要的人，用于关系合盘和事件解读。</p>
        </div>
        <button type="button" className="sjp-btn sjp-card-action" onClick={openDrawer}>
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
            <path d="M12 5v14M5 12h14" />
          </svg>
          添加
        </button>
      </div>

      {persons.length > 0 ? (
        <ul className="sjp-people">
          {persons.map((p) => (
            <li className="sjp-people__item" key={p.id}>
              <span className="sjp-people__text">
                <strong>{p.display_name}</strong>
                <span className="sjp-people__meta">
                  {p.relation ? `${p.relation} · ` : ''}
                  {CONSENT_STATE_LABELS[p.consent_state]}
                </span>
              </span>
              <button
                type="button"
                className="sjp-btn sjp-btn--ghost"
                onClick={() => setConfirmingDelete(p)}
                aria-label={`删除 ${p.display_name}`}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sjp-quiet-empty">暂无关系人物</p>
      )}

      {/* List-level error (e.g. delete blocked). The drawer shows its own. */}
      {!drawerOpen && errorCode ? (
        <p className="sjp-alert" role="alert">
          {errorCode}
        </p>
      ) : null}

      {drawerOpen
        ? createPortal(
            <div className="sjp-drawer" role="dialog" aria-modal="true" aria-label="添加关系人物">
              <div className="sjp-drawer__scrim" onClick={closeDrawer} />
              <div className="sjp-drawer__panel">
                <header className="sjp-drawer__head">
                  <h3 className="sjp-drawer__title">添加关系人物</h3>
                  <button
                    type="button"
                    className="sjp-drawer__close"
                    onClick={closeDrawer}
                    aria-label="关闭"
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
                    add();
                  }}
                >
                  <div className="sjp-field">
                    <label className="sjp-label" htmlFor="person-alias">称呼</label>
                    <input
                      id="person-alias"
                      type="text"
                      className="sjp-input"
                      placeholder="例如：阿楠、老张"
                      value={meta.display_name}
                      onChange={(e) => setMeta({ ...meta, display_name: e.currentTarget.value })}
                    />
                  </div>

                  <div className="sjp-field">
                    <label className="sjp-label" htmlFor="person-relation">关系</label>
                    <input
                      id="person-relation"
                      type="text"
                      className="sjp-input"
                      placeholder="例如：母亲、合伙人"
                      maxLength={PERSON_RELATION_MAX_LENGTH}
                      value={meta.relation}
                      onChange={(e) => setMeta({ ...meta, relation: e.currentTarget.value })}
                    />
                  </div>

                  <div className="sjp-field sjp-field--full">
                    <label className="sjp-label" htmlFor="person-consent">资料来源</label>
                    <SjpSelect
                      id="person-consent"
                      value={meta.consent_state}
                      onValueChange={(v) =>
                        setMeta({ ...meta, consent_state: v as Person['consent_state'] })
                      }
                      options={CONSENT_OPTIONS}
                    />
                  </div>

                  <NatalFields draft={natal} onChange={updateNatal} idPrefix="person" />

                  <div className="sjp-field sjp-field--full">
                    <label className="sjp-label" htmlFor="person-notes">备注</label>
                    <textarea
                      id="person-notes"
                      className="sjp-textarea"
                      placeholder="关于这个人的补充说明…"
                      value={meta.notes}
                      onChange={(e) => setMeta({ ...meta, notes: e.currentTarget.value })}
                    />
                  </div>

                  {errorCode ? (
                    <p className="sjp-alert" role="alert">
                      {errorCode}
                    </p>
                  ) : null}

                  <div className="sjp-actions sjp-actions--drawer">
                    <Button
                      type="submit"
                      tone="primary"
                      disabled={meta.display_name.trim().length === 0}
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
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      }
                    >
                      添加人物
                    </Button>
                    <Button type="button" tone="ghost" onClick={closeDrawer}>
                      取消
                    </Button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={confirmingDelete !== null}
        title="删除这个人物？"
        message={
          confirmingDelete
            ? `「${confirmingDelete.display_name}」及其排盘资料将被永久删除。此操作不可撤销。`
            : ''
        }
        confirmLabel="删除"
        cancelLabel="取消"
        confirmTone="danger"
        onConfirm={confirmDelete}
        onClose={() => setConfirmingDelete(null)}
      />
    </section>
  );
}
