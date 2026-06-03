# ShiJing Product Overview

> Guide-level product overview for the current ShiJing authority cut.
> Normative rules live under `kernel/**`.

## Identity

- App name (Chinese): 时镜
- App name (English): ShiJing
- App ID: `ai.nimi.apps.shijing`
- One-line: A personal astrology time-mirror companion grounded in
  deterministic BaZi / ganzhi / jieqi / DaYun features, with Runtime AI used
  only for wording and consultation.
- Status: Pre-Alpha, not launched. This authority cut is a no-legacy hard cut.

## Product Shape

ShiJing is organized around four mirrors:

| Mirror | User question | Product role |
| --- | --- | --- |
| 日镜 | What should I notice today? | Daily scan and reflection |
| 月镜 | What does the next 30 days look like? | Rolling near-term calendar and planning surface |
| 年镜 | What are the long-cycle phases and inflection points? | Phase-band and inflection map |
| 时镜 | Can I ask deeper questions? | Session-based consultation grounded in cited readings |

The old View / Focus container model is removed. Users no longer create
observation workspaces, rosters, instruction blocks, or time-window objects.
They maintain at most five active concern tags, and the mirrors project
deterministic astrology features through those tags.

## Root Model Snapshot

```text
NimiUser
  └─ ShiJingSpace
       ├─ self_subject
       ├─ persons[]
       ├─ concern_tags[]
       ├─ event_memories[]
       ├─ plan_items[]
       ├─ readings[]
       ├─ conversations[]
       └─ settings
```

There is no user-space catalog snapshot. Seed concern-tag semantics, mirror
contracts, removed-surface lists, and memory policy are product/spec authority,
not mutable user data.

## Concern Tags

Concern tags are long-running projection intents. They are user-facing text and
system-facing structured context.

Examples:

- `#姻缘`
- `#事业`
- `#健康`
- `#财富`
- `#姻缘 @王某`

The active concern-tag limit is five per ShiJingSpace. Person mentions in tags
resolve to first-class `Person` records when possible. Unresolved mentions stay
plain text and never pretend to carry natal inputs.

## Person, Memory, and Plans

`Person` remains first-class because natal inputs, consent posture, and
validation state cannot be reduced to text. Person is not a customer, contact,
account, conversation owner, event owner, relation object, or lifecycle owner.

Event memories record past facts. Plan items record future intentions. They are
not tags and do not consume the concern-tag quota. If a reading uses memory or
plan references, those references must be cited.

## Astrology Boundary

The deterministic pipeline owns:

- natal canonicalization,
- true-solar correction,
- four pillars,
- cycle snapshots,
- DaYun where required,
- stage labels,
- key windows,
- mirror tendency classes,
- NianJing phase bands and inflection points,
- canonical hashes.

Runtime AI receives deterministic feature snapshots, frozen mirror context, and
allowed wording context. It returns structured wording only. Runtime failure,
parse failure, validation failure, stale input snapshots, and hash mismatch are
typed failures, not fallback readings.

## UI Envelope

The primary IA has exactly four tabs: `日镜`, `月镜`, `年镜`, `时镜`.

Self setup, people, archived tags, memory/plan review, response preferences,
privacy/local data, and diagnostics live in secondary Settings. Every mirror
must surface readiness blockers and deep-link to the relevant settings panel.

NianJing visual authority is phase bands plus inflection points. Scores,
K-line bars, authoritative curves, trend charts, luck charts, and rankable
numbers are forbidden.
