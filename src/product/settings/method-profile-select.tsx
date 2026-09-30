import {
  ADMITTED_METHOD_PROFILE_IDS,
  DEFAULT_METHOD_PROFILE_ID,
  type MethodProfileId,
} from '../../domain/algorithm.ts';
import { SjpSelect } from '../components/sjp-select.tsx';
import { useProductCopy } from '../i18n/copy.ts';

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
  const copy = useProductCopy();
  return (
    <SjpSelect
      id={id}
      value={value ?? DEFAULT_METHOD_PROFILE_ID}
      onValueChange={(nextValue) => onChange(nextValue as MethodProfileId)}
      options={ADMITTED_METHOD_PROFILE_IDS.map((methodProfileId) => ({
        value: methodProfileId,
        label: copy.citationDrawer.methodLabels[methodProfileId]!,
      }))}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
