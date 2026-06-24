import { Button } from '@nimiplatform/kit/ui';
import { NatalFields } from '../natal/natal-fields.tsx';
import type { ProductCopy } from '../i18n/copy.ts';
import type { SelfNatalDraft } from './self-editor-state.ts';

export type SelfNatalDraftChange = <K extends keyof SelfNatalDraft>(
  key: K,
  value: SelfNatalDraft[K],
) => void;

export interface SelfEditorFormFieldsProps {
  readonly draft: SelfNatalDraft;
  readonly onChange: SelfNatalDraftChange;
  readonly idPrefix: string;
  readonly errorCode: string | null;
  readonly savedNoticeVisible: boolean;
  readonly saving: boolean;
  readonly copy: ProductCopy;
  readonly onClose: () => void;
}

export function SelfEditorFormFields(props: SelfEditorFormFieldsProps) {
  const { copy, draft, errorCode, idPrefix, onChange, onClose, savedNoticeVisible, saving } = props;
  return (
    <>
      <NatalFields draft={draft} onChange={onChange} idPrefix={idPrefix} />

      <div className="sjp-field sjp-field--full">
        <label className="sjp-label" htmlFor={`${idPrefix}-notes`}>{copy.self.notes}</label>
        <textarea
          id={`${idPrefix}-notes`}
          className="sjp-textarea"
          placeholder={copy.self.notesPlaceholder}
          value={draft.notes}
          onChange={(event) => onChange('notes', event.currentTarget.value)}
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
        <Button type="button" tone="ghost" onClick={onClose} disabled={saving}>
          {copy.common.cancel}
        </Button>
      </div>
    </>
  );
}
