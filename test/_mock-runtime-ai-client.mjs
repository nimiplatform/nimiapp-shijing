export class MockRuntimeAiClient {
  constructor(options = {}) {
    this.options = options;
  }

  async generate(mirror_kind, request) {
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
