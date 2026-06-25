# SJG-IA - Information Architecture Contract

## SJG-IA-01 - Exactly Six Primary Tabs

The ShiJing renderer exposes exactly six primary tabs, in this order. The order
follows a widening 命理 horizon: day → month → decade-horizon → whole-life natal
→ relationship → consultation.

| Order | Tab id | Chinese label | English anchor |
| --- | --- | --- | --- |
| 1 | `rijing` | `日镜` | Daily Mirror |
| 2 | `yuejing` | `月镜` | Monthly Mirror |
| 3 | `nianjing` | `年镜` | Yearly Mirror |
| 4 | `mingjing` | `命镜` | Destiny Mirror |
| 5 | `hejing` | `合镜` | Relationship Mirror |
| 6 | `shijing` | `问镜` | Consultation Mirror |

`mingjing` (命镜, order 4) is the self natal projection surface; see SJG-IA-08.
`hejing` (合镜, order 5) is the relationship analysis workbench for self plus one
selected Person. It sits after self natal projection and before `shijing`, which
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
ranges. Relationship analysis is not a MingJing secondary mode; it belongs to
HeJing (SJG-IA-09). A method route that does not support relationship evidence
must fail closed through route/support validation rather than falling back to
another method or asking Runtime AI to compensate.

The implemented QiZheng SiYu / GuoLao route renders a natal-only route directly
from `QizhengSiyuEvidence.self_subject`: ascendant and day/night basis, 七政四余
body placements, 十二宫 distribution, 二十八宿 interval labels, and a
`qizheng_siyu_natal_brief` reading over deterministic star-guidance targets. It
requires exact birth time plus resolved birth location/timezone. Relationship
analysis is not supported by this route until dedicated self-plus-person star
evidence is admitted.

MingJing admits no relationship secondary mode. It is the self natal projection
surface.

## SJG-IA-09 - 合镜 Relationship Workbench

`hejing` (合镜) is an independent primary tab for `self + one Person`
relationship analysis. It sits at the same primary-navigation level as RiJing,
YueJing, NianJing, MingJing, and ShiJing consultation.

HeJing renders a modular relationship workbench rather than a long report:

- relationship type and object selection;
- relationship basis, current phase, information completeness, and future hint;
- relationship indices presented as product diagnostics, not fate claims;
- self/other structure and shared convergence/friction areas;
- interaction language and practical relationship advice;
- future windows and relationship review records.

HeJing must not become a Relation entity, relation graph, contact/customer
workspace, project-management surface, or Person-owned lifecycle. People remains
a secondary data-entry surface; HeJing may select a Person but does not make
Person own generated output or conversations.
