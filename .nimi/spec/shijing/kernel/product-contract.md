# SJG-PROD - Product Contract

## SJG-PROD-01 - Single Product Authority

ShiJing product authority is `.nimi/spec/shijing/kernel/**`. Guide documents
under `.nimi/spec/shijing/*.md` must not contradict kernel authority.

## SJG-PROD-02 - Embedded App

ShiJing is a Nimi-embedded app. Nimi owns account identity, login, runtime
access, and platform safety boundaries. ShiJing owns only app-local astrology
data under `ShiJingSpace`.

## SJG-PROD-03 - Personal Time-Mirror Product

ShiJing is a personal astrology time-mirror, natal-companion, and relationship
insight product. It is organized by six primary tabs: RiJing, YueJing,
NianJing, MingJing, HeJing, and ShiJing Consultation Mirror (`问镜`). It is not a
CRM, consultant workspace, report builder, project manager, batch import/export
tool, relation graph, or free-form context container.

## SJG-PROD-04 - Six Primary Tabs

The product has exactly six primary tabs:

- RiJing (`日镜`) for daily reflection.
- YueJing (`月镜`) for a rolling 30-day calendar.
- NianJing (`年镜`) for long-horizon phase bands and inflection points.
- MingJing (`命镜`) for self natal projection.
- HeJing (`合镜`) for self-plus-one-person relationship structure, interaction
  language, future windows, and relationship review.
- ShiJing Consultation Mirror (`问镜`) for session-based consultation grounded in
  cited readings.

## SJG-PROD-05 - Concern Tags Replace View / Focus

Long-running projection intent is expressed only through `ConcernTag`.
View, Focus, ViewTemplate, roster, context item, instruction, view memory, and
user-facing View time-window concepts are removed active surfaces.

At most five concern tags may be active in one `ShiJingSpace`.

## SJG-PROD-06 - Person Is First-Class But Not a Surface Owner

`Person` is first-class for natal inputs, validation, and consent posture.
Person is not a customer/contact/account and does not own conversations,
events, memories, plans, settings, relationships, notifications, or lifecycle.

## SJG-PROD-06A - HeJing Owns Relationship Analysis UX

HeJing is the primary product surface for exactly `self + one Person`
relationship analysis. It may display relationship structure, interaction
language, future windows, relationship advice, and relationship event review.
It must not become a relation graph, contact workspace, consultant workflow,
Person-owned lifecycle, or CRM-like surface.

Relationship analysis output still obeys the one-`Reading` rule when it becomes
persisted output. This UI admission does not create a new persisted Relation
entity or a parallel report entity.

## SJG-PROD-07 - Event Memory and Plan Item Separation

Past facts are `EventMemory`. Future intentions are `PlanItem`. They are not
tags and do not consume concern-tag quota. `PlanItem` must not become a task,
deadline, project, workflow, priority, dependency, or progress object.

## SJG-PROD-08 - One Reading Entity

`Reading` is the only persisted astrology output entity. Daily cards, reports,
monthly/yearly reports, trend charts, luck-score records, and parallel reading
entities are forbidden.

## SJG-PROD-09 - No User-Space Catalog Truth

`ShiJingSpace` must not contain a catalog snapshot. Built-in concern-tag
semantics, mirror matrices, output schemas, memory policy, and removed names
are product/spec authority, not mutable user data.

## SJG-PROD-10 - Runtime Boundary

AI access uses the Nimi runtime through `@nimiplatform/sdk/runtime` only.
Runtime AI is wording and consultation over deterministic feature snapshots.
It must not calculate pillars, DaYun, true solar time, stage labels, key
windows, YueJing tendency classes, NianJing phase bands, or NianJing
inflection points.

## SJG-PROD-11 - No Pseudo-Success

ShiJing must not synthesize Reading content as fallback for runtime failure,
parse failure, missing typed output, hash mismatch, stale inputs, missing
natal data, or pipeline failure. Reading absence is a typed failure.

## SJG-PROD-12 - Workspace Preferences Single Name

The only workspace-level wording preference field is
`Settings.response_preferences`. `global_instructions`, `project_memory`, and
long-line-style settings are forbidden.

## SJG-PROD-13 - No Algorithm Stub

No canned horoscope text, placeholder Reading content, prompt-only astrology
calculation, randomized fortune text, or Runtime-AI-only substitute may ship as
Reading content. Executable implementation must prove it follows
`algorithm-contract.md`.

## SJG-PROD-14 - Standard Shell Boundary

ShiJing desktop shells must consume Nimi standard shell capabilities for
platform primitives including app-scoped storage, path resolution, shell UI,
Runtime bridge, OAuth, logging, local assets, and host window focus/drag.

ShiJing app-local shell commands may exist only for product primitives that are
genuinely owned by ShiJing. App-local commands must not redefine standard
storage roots, storage read/write/remove operations, shell UI primitives, or
host-owned platform paths.
