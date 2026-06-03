// W03 test double — deterministic Runtime AI client.

import type { MirrorOutput } from '../../domain/mirror-output.ts';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import type {
  RuntimeAiClient,
  RuntimeAiFailure,
  RuntimeAiResult,
} from './runtime-ai-client.ts';
import type { RuntimeAiPromptRequest } from './runtime-ai-prompt.ts';

export interface MockRuntimeAiClientOptions {
  readonly canned_output_by_kind?: Partial<Record<MirrorKind, MirrorOutput>>;
  readonly canned_failure?: RuntimeAiFailure;
  readonly capture?: (kind: MirrorKind, request: RuntimeAiPromptRequest) => void;
}

export class MockRuntimeAiClient implements RuntimeAiClient {
  private readonly options: MockRuntimeAiClientOptions;
  constructor(options: MockRuntimeAiClientOptions = {}) {
    this.options = options;
  }
  async generate(
    mirror_kind: MirrorKind,
    request: RuntimeAiPromptRequest,
  ): Promise<RuntimeAiResult> {
    this.options.capture?.(mirror_kind, request);
    if (this.options.canned_failure) {
      return { ok: false, failure: this.options.canned_failure };
    }
    const canned = this.options.canned_output_by_kind?.[mirror_kind];
    if (!canned) {
      return {
        ok: false,
        failure: {
          kind: 'runtime_unavailable',
          detail: 'MockRuntimeAiClient has no canned output for ' + mirror_kind,
        },
      };
    }
    return { ok: true, output: canned };
  }
}
