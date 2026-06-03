// SJG-ASTRO-11 — Runtime AI client boundary.

import type { MirrorKind } from '../../domain/mirror-scope.ts';
import type { MirrorOutput } from '../../domain/mirror-output.ts';
import type { RuntimeAiPromptRequest } from './runtime-ai-prompt.ts';
import type { RuntimeAiParseFailure } from './runtime-ai-parse.ts';

export type RuntimeAiFailure =
  | { kind: 'runtime_unavailable'; detail: string }
  | { kind: 'parse_failure'; failure: RuntimeAiParseFailure };

export type RuntimeAiResult =
  | { ok: true; output: MirrorOutput }
  | { ok: false; failure: RuntimeAiFailure };

export interface RuntimeAiClient {
  generate(
    mirror_kind: MirrorKind,
    request: RuntimeAiPromptRequest,
  ): Promise<RuntimeAiResult>;
}

export function createUnavailableRuntimeAiClient(detail: string): RuntimeAiClient {
  return {
    async generate(): Promise<RuntimeAiResult> {
      return {
        ok: false,
        failure: { kind: 'runtime_unavailable', detail },
      };
    },
  };
}
