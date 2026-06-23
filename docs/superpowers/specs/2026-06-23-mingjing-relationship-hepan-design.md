# MingJing Relationship HePan Design

Date: 2026-06-23
Status: approved for design discussion, awaiting user review before implementation planning
Scope: ShiJing relationship HePan for "self + one related person"

## Context

ShiJing already has first-class `Person` records for other-person natal inputs,
consent posture, and display relation labels. The current product does not yet
have a place to generate or display a relationship HePan result, and existing
reading generation paths pass `related_person_refs: []`.

The admitted product shape keeps exactly five primary tabs:

- `rijing`
- `yuejing`
- `nianjing`
- `mingjing`
- `shijing`

Relationship HePan must therefore not become a sixth primary tab, a contact
workspace, a relation graph, or a Person-owned page lifecycle. It must be a
formal Reading generated from deterministic astrology evidence and surfaced
inside the existing MingJing area.

## Product Decision

The first relationship HePan is:

- "self + one related person" only.
- A structure plus timing reading.
- Owned by the MingJing surface.
- Stored as a formal `Reading`.
- Available as source material for ShiJing follow-up consultation.

The flow is:

1. The user records a related person in Settings > Profile > People.
2. The user opens MingJing > Relationship HePan or clicks "HePan with me" from a
   person card.
3. MingJing validates self data, related-person data, consent, precision, and
   method requirements.
4. The user generates a relationship HePan Reading.
5. The result displays relationship structure and current-period timing windows.
6. The user can send the generated Reading to ShiJing and continue asking about
   it in a grounded conversation.

## Non-Goals

This design does not admit:

- A sixth primary tab.
- Arbitrary two-person HePan where neither side is `self`.
- Multi-person relationship graphs.
- CRM, customer, client, consultant, booking, commerce, or contact-management
  vocabulary.
- Compatibility shims, degraded schemas, or legacy migration behavior.
- Percent scores, ranking, "match rate", deterministic fate claims, or trend
  curves.
- Runtime-AI-only astrology calculation.
- A Person-owned conversation, Reading lifecycle, event lifecycle, plan
  lifecycle, or settings lifecycle.

## Authority Admission

Implementation must begin with a kernel authority update. The required authority
changes are:

- `product-contract.md`: clarify that relationship HePan is a MingJing-owned
  Reading mode, not a new product surface.
- `data-model-contract.md`: admit a relationship natal scope and require exactly
  one related person for that scope.
- `astrology-contract.md`: admit the relationship HePan output shape and
  forbidden outputs.
- `algorithm-contract.md`: define the deterministic relationship evidence that
  Runtime AI may word.
- `ia-contract.md`: place Relationship HePan as a MingJing secondary mode and
  keep People as a data-entry surface only.
- `tables/mirror-kind-scope-matrix.yaml`: allow `mingjing` +
  `relationship_natal`.
- `tables/mirror-output-contract.yaml`: add the relationship HePan output
  contract.

## Data Contract

Add a new scope:

```ts
export interface RelationshipNatalMirrorScope {
  readonly kind: 'relationship_natal';
  readonly related_person_ref: { readonly kind: 'person'; readonly id: string };
  readonly anchor_year: number;
  readonly basis_time_zone: string;
}
```

The valid Reading shape is:

```ts
{
  mirror_kind: 'mingjing',
  mirror_scope: {
    kind: 'relationship_natal',
    related_person_ref: { kind: 'person', id: string },
    anchor_year: number,
    basis_time_zone: string,
  },
  primary_subject_ref: 'self',
  related_person_refs: [{ kind: 'person', id: string }],
  concern_tag_refs: [],
}
```

Validation requirements:

- `related_person_ref` must resolve to an existing `Person`.
- `related_person_refs` must contain exactly the same single person ref as the
  scope.
- `primary_subject_ref` remains `self`.
- `concern_tag_refs` is empty for the base HePan reading.
- `anchor_year` follows the same supported ephemeris range as MingJing natal
  anchor years.
- Failed generation is a typed `ReadingGenerationFailure`, never a persisted
  Reading.

## Output Contract

Add `MingJingRelationshipMirrorOutput` as a distinct MingJing output variant:

```ts
export interface MingJingRelationshipMirrorOutput {
  readonly mirror_kind: 'mingjing';
  readonly output_kind: 'relationship_hepan';
  readonly relationship_subject: {
    readonly related_person_ref: { readonly kind: 'person'; readonly id: string };
    readonly display_name_snapshot: string;
  };
  readonly summary: string;
  readonly structure: {
    readonly baseline_pattern: string;
    readonly attraction_and_support: string;
    readonly friction_and_misread: string;
    readonly communication_rhythm: string;
    readonly boundary_advice: string;
  };
  readonly timing: {
    readonly anchor_year: number;
    readonly windows: readonly RelationshipTimingWindow[];
  };
  readonly practice: {
    readonly do: readonly string[];
    readonly avoid: readonly string[];
    readonly conversation_prompts: readonly string[];
  };
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
  readonly citations: readonly MirrorCitation[];
}

export interface RelationshipTimingWindow {
  readonly start_date: string;
  readonly end_date: string;
  readonly nature: 'supportive' | 'steady' | 'watch' | 'blocked' | 'turning';
  readonly driver_refs: readonly string[];
  readonly summary: string;
}
```

Output validation must reject:

- Score-like fields.
- Trend charts.
- Ranking fields.
- Freeform unsupported fields.
- Empty success payloads.
- Missing citations.
- Timing windows without deterministic `driver_refs`.
- Outputs that cite a different person from the scope.

## Deterministic Algorithm Boundary

Relationship HePan requires deterministic evidence before Runtime AI wording.
The minimum evidence set is:

- Self natal chart.
- Related-person natal chart.
- Pairwise branch interactions across day, month, year, and hour positions.
- Day-master element relation.
- Ten-god relationship direction where available.
- Yong-shen and ji-shen complement or depletion direction.
- Current `anchor_year` timing windows from both subjects' DaYun and annual
  markers.
- Uncertainty inputs for missing precision, missing location, withheld consent,
  and related-person incompleteness.

The method engine may expose this evidence as a relationship-specific section
inside the feature snapshot. Runtime AI receives this evidence as read-only
prompt context. Runtime AI must not compute pillars, DaYun, branch relations,
timing windows, yong-shen, ten-god direction, or confidence.

Fail-close rules:

- If self natal inputs are invalid, fail with the existing self blocker.
- If related-person natal inputs are invalid, fail with
  `incomplete_related_person_natal_inputs`.
- If related-person consent is `withheld`, fail for HePan generation.
- If the active method requires exact birth time and either subject lacks it,
  fail with the relevant precision blocker.
- If deterministic relationship evidence cannot be built, fail with
  `pipeline_stage_failed`.
- If Runtime AI fails or returns invalid output, fail with `runtime_ai_failed`.

## UI Design

MingJing gains a secondary mode control:

- `本命`
- `关系合盘`

The Relationship HePan mode contains:

- Person selector.
- Readiness panel showing self readiness, related-person readiness, consent,
  birth precision, and method profile.
- Generate action.
- Latest generated HePan result for the selected person.
- A "continue in ShiJing" action that imports the generated Reading id into the
  existing ShiJing source-reading bus.

The result view has two main sections:

- Relationship Structure:
  - baseline pattern
  - attraction and support
  - friction and misread
  - communication rhythm
  - boundary advice
- Timing Windows:
  - year anchor
  - dated windows
  - nature label
  - evidence drawer access

People settings remains a data-entry surface. Person cards may expose a small
"HePan with me" action that navigates to MingJing Relationship HePan and
preselects that person. The People surface must not display the HePan result.

ShiJing remains consultation only. It can cite a relationship HePan Reading and
continue the conversation, but it cannot perform the first relationship
calculation from a raw person selection.

## Implementation Waves

Wave 1: Authority Admission

- Update kernel authority and tables.
- Add contract language for relationship HePan ownership and forbidden outputs.
- No source-consuming closeout until source contracts catch up.

Wave 2: Domain And Validators

- Add `RelationshipNatalMirrorScope`.
- Add `MingJingRelationshipMirrorOutput`.
- Update mirror-scope, mirror-output, reading, and space validators.
- Update fixtures and contract tests.

Wave 3: Deterministic Relationship Evidence

- Add relationship evidence to the method-engine path.
- Build self plus one related-person evidence.
- Add relationship branch interactions, element/ten-god direction, yong-shen
  complement/depletion, and current-period window overlap.
- Add deterministic tests and golden cases.

Wave 4: Runtime AI Contract

- Update prompt request builder.
- Update runtime output parsing and validation.
- Add forbidden-field tests and parse-failure tests.
- Ensure deterministic structural output is never persisted as fallback.

Wave 5: UI Integration

- Add MingJing secondary mode.
- Add person selector, readiness blockers, generation action, result view, and
  evidence drawer wiring.
- Add person-card entry from People.
- Add ShiJing import action for generated relationship HePan readings.

Wave 6: Verification Closeout

- Run contract tests for scope/output/reading/space.
- Run deterministic algorithm tests.
- Run runtime adapter tests.
- Run UI behavior tests for MingJing, People, and ShiJing import.
- Run `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm run build`, and
  `(cd src-tauri && cargo check)` if the wave touches Tauri-bound code.

## Acceptance Criteria

- A user can select exactly one related person and generate a relationship
  HePan Reading from MingJing.
- The persisted Reading contains the expected `relationship_natal` scope and
  matching `related_person_refs`.
- The output has both structure and timing sections.
- The result can be imported into ShiJing and used as cited source material for
  follow-up conversation.
- People remains a data-entry and launch surface only.
- Withheld consent, incomplete natal data, invalid precision, runtime failure,
  validation failure, and hash/freshness mismatch all fail closed.
- No score, match percentage, trend chart, relation graph, CRM surface, or
  Runtime-AI-only astrology result is admitted.
