// Shared dropdown for ShiJing forms — a thin wrap of the nimi-kit SelectField
// (Radix-backed). Native <select> renders the OS dropdown panel, which ignores
// our surface tokens and breaks the calm, unified look the design system asks
// for. SelectField portals a nimi-styled panel (surface-overlay, subtle border,
// floating elevation) so every dropdown across the four mirrors opens the same
// way — the same panel language the kit DatePicker already uses.
//
// The trigger carries an `sjp-select-trigger` class so the settings surface can
// align it with the surrounding .sjp-input fields (see styles-personal-data.css); the
// portaled panel keeps the kit's own styling.

import type { ReactNode } from 'react';
import { SelectField } from '@nimiplatform/kit/ui';

export interface SjpSelectOption {
  readonly value: string;
  readonly label: ReactNode;
  readonly disabled?: boolean;
}

export interface SjpSelectProps {
  readonly value: string;
  readonly options: readonly SjpSelectOption[];
  readonly onValueChange: (value: string) => void;
  readonly id?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  /** Extra class merged onto the trigger button, alongside `sjp-select-trigger`. */
  readonly className?: string;
  readonly 'aria-label'?: string;
}

export function SjpSelect({
  value,
  options,
  onValueChange,
  id,
  placeholder,
  disabled,
  className,
  'aria-label': ariaLabel,
}: SjpSelectProps) {
  return (
    <SelectField
      id={id}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      onValueChange={onValueChange}
      selectClassName={className ? `sjp-select-trigger ${className}` : 'sjp-select-trigger'}
      options={options.map((o) => ({ value: o.value, label: o.label, disabled: o.disabled }))}
    />
  );
}
