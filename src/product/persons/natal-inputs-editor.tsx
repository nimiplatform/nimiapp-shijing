import { useEffect, useReducer } from 'react';

import type { NatalInputs } from '../../domain/person.ts';
import { NaturalBirthEditor } from '../inputs/natural-birth-editor.tsx';
import {
  createEmptyNaturalBirthDraft,
  naturalBirthDraftReducer,
  type NaturalBirthDraft,
} from '../inputs/natural-birth-draft.ts';

export interface NatalInputsEditorProps {
  readonly initial?: NatalInputs;
  readonly onDraftChange?: (draft: NaturalBirthDraft) => void;
  readonly idPrefix: string;
}

export function NatalInputsEditor(props: NatalInputsEditorProps) {
  const [draft, dispatch] = useReducer(naturalBirthDraftReducer, createEmptyNaturalBirthDraft());

  useEffect(() => {
    if (props.initial) dispatch({ type: 'hydrate_from_natal_inputs', value: props.initial });
  }, [props.initial]);

  useEffect(() => {
    if (props.onDraftChange) props.onDraftChange(draft);
  }, [draft, props.onDraftChange]);

  return <NaturalBirthEditor draft={draft} dispatch={dispatch} idPrefix={props.idPrefix} />;
}

