// W-c04 — Import-to-ShiJing button (state-backed).
//
// Dispatches a `shijing/import-source-reading` action into the W04
// reducer instead of mutating a globalThis bus. The ShiJing tab reads
// `pending_shijing_source_reading_ids` from the store.

import { useShijingStore } from '../../state/shijing-store.tsx';
import { useProductCopy } from '../../i18n/copy.ts';

export interface ImportToShiJingButtonProps {
  readonly readingId: string;
}

export function ImportToShiJingButton(props: ImportToShiJingButtonProps) {
  const copy = useProductCopy();
  const { state, dispatch } = useShijingStore();
  const isPending = state.pending_shijing_source_reading_ids.includes(props.readingId);
  return (
    <button
      type="button"
      className="shijing-import-to-consultation"
      onClick={() => dispatch({ type: 'shijing/import-source-reading', reading_id: props.readingId })}
      disabled={isPending}
      aria-pressed={isPending}
      aria-label={copy.importToShijing.ariaLabel}
    >
      {isPending ? copy.importToShijing.pendingLabel : copy.importToShijing.label}
    </button>
  );
}
