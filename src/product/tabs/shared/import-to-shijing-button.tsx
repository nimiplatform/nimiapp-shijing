// W-c04 — Import-to-ShiJing button (state-backed).
//
// Dispatches a `shijing/import-source-reading` action into the W04
// reducer instead of mutating a globalThis bus. The ShiJing tab reads
// `pending_shijing_source_reading_ids` from the store.

import { useShijingStore } from '../../state/shijing-store.tsx';

export interface ImportToShiJingButtonProps {
  readonly readingId: string;
}

export function ImportToShiJingButton(props: ImportToShiJingButtonProps) {
  const { state, dispatch } = useShijingStore();
  const isPending = state.pending_shijing_source_reading_ids.includes(props.readingId);
  return (
    <button
      type="button"
      className="shijing-import-to-consultation"
      onClick={() => dispatch({ type: 'shijing/import-source-reading', reading_id: props.readingId })}
      disabled={isPending}
      aria-pressed={isPending}
      aria-label="导入到时镜咨询"
    >
      {isPending ? '已加入时镜咨询' : '导入到时镜咨询'}
    </button>
  );
}
