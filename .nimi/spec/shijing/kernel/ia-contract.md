# SJG-IA - Information Architecture Contract

## SJG-IA-01 - Exactly Five Primary Tabs

The ShiJing renderer exposes exactly five primary tabs, in this order. The order
follows a widening 命理 horizon: day → month → decade-horizon → whole-life natal
→ consultation.

| Order | Tab id | Chinese label | English anchor |
| --- | --- | --- | --- |
| 1 | `rijing` | `日镜` | Daily Mirror |
| 2 | `yuejing` | `月镜` | Monthly Mirror |
| 3 | `nianjing` | `年镜` | Yearly Mirror |
| 4 | `mingjing` | `命镜` | Destiny Mirror |
| 5 | `shijing` | `时镜` | Consultation Mirror |

No sixth primary tab is admitted. `mingjing` (命镜, order 4) was admitted as a
deliberate IA redesign in this contract revision; see SJG-IA-08. It is inserted
after `nianjing` (whole-life natal > decade horizon) and before `shijing`, which
remains the final consultation surface.

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

## SJG-IA-08 - 命镜 Method-Routed Surface

`mingjing` (命镜) is the whole-life method-routed surface. Unlike the four time
mirrors, it is anchored to the subject's birth chart rather than a rolling mirror
window. Its first authority layer is the selected MingJing route from
SJG-ALGO-18, resolved by `Settings.method_profile_id`. The tab remains one
primary product surface; method switching changes the internal route, modules,
evidence model, and fail-close state.

The implemented BaZi route renders a deterministic natal projection
(SJG-ALGO-16) directly from the engine — without a Reading or runtime-AI wording
pass — covering:

- 八字排盘: four pillars · 十神 · 藏干 · 纳音 · 十二长生 · 空亡 · 五行分布;
- 原局格局: 旺衰 · 格局 · 用神/喜忌 · 合冲刑害破;
- 大运结构: the full DaYun sequence (every step, not only the current period);
- 流年关键窗口: salient future-year windows (not a year-by-year ledger).

命镜 is self-anchored (SJG-IA-03) and surfaces the SJG-IA-05 readiness blockers.
Each route owns its own additional readiness requirements. The implemented BaZi
route requires exact birth precision and a specified calculation sex (DaYun,
SJG-ALGO-07); otherwise it shows the matching typed blocker and routes to the
Self profile. A selected route whose status is `not_implemented` shows a typed
`mingjing_route_unavailable` blocker and must not render another method's route.

The 命镜 AI 解读 reading kind (命局核心特点, 长期阶段策略) and 历史事件验证 (event overlay
on the deterministic route timeline) are admitted separately and never recompute
the deterministic route projection.

The implemented Ziwei route renders a natal-only route directly from
`ZiweiEvidence.self_subject`: 命宫 / 身宫 / 五行局 / 命主身主 summary, twelve-palace
astrolabe, and a `ziwei_natal_brief` reading over deterministic decadal palace
ranges. Ziwei Relationship HePan is not admitted; selecting
`relationship_hepan` under the Ziwei route must fail closed through
`mingjing_route_support` rather than falling back to BaZi or asking Runtime AI
to compensate.

MingJing admits two secondary modes: `benming` and `relationship_hepan`.
`relationship_hepan` remains inside MingJing and may be launched from a Person
card, but People remains a data-entry surface and does not own generated
results.
