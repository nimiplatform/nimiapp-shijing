# SJG-ASTRO — Astrology Contract v1

> Freezes inputs, outputs, kind/scope matrix, anchor rules, uncertainty
> surface, forbidden outputs, and `inputs_summary` expiry for `Reading`.
> Wave 0 does not freeze real astrology formulas; formula implementation
> is admitted in a later wave.
> Astrology Algorithm Contract v1 (`algorithm-contract.md`) freezes the
> deterministic method stack and AI wording boundary before persistence or
> runtime integration consumes generated Readings.

## SJG-ASTRO-01 — Reading Kinds

`Reading.kind` is exactly one of:

- `today` — short reflection covering today for one subject.
- `period_outlook` — longer reflection covering a contiguous future window
  recorded in `Reading.time_window`.
- `key_window` — narrow window picking out high-salience days/periods inside
  `Reading.time_window`.
- `sign` — natal pattern summary for the self subject only.
- `consultation` — anchored consultation reflection that may include
  multiple subjects, with a single anchor for output perspective.

## SJG-ASTRO-02 — Reading Scopes

`Reading.scope` is exactly one of:

- `subject` — input scope is a single subject.
- `view` — input scope is a saved `View` with anchor and subjects.
- `ad_hoc` — input scope is a transient subject set assembled at request
  time without saving a View.

## SJG-ASTRO-03 — Kind / Scope Matrix

The valid pairings of `kind` and `scope` are listed authoritatively in
`kernel/tables/reading-kind-scope-matrix.yaml`. The matrix is reproduced
here for human reading; the YAML is the machine source of truth.

| kind | subject | view | ad_hoc |
|------|---------|------|--------|
| today | allowed | forbidden | forbidden |
| period_outlook | allowed | allowed | allowed |
| key_window | forbidden | allowed | allowed |
| sign | self only | forbidden | forbidden |
| consultation | allowed | allowed | allowed |

`sign` with `subject` scope additionally requires `anchor_subject === "self"`
per `SJG-ASTRO-07`.

## SJG-ASTRO-04 — Output Structure

```text
AstrologyOutput {
  summary: string                                    // 1-3 sentence reflection
  highlights: Highlight[]                            // 0+ structured highlights
  recommendations: Recommendation[]                  // 0+ actionable suggestions
  citations: AstrologyCitation[]                     // 0+ method-level citations
}

Highlight {
  label: string
  body: string
  subject_ref: SubjectRef                            // subject this highlight is about
}

Recommendation {
  body: string
  subject_ref: SubjectRef
  horizon: "today" | "this_week" | "this_month" | "long_term"
}

AstrologyCitation {
  method: string                                     // "bazi_ganzhi_jieqi_dayun_v1" in v1
  reference: string                                  // human-readable method reference
}
```

Invariants:

- `summary` is non-empty.
- Every `Highlight.subject_ref` and `Recommendation.subject_ref` must
  reference a subject in the parent `Reading.subjects[]`.

## SJG-ASTRO-05 — Forbidden Outputs

The AstrologyOutput MUST NOT include:

- numeric luck scores, luck-score deltas, luck curves, luck percentile, or
  any 0-100 / 0-10 ranking of subjects;
- monthly-report or yearly-report structured payloads (these are removed
  product surfaces);
- HuangliDaily-style daily fortune calendar entries;
- VentureJudgment, project-status, milestone, or task entries;
- third-party consultant identity, business address, or commercial booking
  CTA;
- placeholder vocabularies as enumerated by
  `removed-surfaces-contract.md` SJG-REMOVED-03 (synthesized substitute
  Reading content, fabricated astrology output stubs, randomized fortune
  text, completion-marker stubs, empty-output stubs), or any
  near-equivalent in source code or fixtures.

A Reading that would produce a forbidden output MUST fail-close. It MUST
NOT be returned as a successful Reading with substitute content.

## SJG-ASTRO-06 — Uncertainty Surface

```text
UncertaintyAnnotation {
  confidence: "low" | "medium" | "high"
  caveats: string[]                                  // human-readable caveats
  data_gaps: string[]                                // missing inputs that limited output
}
```

Invariants:

- Every Reading carries an `UncertaintyAnnotation`.
- The final annotation MUST respect Algorithm Contract
  `SJG-ALGO-10`. AI wording may lower confidence when wording reveals an
  extra limitation, but it MUST NOT raise confidence beyond the deterministic
  uncertainty decision table.
- AI MUST NOT inflate confidence beyond the supporting input quality.
  Missing natal precision, missing event context, or missing relation
  context MUST surface as either `data_gaps` entries or a lowered
  `confidence`.
- Fabricating supporting context to elevate confidence is forbidden.

## SJG-ASTRO-07 — Consultation And Sign Anchor Rules

- `Reading.kind === "consultation"` MUST have exactly one
  `anchor_subject`. The output perspective MUST be that anchor. Other
  subjects in `subjects[]` are context, not output focus.
- `Reading.kind === "sign"` MUST have `scope === "subject"`,
  `subjects[] === ["self"]`, and `anchor_subject === "self"`. `sign` does
  not run for `Person` subjects in v1.
- `Reading.kind === "today"` MUST have a single-subject `subjects[]` and
  `anchor_subject === subjects[0]`.

## SJG-ASTRO-08 — Inputs Snapshot

```text
InputsSummary {
  captured_at: string                                // ISO-8601 UTC timestamp
  contract_version: string                           // "SJG-ASTRO-v1"
  algorithm_contract_version: string                 // "SJG-ALGO-v1"
  method_profile: AstrologyMethodProfile
  time_window: ReadingTimeWindow
  input_hash: string
  feature_snapshot_hash: string
  feature_snapshot: AstrologyFeatureSnapshot
  subject_summaries: SubjectSummary[]                // per-subject snapshot
  relation_summaries: RelationSummary[]              // relevant relations only
  event_summaries: EventSummary[]                    // relevant events only
  view_snapshot?: ViewSnapshot                       // present iff scope === "view"
  ad_hoc_context?: string                            // free-text iff scope === "ad_hoc"
}
```

Invariants:

- `InputsSummary` is frozen at Reading creation time. Source-of-truth
  `Person` / `View` / `Event` changes after creation MUST NOT mutate an
  existing `Reading.inputs_summary`.
- `InputsSummary.time_window` MUST equal `Reading.time_window`.
- `feature_snapshot.method_profile.id` MUST equal
  `"bazi_ganzhi_jieqi_dayun_v1"` in v1.
- `input_hash` covers the canonicalized subject inputs, selected relations,
  selected events, View snapshot, and time window used for generation.
- `view_snapshot` is present if and only if `Reading.scope === "view"`.
- `ad_hoc_context` is present only when `Reading.scope === "ad_hoc"`.

`ViewSnapshot` includes:

```text
ViewSnapshot {
  view_id: string
  anchor_subject: SubjectRef
  subjects: SubjectRef[]
  time_scope: "bounded" | "open_ended" | "rolling"
  instructions_hash: string
  context_items_hash: string
  memory_summary_hash: string
  memory_locked: boolean
}
```

The snapshot hashes are reproducibility evidence. AI wording may receive
summaries of the context, but the persisted Reading must retain hashes that
prove which View context was used.

## SJG-ASTRO-09 — Inputs Summary Expiry

`InputsSummary.captured_at` defines the freshness window:

- Default expiry horizon is 24 hours from `captured_at` for
  `kind === "today"`.
- Default expiry horizon is 7 days for `period_outlook`, `key_window`,
  and `consultation`.
- `sign` has no expiry — natal inputs are stable.

When the expiry horizon passes, a new Reading run MUST recapture
`InputsSummary` instead of reusing the prior snapshot. The expired snapshot
is retained on the historical Reading record for evidence and is not
mutated.

## SJG-ASTRO-10 — Runtime Boundary

All AI generation for Reading runs through the nimi runtime via
`@nimiplatform/sdk/runtime`. Direct HTTP/gRPC calls, hardcoded provider or
model literals, and fallback paths that mask a runtime contract failure
with synthesized Reading content are forbidden.
