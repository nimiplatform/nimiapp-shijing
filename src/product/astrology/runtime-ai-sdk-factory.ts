// SJG-ASTRO-11 — Nimi runtime SDK factory.

import type { MirrorKind } from '../../domain/mirror-scope.ts';
import { parseRuntimeAiOutput } from './runtime-ai-parse.ts';
import type {
  RuntimeAiClient,
  RuntimeAiResult,
} from './runtime-ai-client.ts';
import type { RuntimeAiPromptRequest } from './runtime-ai-prompt.ts';

interface NimiRuntimeLike {
  readonly generate: (request: {
    readonly system: string;
    readonly user: string;
    readonly schema_name: string;
  }) => Promise<{ readonly text: string }>;
}

export interface SdkRuntimeFactoryOptions {
  readonly nimi_runtime?: NimiRuntimeLike;
}

class SdkRuntimeAiClient implements RuntimeAiClient {
  private readonly runtime: NimiRuntimeLike | undefined;
  constructor(runtime: NimiRuntimeLike | undefined) {
    this.runtime = runtime;
  }
  async generate(
    mirror_kind: MirrorKind,
    request: RuntimeAiPromptRequest,
  ): Promise<RuntimeAiResult> {
    if (!this.runtime) {
      return {
        ok: false,
        failure: { kind: 'runtime_unavailable', detail: 'Nimi runtime not provided to factory' },
      };
    }
    let result;
    try {
      result = await this.runtime.generate({
        system: request.system_prompt,
        user: request.user_prompt,
        schema_name: request.schema_name,
      });
    } catch (err) {
      return {
        ok: false,
        failure: { kind: 'runtime_unavailable', detail: String((err as Error).message) },
      };
    }
    const parsed = parseRuntimeAiOutput(mirror_kind, result.text);
    if (!parsed.ok) {
      return { ok: false, failure: { kind: 'parse_failure', failure: parsed.failure } };
    }
    return { ok: true, output: parsed.output };
  }
}

export function createSdkRuntimeAiClient(options: SdkRuntimeFactoryOptions): RuntimeAiClient {
  return new SdkRuntimeAiClient(options.nimi_runtime);
}
