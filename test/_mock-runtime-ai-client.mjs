import {
  runtimeAiWordingPatchAppliedSource,
} from '../src/product/astrology/runtime-ai-client.ts';
import {
  RuntimeAiWordingPatchValidationError,
  applyRuntimeAiWordingPatch,
  validateRuntimeAiWordingPatchValue,
  wordingPatchValidationFailure,
} from '../src/product/astrology/runtime-ai-wording-patch.ts';
import { RuntimeAiOutputValidationError } from '../src/product/astrology/runtime-ai-parse.ts';

export class MockRuntimeAiClient {
  constructor(options = {}) {
    this.options = options;
  }

  async generate(mirror_kind, request) {
    this.options.capture?.(mirror_kind, request);
    if (this.options.canned_failure) {
      return { ok: false, failure: this.options.canned_failure };
    }
    const cannedPatch = this.options.canned_patch_by_kind?.[mirror_kind];
    if (cannedPatch) {
      try {
        const patch = validateRuntimeAiWordingPatchValue(mirror_kind, cannedPatch);
        return {
          ok: true,
          output: applyRuntimeAiWordingPatch(request.deterministic_output, patch),
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
    const canned = this.options.canned_output_by_kind?.[mirror_kind];
    if (!canned) {
      return {
        ok: false,
        failure: {
          kind: 'runtime_unavailable',
          detail: 'MockRuntimeAiClient has no canned output or patch for ' + mirror_kind,
        },
      };
    }
    return { ok: true, output: canned };
  }
}
