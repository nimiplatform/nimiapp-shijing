# SJG-ASTRO - Astrology Contract v1

## SJG-ASTRO-01 - Mirror Kinds

`Reading.mirror_kind` is exactly one of:

- `rijing`: daily mirror.
- `yuejing`: rolling 30-day mirror.
- `nianjing`: long-horizon phase and inflection mirror.
- `shijing`: consultation mirror grounded in cited readings.

## SJG-ASTRO-02 - Mirror Scopes

`Reading.mirror_scope.kind` is exactly one of:

- `daily`
- `rolling_30_day`
- `long_horizon`
- `consultation`

Valid kind/scope pairings are listed in
`tables/mirror-kind-scope-matrix.yaml`.

## SJG-ASTRO-03 - Output Structure

`Reading.output` is a discriminated `MirrorOutput` whose required shape is
listed in `tables/mirror-output-contract.yaml`.

Common invariants:

- Output must be structured JSON, not prose-only markdown.
- Output must cite any event memory or plan item it uses.
- Output must not include fields outside the admitted mirror output contract.
- Runtime AI wording may fill prose fields only after deterministic feature
  snapshots exist.

## SJG-ASTRO-04 - RiJing Output

RiJing output contains:

- daily overview,
- per-active-concern projection blocks,
- bounded tendency class,
- evidence citations,
- optional cited memory and plan refs.

RiJing is self-anchored and may include related persons only when active
concern tags or cited context resolve them.

## SJG-ASTRO-05 - YueJing Output

YueJing output contains a 30-day calendar from the scope start date:

- one cell per local date,
- one or more active concern-tag projections per cell when requested,
- tendency class from the closed set in `SJG-ALGO-09`,
- detail payloads for selected dates,
- cited plan and memory refs when used.

Tendency classes are not numeric scores, rankings, or curve inputs.

## SJG-ASTRO-06 - NianJing Output

NianJing output contains:

- phase bands by concern tag,
- inflection points by concern tag,
- deterministic reasons / citation keys,
- wording summaries.

NianJing must not output authoritative curves, K-line bars, trend charts,
numeric luck scores, rankable yearly/day-level numbers, or aggregatable
score series. Phase bands and inflection points are the only authoritative
visual data.

## SJG-ASTRO-07 - ShiJing Consultation Output

ShiJing consultation output is grounded in `source_reading_ids[]`.

It may:

- explain cited readings,
- compare cited mirror results,
- answer user questions using cited readings and eligible memory refs,
- propose reflection language.

It must not:

- create a new astrology output entity outside `Reading`,
- mutate deterministic facts,
- infer missing natal inputs,
- pretend uncited memory influenced the answer.

## SJG-ASTRO-08 - Forbidden Outputs

Reading output must not include:

- numeric luck scores, luck deltas, luck curves, percentiles, ranks, or 0-100 /
  0-10 scales;
- reports, monthly reports, yearly reports, report exports, or report-like
  aggregate entities;
- trend charts or subject-comparison trend charts;
- Huangli daily fortune calendar entries;
- Venture, project, task, milestone, deadline, overdue, board, dependency,
  Gantt, or progress payloads;
- customer, client, consultant booking, or commerce CTA payloads;
- placeholder, mock, randomized, substitute, empty-success, or completion-marker
  content.

A reading that would require a forbidden output must fail closed.

## SJG-ASTRO-09 - Uncertainty Surface

```text
UncertaintyAnnotation {
  confidence: "low" | "medium" | "high"
  caveats: string[]
  data_gaps: string[]
}
```

Invariants:

- Every ready Reading carries uncertainty.
- The deterministic uncertainty decision table in `SJG-ALGO-10` sets the
  maximum confidence.
- Runtime AI may lower confidence in wording but must not raise it.
- Missing natal precision, incomplete related-person inputs, unresolved
  mentions, unavailable memory, and withheld consent must be surfaced.

## SJG-ASTRO-10 - Inputs Summary Expiry

`InputsSummary.captured_at` defines freshness:

- RiJing expires after 24 hours.
- YueJing expires after 7 days or when the rolling 30-day scope changes.
- NianJing expires after 30 days or when active concern tags / natal inputs
  change.
- ShiJing consultation expires after 7 days for new AI turns.

Expired snapshots are retained on historical readings but must not be reused to
generate new wording.

## SJG-ASTRO-11 - Runtime Boundary

All AI generation for Reading runs through the Nimi runtime via
`@nimiplatform/sdk/runtime`. Direct HTTP/gRPC calls, hardcoded provider/model
literals, and fallback paths that mask runtime failure are forbidden.
