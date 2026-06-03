# SJG-DATA - Data Model Contract

## SJG-DATA-01 - SubjectRef

```text
SubjectRef = "self" | { kind: "person", id: string }
```

`"self"` resolves to `ShiJingSpace.self_subject`. The object form must resolve
to an entry in `ShiJingSpace.persons[]`. No other subject reference vocabulary
is admitted.

## SJG-DATA-02 - ShiJingSpace

```text
ShiJingSpace {
  user_id: string
  self_subject: SelfSubject
  persons: Person[]
  concern_tags: ConcernTag[]
  event_memories: EventMemory[]
  plan_items: PlanItem[]
  readings: Reading[]
  conversations: Conversation[]
  settings: Settings
}
```

Invariants:

- `ShiJingSpace` is the only root user-data entity for ShiJing.
- `self_subject` is present exactly once.
- `persons[]`, `concern_tags[]`, `event_memories[]`, `plan_items[]`,
  `readings[]`, and `conversations[]` are unique by `id`.
- At most five `ConcernTag` entries may have `status === "active"`.
- No catalog snapshot, View data, Relation data, report data, trend chart data,
  luck score data, CRM data, or project-management data may exist on
  `ShiJingSpace`.

## SJG-DATA-03 - SelfSubject, Person, NatalInputs

```text
NatalInputs {
  raw_birth_input: RawBirthInput
  birth_datetime_utc: string
  birth_precision: "exact" | "rough_day" | "rough_month" | "rough_year" | "unknown"
  calendar_system: "gregorian" | "lunar_chinese"
  birth_location: BirthLocation
  calculation_sex: "male" | "female" | "unspecified"
  cultural_marker?: "natal_yang" | "natal_yin" | "unspecified"
  notes?: string
}

RawBirthInput {
  calendar_system: "gregorian" | "lunar_chinese"
  local_date_text: string
  local_time_text?: string
  lunar_year?: number
  lunar_month?: number
  lunar_day?: number
  lunar_is_leap_month?: boolean
  place_text?: string
}

BirthLocation {
  latitude: number
  longitude: number
  iana_time_zone: string
  place_name?: string
}

SelfSubject {
  natal_inputs: NatalInputs
  notes?: string
}

Person {
  id: string
  display_name: string
  kind: "person"
  natal_inputs: NatalInputs
  consent_state: "owner_recorded" | "subject_consented" | "withheld"
  relation?: string
  notes?: string
}
```

Invariants:

- `Person` is an other-person astrology object only.
- Person does not own conversations, event memories, plan items, readings,
  settings, relations, notifications, or lifecycle.
- `relation` is an OPTIONAL free-text display label for how the subject relates
  to the user (母亲 / 合伙人). It is a presentation hint only: bounded to 40
  characters, MUST NOT be parsed into a relationship graph, MUST NOT drive
  astrology calculation, hashing, or retrieval, and MUST NOT become a
  relational / CRM entity. It is the single relationship-ish field admitted on
  Person; structured relation graphs remain forbidden.
- Person fields named `relation_hint`, `subject_context`, `client`, `customer`,
  or near-equivalent CRM vocabulary are forbidden (the bounded `relation`
  label above is the one admitted exception).
- `NatalInputs` is the complete admitted calculation input shape.
- Non-exact birth precision must lower confidence or fail closed according to
  `SJG-ALGO-10`.
- DaYun-dependent readings fail closed when `calculation_sex` is
  `unspecified`.

## SJG-DATA-04 - ConcernTag and MentionRef

```text
ConcernTag {
  id: string
  label: string
  status: "active" | "archived"
  sort_order: number
  parsed_topics: string[]
  mention_refs: MentionRef[]
  prompt_text: string
  created_at: string
  updated_at: string
}

MentionRef {
  token: string
  resolved_subject_ref?: SubjectRef
  unresolved_text?: string
}
```

Invariants:

- `label` is user-facing text.
- `parsed_topics[]` comes from `#topic` tokens.
- `@person` tokens resolve to `SubjectRef` only when a matching Person exists
  or is explicitly created.
- Unresolved mentions remain text and must not fake a Person reference.
- `prompt_text` is Runtime-AI wording context only. It must not affect
  deterministic astrology calculation, tendency class derivation, phase band
  derivation, or canonical hashing except as part of the frozen wording context
  snapshot.
- Archived tags do not enter default mirror generation.

## SJG-DATA-05 - EventMemory

```text
EventMemory {
  id: string
  occurred_at: string
  body: string
  person_refs: SubjectRef[]
  concern_tag_refs: string[]
  source: "manual" | "rijing" | "yuejing" | "nianjing" | "shijing"
  admissible_use: "record_only" | "eligible_for_retrieval"
  created_at: string
  updated_at: string
}
```

Invariants:

- EventMemory records a past fact.
- `occurred_at`, `created_at`, and `updated_at` are ISO-8601 UTC instants.
- `person_refs[]` and `concern_tag_refs[]` must resolve inside the owning
  `ShiJingSpace`.
- EventMemory has no `view_refs`, `recap`, task status, due date, priority,
  dependency, progress, or workflow fields.
- If used by a Reading, it must be cited by id.

## SJG-DATA-06 - PlanItem

```text
PlanItem {
  id: string
  planned_for: string
  body: string
  person_refs: SubjectRef[]
  concern_tag_refs: string[]
  source: "manual" | "yuejing" | "shijing"
  created_at: string
  updated_at: string
}
```

Invariants:

- PlanItem records a future intention or goal for mirror analysis.
- PlanItem is not a task. It must not have status, due/overdue, priority,
  dependency, progress, assignee, board, milestone, Gantt, or workflow fields.
- If used by a Reading, it must be cited by id.

## SJG-DATA-07 - Reading

```text
Reading {
  id: string
  created_at: string
  mirror_kind: "rijing" | "yuejing" | "nianjing" | "shijing"
  mirror_scope: MirrorScope
  primary_subject_ref: "self"
  related_person_refs: SubjectRef[]
  concern_tag_refs: string[]
  cited_reading_ids: string[]
  cited_event_memory_refs: string[]
  cited_plan_item_refs: string[]
  inputs_summary: InputsSummary
  output: MirrorOutput
  uncertainty: UncertaintyAnnotation
}
```

Invariants:

- `Reading` is the only persisted astrology output entity.
- `primary_subject_ref` is always `self` for RiJing, YueJing, and NianJing.
- Related persons enter only through concern tags, plan items, or memory refs.
- The old `anchor_subject`, `subjects[]`, `time_window`, `scope`, `kind`,
  `view_id`, and `ad_hoc_context` fields are removed.
- `mirror_kind` / `mirror_scope` must satisfy
  `tables/mirror-kind-scope-matrix.yaml`.
- `output` must satisfy `tables/mirror-output-contract.yaml`.
- `cited_reading_ids[]` is empty except for ShiJing consultation readings,
  where it mirrors `mirror_scope.source_reading_ids[]` and the output
  citation set.
- Cited memory/plan refs must resolve inside the owning `ShiJingSpace`.
- Failed generation is a transient `ReadingGenerationFailure`, not a persisted
  `Reading`.

```text
ReadingGenerationFailure {
  kind: "runtime_ai_failed" | "pipeline_stage_failed" | "validation_failed" | "stale_inputs" | "hash_mismatch"
  mirror_kind: Reading.mirror_kind
  mirror_scope: MirrorScope
  stage?: string
  detail?: string
}
```

## SJG-DATA-08 - MirrorScope

```text
MirrorScope =
  | { kind: "daily"; date: string; basis_time_zone: string }
  | { kind: "rolling_30_day"; start_date: string; end_date: string; basis_time_zone: string }
  | { kind: "long_horizon"; start_date: string; end_date: string; basis_time_zone: string }
  | { kind: "consultation"; source_reading_ids: string[]; basis_time_zone: string; question_window?: { start_date: string; end_date: string } }
```

Invariants:

- Dates are local civil dates in `basis_time_zone`.
- `rolling_30_day` covers exactly 30 local dates inclusive of `start_date`.
- `long_horizon` uses only the admitted NianJing windows in
  `tables/mirror-kind-scope-matrix.yaml`.
- `consultation.source_reading_ids[]` is non-empty for Runtime AI turns.
- `consultation.question_window`, when present, is a transient question
  constraint and not a saved reusable time container.

## SJG-DATA-09 - InputsSummary

```text
InputsSummary {
  captured_at: string
  contract_version: "SJG-ASTRO-v1"
  algorithm_contract_version: "SJG-ALGO-v1"
  method_profile: AstrologyMethodProfile
  mirror_context_snapshot: MirrorContextSnapshot
  input_hash: string
  feature_snapshot_hash: string
  feature_snapshot: AstrologyFeatureSnapshot
}

MirrorContextSnapshot {
  mirror_kind: Reading.mirror_kind
  mirror_scope: MirrorScope
  active_concern_tags: ConcernTagSnapshot[]
  resolved_person_refs: SubjectRef[]
  cited_event_memory_refs: string[]
  cited_plan_item_refs: string[]
  response_preferences_hash: string
}

ConcernTagSnapshot {
  id: string
  label: string
  status: "active" | "archived"
  sort_order: number
  parsed_topics: string[]
  mention_refs: MentionRef[]
  prompt_text_hash: string
  resolved_person_refs: SubjectRef[]
  captured_at: string
}
```

Invariants:

- InputsSummary is frozen at Reading creation time.
- Source-of-truth changes after creation must not mutate an existing
  `Reading.inputs_summary`.
- `ConcernTagSnapshot` captures exactly the fields above. It includes archived
  status only for historical evidence; archived tags are not eligible for new
  default mirror generation.
- `prompt_text_hash` and `response_preferences_hash` use the canonical hashing
  rules in `SJG-ALGO-12`.
- `ViewSnapshot` is removed and must not appear in new inputs summaries.

## SJG-DATA-10 - Conversation

```text
Conversation {
  id: string
  created_at: string
  source_reading_ids: string[]
  turns: ConversationTurn[]
}

ConversationTurn {
  id: string
  role: "user" | "ai"
  body: string
  cited_reading_ids: string[]
  cited_event_memory_refs: string[]
  cited_plan_item_refs: string[]
  created_at: string
}
```

Invariants:

- Person does not own conversations.
- Before any AI turn is appended, the owning Conversation must have at least
  one resolvable `source_reading_ids[]` entry.
- AI turns clarify cited readings and must not become alternate astrology
  output entities.
- AI turns must disclose cited reading, event memory, and plan item refs when
  those inputs influence the answer.

## SJG-DATA-11 - Settings

```text
Settings {
  response_preferences: ResponsePreferences
}

ResponsePreferences {
  tone: "neutral" | "warm" | "concise"
  length: "short" | "standard" | "long"
  language: string
  extra_instructions?: string
}
```

Invariants:

- Settings has no `global_instructions`, `project_memory`, catalog snapshot,
  workflow, task, report, trend chart, or luck-score fields.
- Settings UI may expose Self, People, Concern Tags, Memory & Plans, Response
  Preferences, Privacy/Local Data, and Diagnostics, but these are secondary
  settings surfaces, not root data entities beyond the fields above.

## SJG-DATA-12 - Removed Active Entities

The data model must not define active `Relation`, `Event`, `View`,
`ViewTemplate`, `ShiJingCatalog`, `CurrentObservationTarget`, report, trend
chart, luck score, CRM, or project-management entities or fields.
