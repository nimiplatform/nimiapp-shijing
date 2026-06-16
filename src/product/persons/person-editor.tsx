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
import { CONSENT_STATE_ORDER, useProductCopy } from '../i18n/copy.ts';
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

export function PersonEditor() {
  const { state, dispatch } = useShijingStore();
  const copy = useProductCopy();
  const [meta, setMeta] = useState<PersonMetaDraft>(emptyMeta);
  const [natal, setNatal] = useState<SelfNatalDraft>(emptyNatalDraft);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<Person | null>(null);
  const persons = state.snapshot.persons;
  const consentOptions = CONSENT_STATE_ORDER.filter((c) => CONSENT_STATES.includes(c)).map((c) => ({
    value: c,
    label: copy.consentStateLabels[c],
  }));

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
      setErrorCode(describeNatalError(code, copy));
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
      setErrorCode(describeNatalError(code, copy));
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
          ? copy.people.deleteBlocked
          : describeNatalError(outcome.error.code, copy);
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
          <h2 className="sjp-card-title">{copy.people.title}</h2>
          <p className="sjp-card-desc">{copy.people.description}</p>
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
          {copy.common.add}
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
                  {copy.consentStateLabels[p.consent_state]}
                </span>
              </span>
              <button
                type="button"
                className="sjp-btn sjp-btn--ghost"
                onClick={() => setConfirmingDelete(p)}
                aria-label={copy.people.deletePersonAria(p.display_name)}
              >
                {copy.common.delete}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sjp-quiet-empty">{copy.people.empty}</p>
      )}

      {/* List-level error (e.g. delete blocked). The drawer shows its own. */}
      {!drawerOpen && errorCode ? (
        <p className="sjp-alert" role="alert">
          {errorCode}
        </p>
      ) : null}

      {drawerOpen
        ? createPortal(
            <div className="sjp-drawer" role="dialog" aria-modal="true" aria-label={copy.people.addDialog}>
              <div className="sjp-drawer__scrim" onClick={closeDrawer} />
              <div className="sjp-drawer__panel">
                <header className="sjp-drawer__head">
                  <h3 className="sjp-drawer__title">{copy.people.addDialog}</h3>
                  <button
                    type="button"
                    className="sjp-drawer__close"
                    onClick={closeDrawer}
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
                    add();
                  }}
                >
                  <div className="sjp-field">
                    <label className="sjp-label" htmlFor="person-alias">{copy.people.displayName}</label>
                    <input
                      id="person-alias"
                      type="text"
                      className="sjp-input"
                      placeholder={copy.people.displayNamePlaceholder}
                      value={meta.display_name}
                      onChange={(e) => setMeta({ ...meta, display_name: e.currentTarget.value })}
                    />
                  </div>

                  <div className="sjp-field">
                    <label className="sjp-label" htmlFor="person-relation">{copy.people.relation}</label>
                    <input
                      id="person-relation"
                      type="text"
                      className="sjp-input"
                      placeholder={copy.people.relationPlaceholder}
                      maxLength={PERSON_RELATION_MAX_LENGTH}
                      value={meta.relation}
                      onChange={(e) => setMeta({ ...meta, relation: e.currentTarget.value })}
                    />
                  </div>

                  <div className="sjp-field sjp-field--full">
                    <label className="sjp-label" htmlFor="person-consent">{copy.people.consentSource}</label>
                    <SjpSelect
                      id="person-consent"
                      value={meta.consent_state}
                      onValueChange={(v) =>
                        setMeta({ ...meta, consent_state: v as Person['consent_state'] })
                      }
                      options={consentOptions}
                    />
                  </div>

                  <NatalFields draft={natal} onChange={updateNatal} idPrefix="person" />

                  <div className="sjp-field sjp-field--full">
                    <label className="sjp-label" htmlFor="person-notes">{copy.people.notes}</label>
                    <textarea
                      id="person-notes"
                      className="sjp-textarea"
                      placeholder={copy.people.notesPlaceholder}
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
                      {copy.people.addPerson}
                    </Button>
                    <Button type="button" tone="ghost" onClick={closeDrawer}>
                      {copy.common.cancel}
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
        title={copy.people.deleteTitle}
        message={
          confirmingDelete
            ? copy.people.deleteMessage(confirmingDelete.display_name)
            : ''
        }
        confirmLabel={copy.common.delete}
        cancelLabel={copy.common.cancel}
        confirmTone="danger"
        onConfirm={confirmDelete}
        onClose={() => setConfirmingDelete(null)}
      />
    </section>
  );
}
