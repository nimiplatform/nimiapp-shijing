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
  const record = parsed as Record<string, unknown>;
  if (record.mirror_kind !== expectedKind) {
    return {
      ok: false,
      failure: { kind: 'mirror_kind_mismatch', expected: expectedKind, received: record.mirror_kind },
    };
  }
  const output = parsed as MirrorOutput;
  const check = validateMirrorOutput(output);
  if (!check.ok) {
    return { ok: false, failure: { kind: 'validation_failed', detail: check.error.code } };
  }
  return { ok: true, output };
}
