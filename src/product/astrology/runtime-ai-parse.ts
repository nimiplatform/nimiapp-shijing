// SJG-ALGO-13 — Runtime AI structured-output parser.

import type { MirrorKind } from '../../domain/mirror-scope.ts';
import type { MirrorOutput } from '../../domain/mirror-output.ts';
import { validateMirrorOutput } from '../../contracts/mirror-output-validator.ts';

export type RuntimeAiParseFailure =
  | { kind: 'invalid_json'; detail: string }
  | { kind: 'mirror_kind_mismatch'; expected: MirrorKind; received: unknown }
  | { kind: 'validation_failed'; detail: string };

export type RuntimeAiParseResult =
  | { ok: true; output: MirrorOutput }
  | { ok: false; failure: RuntimeAiParseFailure };

export class RuntimeAiOutputValidationError extends Error {
  readonly failure: RuntimeAiParseFailure;

  constructor(failure: RuntimeAiParseFailure) {
    super(runtimeAiParseFailureMessage(failure));
    this.name = 'RuntimeAiOutputValidationError';
    this.failure = failure;
  }
}

export function runtimeAiParseFailureMessage(failure: RuntimeAiParseFailure): string {
  switch (failure.kind) {
    case 'invalid_json':
      return `invalid_json:${failure.detail}`;
    case 'mirror_kind_mismatch':
      return `mirror_kind_mismatch:expected=${failure.expected};received=${String(failure.received)}`;
    case 'validation_failed':
      return `validation_failed:${failure.detail}`;
  }
}

export function validateRuntimeAiOutputValue(
  expectedKind: MirrorKind,
  value: unknown,
): MirrorOutput {
  if (typeof value !== 'object' || value === null) {
    throw new RuntimeAiOutputValidationError({
      kind: 'invalid_json',
      detail: 'not an object',
    });
  }
  const record = value as Record<string, unknown>;
  if (record.mirror_kind !== expectedKind) {
    throw new RuntimeAiOutputValidationError({
      kind: 'mirror_kind_mismatch',
      expected: expectedKind,
      received: record.mirror_kind,
    });
  }
  const output = value as MirrorOutput;
  const check = validateMirrorOutput(output);
  if (!check.ok) {
    throw new RuntimeAiOutputValidationError({
      kind: 'validation_failed',
      detail: check.error.code,
    });
  }
  return output;
}

export function parseRuntimeAiOutput(
  expectedKind: MirrorKind,
  raw: string,
): RuntimeAiParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { ok: false, failure: { kind: 'invalid_json', detail: String((err as Error).message) } };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, failure: { kind: 'invalid_json', detail: 'not an object' } };
  }
  try {
    return { ok: true, output: validateRuntimeAiOutputValue(expectedKind, parsed) };
  } catch (error) {
    if (error instanceof RuntimeAiOutputValidationError) {
      return { ok: false, failure: error.failure };
    }
    return {
      ok: false,
      failure: { kind: 'validation_failed', detail: error instanceof Error ? error.message : String(error) },
    };
  }
}
