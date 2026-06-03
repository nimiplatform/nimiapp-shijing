# SJG-IA - Information Architecture Contract

## SJG-IA-01 - Exactly Four Primary Tabs

The ShiJing renderer exposes exactly four primary tabs, in this order:

| Order | Tab id | Chinese label | English anchor |
| --- | --- | --- | --- |
| 1 | `rijing` | `日镜` | Daily Mirror |
| 2 | `yuejing` | `月镜` | Monthly Mirror |
| 3 | `nianjing` | `年镜` | Yearly Mirror |
| 4 | `shijing` | `时镜` | Consultation Mirror |

No fifth primary tab is admitted.

## SJG-IA-02 - Removed Primary Tabs

The following must not appear as primary tabs:

- `today`
- `views`
- `consultation`
- `me`
- `history`
- `huangli`
- `reports`
- `customers`
- `clients`
- `trends`
- `consultants`

Old labels `今日`, `关注`, `问时镜`, and `我` are not active primary labels.

## SJG-IA-03 - No CurrentObservationTarget

CurrentObservationTarget is removed. Mirror readings are self-anchored by
default. Related persons are included only through resolved concern tags,
plan items, or memory references.

## SJG-IA-04 - Secondary Settings

Removing `我` as a primary tab requires a complete secondary Settings surface.

Settings must include:

- Self;
- People;
- Concern Tags;
- Memory & Plans;
- Response Preferences;
- Privacy / Local Data;
- Diagnostics.

Settings is reached from a global account/settings button and from typed
readiness blockers.

The seven surfaces are grouped into ordered sub-pages inside the Settings
surface. The grouping is presentation-only: every surface appears in exactly
one page (the union is total and disjoint), and all seven remain required.

| Order | Page id | Chinese label | Surfaces |
| --- | --- | --- | --- |
| 1 | `profile` | `档案` | Self, People |
| 2 | `memory` | `发生过的事` | Memory & Plans |
| 3 | `concerns` | `关注` | Concern Tags |
| 4 | `settings` | `设置` | Response Preferences, Privacy / Local Data, Diagnostics |

Concern Tags are a forward-looking, cross-cutting lens (low-frequency
configuration), so they own a dedicated `concerns` page. Memory & Plans is
timeline content anchored to when an event occurred: its primary entry and
display live on the time mirrors (RiJing event input, YueJing day panel,
NianJing phase/inflection recorder). The `memory` settings page is the
full-life archive and backfill entry for events that fall outside any open
mirror window. It must remain a record list, not a View-like workspace
(see SJG-IA-06).

Downstream source must expose one ordered page constant matching this table.
Renderer code must consume that constant rather than hardcoding a parallel page
list (see SJG-IA-07).

## SJG-IA-05 - Readiness and Failure Routing

Every mirror surface must display typed blockers and recovery routes for:

- missing self natal inputs;
- invalid self natal inputs;
- unresolved person mention;
- incomplete related-person natal inputs;
- stale reading inputs;
- runtime AI failure;
- persistence failure;
- hash mismatch.

## SJG-IA-06 - Concern Tag Controls

Concern tag creation, archive/unarchive, mention resolution, and active-count
feedback may appear inside mirror filters and Settings. They must not become a
standalone View-like workspace, roster editor, or time-window builder.

## SJG-IA-07 - Routing Hint

Downstream source must expose one ordered IA constant matching this contract.
Renderer code must consume that contract rather than hardcoding a parallel
primary tab list.
