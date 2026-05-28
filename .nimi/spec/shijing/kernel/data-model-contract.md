# SJG-DATA — Data Model Contract

> Concrete shapes for ShiJingSpace and ShiJingCatalog. Typed source under
> `src/domain/**` must mirror these shapes; validators under
> `src/contracts/**` must enforce the invariants below.

## SJG-DATA-01 — SubjectRef

```text
SubjectRef = "self" | { kind: "person", id: string }
```

- `"self"` resolves to `ShiJingSpace.self_subject`.
- The object form requires `kind === "person"` and a non-empty `id` that
  matches an entry in `ShiJingSpace.persons[]`. No other `kind` value is
  permitted.
- `Profile`, `subject`, `target`, `entity`, or other parallel reference
  vocabularies are forbidden.

## SJG-DATA-02 — ShiJingSpace

```text
ShiJingSpace {
  user_id: string                  // owning NimiUser id
  self_subject: SelfSubject
  persons: Person[]                // other-person astrology objects
  relations: Relation[]
  events: Event[]
  views: View[]
  readings: Reading[]
  conversations: Conversation[]
  settings: Settings
}
```

Invariants:

- `ShiJingSpace` is the only root user-data entity for ShiJing.
- `self_subject` is present exactly once.
- `persons[]` may be empty; entries are unique by `id`.
- `views[]` `anchor_subject` must reference `self` or a `persons[].id` that
  exists; this is enforced by `View` invariants below.
- No field named `profile`, `profiles`, `ventures`, `venture_nodes`,
  `huangli_daily`, `reports`, `monthly_reports`, `yearly_reports`,
  `trend_charts`, `luck_scores`, `project_memory`, `long_lines`,
  `global_instructions` may exist on `ShiJingSpace`.

## SJG-DATA-03 — SelfSubject, Person, NatalInputs, BirthLocation

```text
NatalInputs {
  raw_birth_input: RawBirthInput
  birth_datetime_utc: string                       // ISO-8601 UTC instant
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
  latitude: number                                 // -90..90 inclusive
  longitude: number                                // -180..180 inclusive
  iana_time_zone: string                           // IANA TZ id, e.g. "Asia/Shanghai"
  place_name?: string
}

SelfSubject {
  natal_inputs: NatalInputs
  notes?: string
}

Person {
  id: string                                       // ULID/UUID assigned at creation
  display_name: string
  kind: "person"                                   // discriminator stable for future entity kinds
  relation_hint?: string
  natal_inputs: NatalInputs
  consent_state: "owner_recorded" | "subject_consented" | "withheld"
  subject_context?: string                         // optional free-text product context
  notes?: string
}
```

Invariants:

- `Person` is an other-person astrology object. It is not a Nimi account
  and does not own conversations, events, views, focus themes, notification
  settings, or app lifecycle.
- `Person.id` is non-empty and unique inside `ShiJingSpace.persons[]`.
- `Person.kind === "person"` is the only currently admitted entity kind on
  `ShiJingSpace.persons[]`; the field is present so future kinds become an
  explicit contract change rather than silent overload.
- `Person.consent_state` records the data-handling posture for this
  Person's natal data. `owner_recorded` means the owning user recorded the
  data themselves; `subject_consented` means the subject acknowledged the
  recording; `withheld` means the user opted not to claim consent — UI
  may still allow Reading but Astrology output must surface the consent
  status as a caveat.
- `NatalInputs` is **frozen** by Astrology Algorithm Contract v1: the fields
  above are the entire admitted input shape. Adding a field is an Algorithm
  Contract change.
  The internal fields are not "open extension".
- `raw_birth_input` preserves the user-entered evidence used for
  canonicalization. Chinese lunar input MUST carry `lunar_is_leap_month`
  whenever the lunar month is ambiguous.
- `calculation_sex` is a traditional calculation input used only for DaYun
  direction. AI must not infer it. DaYun-dependent Readings fail closed when
  it is `unspecified` (see Algorithm Contract `SJG-ALGO-07`).
- `NatalInputs.birth_precision` is mandatory. It is the authority signal
  for confidence: a value other than `exact` MUST flow into
  `UncertaintyAnnotation.data_gaps` or `confidence` lowering on every
  Reading derived from this NatalInputs.
- `BirthLocation.latitude` and `BirthLocation.longitude` are real-valued
  finite numbers within their respective ranges. `iana_time_zone` is a
  non-empty IANA timezone id; geographic-offset-only strings such as
  `UTC+08` are forbidden.

## SJG-DATA-04 — Relation

```text
Relation {
  id: string
  from_subject: SubjectRef
  to_subject: SubjectRef
  relation_kind: string            // e.g. parent, partner, friend, colleague
  notes?: string
}
```

Invariants:

- Both `from_subject` and `to_subject` must reference subjects present in
  the owning `ShiJingSpace` (either `self` or a `persons[].id`).
- `from_subject` and `to_subject` must not refer to the same subject.

## SJG-DATA-05 — Event

```text
Event {
  id: string
  primary_subject: SubjectRef                       // event observed primarily about this subject
  participants: SubjectRef[]                        // additional subjects co-involved
  occurred_at: string                               // ISO-8601 UTC timestamp
  title: string
  view_refs: string[]                               // ids of Views that should surface this event
  recap?: string                                    // optional structured recap text
  notes?: string
}
```

Invariants:

- `primary_subject` must reference a subject present in the owning
  `ShiJingSpace` (`self` or a `persons[].id`).
- Every entry in `participants[]` must reference a subject present in the
  owning `ShiJingSpace`. `participants[]` MUST NOT include
  `primary_subject` (duplication is forbidden — primary participation is
  encoded by `primary_subject`).
- Entries in `participants[]` are unique by value (no duplicate
  `SubjectRef`).
- Every entry in `view_refs[]` MUST reference an existing
  `ShiJingSpace.views[].id`. Empty `view_refs[]` is allowed (event is not
  scoped to any saved View).
- `occurred_at` is an ISO-8601 UTC timestamp.

## SJG-DATA-06 — View

```text
View {
  id: string
  title: string
  anchor_subject: SubjectRef                   // determines output perspective
  subjects: SubjectRef[]                       // all subjects in observation
  time_scope: "bounded" | "open_ended" | "rolling"
  bounded_range?: { start: string; end: string }    // required iff time_scope == bounded
  rolling_window_days?: number                      // required iff time_scope == rolling
  context_items: ContextItem[]
  instructions: string
  view_memory: ViewMemory                      // AI-maintained context summary
  display_state: "normal" | "pinned" | "archived"
}

ContextItem {
  id: string
  kind: "note" | "document" | "event_ref"
  body: string                                 // for note/document; for event_ref the referenced event id
  created_at: string                           // ISO-8601 UTC timestamp
}

ViewMemory {
  summary: string
  updated_at: string                           // ISO-8601 UTC timestamp
  locked: boolean                              // true => AI must not overwrite
}
```

Invariants:

- `subjects[]` is non-empty.
- `anchor_subject` MUST be present in `subjects[]` (membership check is
  strict; serializations of `self` vs `{ kind: "person", id }` are compared
  as values).
- `time_scope` is exactly one of `bounded`, `open_ended`, `rolling`.
- `time_scope === "bounded"` requires `bounded_range` with valid ISO-8601
  UTC `start <= end`; `rolling_window_days` MUST be absent.
- `time_scope === "rolling"` requires positive integer `rolling_window_days`;
  `bounded_range` MUST be absent.
- `time_scope === "open_ended"` requires both `bounded_range` and
  `rolling_window_days` absent.
- `display_state` is exactly one of `normal`, `pinned`, `archived`.
- `view_memory.locked === true` forbids AI overwrite of `view_memory.summary`
  outside an explicit user-confirmed unlock action.
- View MUST NOT introduce project-management concepts: no tasks, deadlines,
  overdue warnings, dependencies, boards, milestone status, gantt entries,
  or progress percentages.

## SJG-DATA-07 — Reading

```text
Reading {
  id: string
  created_at: string                                 // ISO-8601 UTC timestamp
  scope: "subject" | "view" | "ad_hoc"
  kind: "today" | "period_outlook" | "key_window" | "sign" | "consultation"
  anchor_subject: SubjectRef                         // perspective for output
  subjects: SubjectRef[]                             // subjects in the input scope
  time_window: ReadingTimeWindow
  view_id?: string                                   // required iff scope === "view"
  inputs_summary: InputsSummary                      // frozen snapshot of input context
  output: AstrologyOutput                            // structured astrology output
  uncertainty: UncertaintyAnnotation
}

ReadingTimeWindow {
  mode: "bounded" | "natal"
  start_utc?: string
  end_utc?: string
  basis_time_zone: string
  source: "kind_default" | "view_time_scope" | "user_selected" | "ad_hoc_question"
}
```

Invariants:

- `scope` and `kind` pairing MUST satisfy
  `kernel/tables/reading-kind-scope-matrix.yaml`.
- `time_window` is mandatory for every Reading. `kind === "sign"` requires
  `time_window.mode === "natal"`; all other kinds require
  `time_window.mode === "bounded"` with `start_utc < end_utc`.
- `scope === "view"` requires `view_id` referencing an existing
  `ShiJingSpace.views[].id`. Other scopes MUST omit `view_id`.
- `subjects[]` is non-empty. `anchor_subject` MUST be present in
  `subjects[]`.
- `inputs_summary` is frozen at Reading creation time. Its expiry rule is
  defined by Astrology Contract `SJG-ASTRO-09`.
- `output` shape is defined by Astrology Contract `SJG-ASTRO-04`. Forbidden
  outputs are listed in `SJG-ASTRO-05`.
- `kind === "sign"` MUST have `scope === "subject"` AND
  `anchor_subject === "self"` (consultation-anchor rule is in
  Astrology Contract `SJG-ASTRO-07`).

## SJG-DATA-08 — Conversation

```text
Conversation {
  id: string
  created_at: string                                 // ISO-8601 UTC timestamp
  subject_anchor: SubjectRef
  view_id?: string                                   // optional view binding
  source_reading_id?: string                         // required for AI turns
  turns: ConversationTurn[]
}

ConversationTurn {
  id: string
  role: "user" | "ai"
  body: string
  created_at: string                                 // ISO-8601 UTC timestamp
}
```

Invariants:

- `Conversation` belongs to the owning `ShiJingSpace.user_id`. `Person`
  objects MUST NOT own conversations.
- If `view_id` is set, it MUST reference an existing
  `ShiJingSpace.views[].id`.
- If `source_reading_id` is set, it MUST reference an existing
  `ShiJingSpace.readings[].id`.
- `ConversationTurn.role === "ai"` is allowed only inside a Conversation
  with a resolvable `source_reading_id`. Conversation AI turns clarify or
  explain the source Reading; they MUST NOT be created as an alternate
  astrology output path.
- If `source_reading_id` references a view-scoped Reading, then
  `Conversation.view_id`, when present, MUST equal that Reading's
  `view_id`; a Conversation MUST NOT be bound to a conflicting View.
- A follow-up Conversation launched from Consultation MUST set
  `source_reading_id` to the saved Reading that opened the follow-up.
- A Conversation without `source_reading_id` may persist user-provided
  supplementary context only. It MUST NOT call Runtime AI or persist an AI
  turn until the user creates a Reading and starts a follow-up from it.

## SJG-DATA-09 — Settings

```text
Settings {
  response_preferences: ResponsePreferences
}

ResponsePreferences {
  tone: "neutral" | "warm" | "concise"
  length: "short" | "standard" | "long"
  language: string                                   // BCP-47 tag
  extra_instructions?: string
}
```

Invariants:

- `Settings` has no field named `global_instructions`, `project_memory`,
  `long_line_templates`, `huangli_mode`, `luck_score_curve`, or any other
  removed-surface vocabulary.
- `ResponsePreferences.tone` and `length` are closed enums.

## SJG-DATA-10 — ShiJingCatalog And ViewTemplate

```text
ShiJingCatalog {
  view_templates: ViewTemplate[]
}

ViewTemplate {
  id: string
  title: string
  description: string
  default_time_scope: "bounded" | "open_ended" | "rolling"
  default_instructions: string
  recommended_subjects: ("self" | "person")[]        // pattern, not specific person ids
  category: string                                   // taxonomy bucket
}
```

Invariants:

- `ShiJingCatalog` is product catalog authority. It is shared, not
  per-user, and not stored under `ShiJingSpace`.
- `ViewTemplate.id` is unique inside `ShiJingCatalog.view_templates[]`.
- `recommended_subjects[]` only carries pattern values `"self"` or
  `"person"`. It does not name concrete person ids.
- ViewTemplate authority cannot be mutated through the user-data path.

## SJG-DATA-11 — Removed Field Names

The data model MUST NOT define active fields named `profile`, `profiles`,
`venture`, `ventures`, `venture_node`, `venture_nodes`, `huangli_daily`,
`huangli_mode`, `report`, `reports`, `monthly_report`, `monthly_reports`,
`yearly_report`, `yearly_reports`, `trend_chart`, `trend_charts`,
`luck_score`, `luck_scores`, `luck_curve`, `project_memory`, `long_line`,
`long_lines`, `global_instructions`. Names are listed authoritatively in
`kernel/tables/removed-surface-names.yaml`.
