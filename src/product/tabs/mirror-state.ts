// W06 — shared mirror tab state machine.
//
// All four mirror tabs (RiJing / YueJing / NianJing / ShiJing) move
// through the same typed lifecycle. SJG-IA-05 readiness blockers,
// SJG-ALGO-10 fail-closed paths, and SJG-PROD-11 typed
// ReadingGenerationFailure surface as separate states; no synthesized
// substitute output is rendered.

import type { Reading, ReadingGenerationFailure } from '../../domain/reading.ts';

export type MirrorTabState =
  | { kind: 'empty' }
  | { kind: 'loading' }
  | { kind: 'ready'; reading: Reading; stale: boolean }
  | { kind: 'failure'; failure: ReadingGenerationFailure };

export function classifyMirrorTabState(args: {
  readonly reading?: Reading;
  readonly failure?: ReadingGenerationFailure;
  readonly loading: boolean;
  readonly stale: boolean;
}): MirrorTabState {
  if (args.loading) return { kind: 'loading' };
  if (args.failure) return { kind: 'failure', failure: args.failure };
  if (args.reading) return { kind: 'ready', reading: args.reading, stale: args.stale };
  return { kind: 'empty' };
}
