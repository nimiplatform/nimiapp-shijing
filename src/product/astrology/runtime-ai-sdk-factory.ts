// Wave-11 — SDK-backed factory shape. Accepts a
// `runtimeGenerateText`-compatible callable (the SDK exports one as
// `runtimeGenerateText` on RuntimeAiModule; this app slice does NOT
// construct a Runtime instance because Runtime construction +
// auth wiring belongs to a later admitted install / lifecycle wave).

import {
  RuntimeTextGeneratorAiClient,
  type RuntimeAiClient,
  type RuntimeTextGenerator,
  type RuntimeTextGeneratorRequest,
  type RuntimeTextGeneratorResponse,
} from './runtime-ai-client.ts';

// Shape of the SDK runtime's text-generation call after we strip ctx/route
// concerns. The caller composes this around the Runtime instance they
// already hold; wave-11 does not import @nimiplatform/sdk/runtime to
// avoid pulling SDK construction concerns into this app slice.
export interface SdkRuntimeTextCaller {
  generateText(input: {
    readonly model: string;
    readonly system?: string;
    readonly input: ReadonlyArray<{ readonly role: 'user' | 'assistant' | 'system'; readonly content: string }>;
  }): Promise<{ readonly text: string; readonly trace?: { readonly traceId?: string } }>;
}

export interface SdkRuntimeAiAdapterOptions {
  readonly modelId: string;
  readonly textCaller: SdkRuntimeTextCaller;
  readonly adapterKind?: string;
}

export function createSdkRuntimeAiAdapter(options: SdkRuntimeAiAdapterOptions): RuntimeAiClient {
  const generator: RuntimeTextGenerator = async (request: RuntimeTextGeneratorRequest): Promise<RuntimeTextGeneratorResponse> => {
    const response = await options.textCaller.generateText({
      model: request.modelId,
      system: request.system,
      input: [{ role: 'user', content: request.user }],
    });
    return {
      text: response.text,
      ...(response.trace?.traceId !== undefined ? { traceId: response.trace.traceId } : {}),
    };
  };
  return new RuntimeTextGeneratorAiClient({
    modelId: options.modelId,
    generator,
    adapterKind: options.adapterKind ?? 'sdk_runtime_text',
  });
}
