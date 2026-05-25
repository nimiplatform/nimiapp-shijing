// Wave-12 — orchestrates generateReading + snapshot/replace dispatch.
// On runtime/parse/validation failure returns a typed status that the
// tabs render verbatim (no synthesized content, no silent retry).

import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { ReadingKind, ReadingScope } from '../../domain/reading-matrix.ts';
import type { Reading, ReadingTimeWindow } from '../../domain/reading.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import type { View } from '../../domain/view.ts';
import { generateReading, type GenerateReadingFailure } from '../astrology/generate-reading.ts';
import type { RuntimeAiClient } from '../astrology/runtime-ai-client.ts';

export interface GenerateAndStoreInput {
  readonly id: string;
  readonly created_at: string;
  readonly kind: ReadingKind;
  readonly scope: ReadingScope;
  readonly anchor_subject: SubjectRef;
  readonly subjects: readonly SubjectRef[];
  readonly time_window: ReadingTimeWindow;
  readonly space: ShiJingSpace;
  readonly view?: View;
  readonly ad_hoc_context_text?: string;
  readonly runtime_ai_client?: RuntimeAiClient;
}

export type GenerateAndStoreOutcome =
  | { ok: true; reading: Reading; next_space: ShiJingSpace }
  | { ok: false; error: GenerateReadingFailure };

export async function generateReadingForStorage(
  input: GenerateAndStoreInput,
): Promise<GenerateAndStoreOutcome> {
  const result = await generateReading(
    {
      id: input.id,
      created_at: input.created_at,
      kind: input.kind,
      scope: input.scope,
      anchor_subject: input.anchor_subject,
      subjects: input.subjects,
      time_window: input.time_window,
      space: input.space,
      ...(input.view ? { view: input.view } : {}),
      ...(input.ad_hoc_context_text !== undefined ? { ad_hoc_context_text: input.ad_hoc_context_text } : {}),
    },
    input.runtime_ai_client ? { runtime_ai_client: input.runtime_ai_client } : {},
  );
  if (!result.ok) return { ok: false, error: result.error };
  const next_space: ShiJingSpace = {
    ...input.space,
    readings: [...input.space.readings, result.reading],
  };
  return { ok: true, reading: result.reading, next_space };
}
