import {
  ADMITTED_METHOD_PROFILE_IDS,
  DEFAULT_METHOD_PROFILE_ID,
  type MethodProfileId,
} from '../../domain/algorithm.ts';
import { SjpSelect } from '../components/sjp-select.tsx';
import { METHOD_LABELS } from '../reading/reading-format.ts';

export interface MethodProfileSelectProps {
  readonly value?: MethodProfileId;
  readonly onChange: (methodProfileId: MethodProfileId) => void;
  readonly id?: string;
  readonly className?: string;
  readonly 'aria-label'?: string;
}

export function MethodProfileSelect({
  value,
  onChange,
  id,
  className,
  'aria-label': ariaLabel,
}: MethodProfileSelectProps) {
  return (
    <SjpSelect
      id={id}
      value={value ?? DEFAULT_METHOD_PROFILE_ID}
      onValueChange={(nextValue) => onChange(nextValue as MethodProfileId)}
      options={ADMITTED_METHOD_PROFILE_IDS.map((methodProfileId) => ({
        value: methodProfileId,
        label: METHOD_LABELS[methodProfileId],
      }))}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
