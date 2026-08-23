// SJG-ASTRO-11 — Runtime AI wording text parse/apply boundary.
//
// The production transport is the protected Local App text-candidate operation
// under runtime.consume (src/shell/ai/shijing-runtime-ai.ts). This module owns
// the deterministic side of that boundary: parsing the returned wording-patch
// text and applying it onto the deterministic output, fail-closed.

import type {
  NimiStructuredOutputParseFailure,
} from '@nimiplatform/sdk/features/evaluation';
import { parseNimiStructuredJson } from '@nimiplatform/sdk/features/evaluation';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import {
  RuntimeAiOutputValidationError,
  type RuntimeAiParseFailure,
} from './runtime-ai-parse.ts';
import {
  applyRuntimeAiWordingPatch,
  RuntimeAiWordingPatchValidationError,
  validateRuntimeAiWordingPatchValue,
  wordingPatchValidationFailure,
  type RuntimeAiWordingPatch,
} from './runtime-ai-wording-patch.ts';
import type {
  RuntimeAiResult,
} from './runtime-ai-client.ts';
import { runtimeAiWordingPatchAppliedSource } from './runtime-ai-client.ts';
import type { RuntimeAiPromptRequest } from './runtime-ai-prompt.ts';

function structuredFailureToRuntimeParseFailure(
  failure: NimiStructuredOutputParseFailure,
  validationError?: unknown,
): RuntimeAiParseFailure {
  if (failure.reason === 'invalid-json' || failure.reason === 'expectation-failed') {
    return {
      kind: 'invalid_json',
      detail: failure.message,
    };
  }
  const error = validationError ?? failure.error;
  if (error instanceof RuntimeAiOutputValidationError) {
    return error.failure;
  }
  if (error instanceof RuntimeAiWordingPatchValidationError) {
    return wordingPatchValidationFailure(error.detail);
  }
  return {
    kind: 'validation_failed',
    detail: failure.message,
  };
}

function extractBalancedJsonObjects(raw: string): string[] {
  const candidates: string[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const ch = raw[index]!;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }

    if (ch !== '}' || depth === 0) continue;

    depth -= 1;
    if (depth === 0 && start >= 0) {
      candidates.push(raw.slice(start, index + 1));
      start = -1;
    }
  }

  return Array.from(new Set(candidates));
}

function parseRuntimeAiWordingPatchCandidate(
  mirrorKind: MirrorKind,
  text: string,
): {
  readonly parsed: ReturnType<typeof parseNimiStructuredJson<RuntimeAiWordingPatch>>;
  readonly normalized: RuntimeAiWordingPatch | null;
  readonly validationError: unknown;
} {
  let normalized: RuntimeAiWordingPatch | null = null;
  let validationError: unknown;
  const parsed = parseNimiStructuredJson<RuntimeAiWordingPatch>({
    raw: text,
    expect: 'object',
    validate: (value): value is RuntimeAiWordingPatch => {
      try {
        normalized = validateRuntimeAiWordingPatchValue(mirrorKind, value);
        return true;
      } catch (error) {
        validationError = error;
        return false;
      }
    },
  });
  return { parsed, normalized, validationError };
}

function parseRuntimeAiWordingPatch(
  mirrorKind: MirrorKind,
  text: string,
): { ok: true; value: RuntimeAiWordingPatch } | { ok: false; failure: RuntimeAiParseFailure } {
  const { parsed, normalized, validationError } = parseRuntimeAiWordingPatchCandidate(
    mirrorKind,
    text,
  );
  if (!parsed.ok) {
    const accepted = new Map<string, RuntimeAiWordingPatch>();
    for (const candidate of extractBalancedJsonObjects(text)) {
      if (candidate.trim() === text.trim()) continue;
      const retry = parseRuntimeAiWordingPatchCandidate(mirrorKind, candidate);
      if (retry.parsed.ok && retry.normalized) {
        accepted.set(JSON.stringify(retry.normalized), retry.normalized);
      }
    }
    if (accepted.size === 1) {
      return { ok: true, value: [...accepted.values()][0]! };
    }
    if (accepted.size > 1) {
      return {
        ok: false,
        failure: {
          kind: 'validation_failed',
          detail: 'multiple_valid_runtime_ai_wording_patches',
        },
      };
    }
    return {
      ok: false,
      failure: structuredFailureToRuntimeParseFailure(parsed, validationError),
    };
  }
  if (!normalized) {
    return {
      ok: false,
      failure: {
        kind: 'validation_failed',
        detail: 'Runtime AI wording patch validator did not return a normalized patch.',
      },
    };
  }
  return { ok: true, value: normalized };
}

export function applyRuntimeAiWordingText(
  mirrorKind: MirrorKind,
  request: RuntimeAiPromptRequest,
  text: string,
): RuntimeAiResult {
  const parsed = parseRuntimeAiWordingPatch(mirrorKind, text);
  if (!parsed.ok) {
    return { ok: false, failure: { kind: 'parse_failure', failure: parsed.failure } };
  }
  try {
    return {
      ok: true,
      output: applyRuntimeAiWordingPatch(
        request.deterministic_output,
        parsed.value,
      ),
      output_source: runtimeAiWordingPatchAppliedSource(),
    };
  } catch (error) {
    if (error instanceof RuntimeAiOutputValidationError) {
      return { ok: false, failure: { kind: 'parse_failure', failure: error.failure } };
    }
    if (error instanceof RuntimeAiWordingPatchValidationError) {
      return {
        ok: false,
        failure: {
          kind: 'parse_failure',
          failure: wordingPatchValidationFailure(error.detail),
        },
      };
    }
    return {
      ok: false,
      failure: {
        kind: 'parse_failure',
        failure: {
          kind: 'validation_failed',
          detail: error instanceof Error ? error.message : String(error),
        },
      },
    };
  }
}
