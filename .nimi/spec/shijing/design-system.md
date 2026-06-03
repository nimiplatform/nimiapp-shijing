# ShiJing Design System Guide

> Guide-level UI direction for the four-mirror product. Kernel contracts remain
> normative.

## Design Posture

ShiJing should feel like a calm personal time instrument. The user should see
time, concern tags, evidence, and recovery paths, not object administration.

The UI must make complex astrology infrastructure legible without asking the
user to configure the infrastructure.

## Primary Navigation

Primary navigation has exactly four entries:

- 日镜
- 月镜
- 年镜
- 时镜

Settings is secondary. There is no primary `我`, `关注`, History, report,
customer, relation, or trend surface.

## Global Layout

Every screen should expose:

- current mirror identity,
- active concern-tag context where relevant,
- readiness or failure state when blocking,
- evidence/citation access for generated readings,
- Settings access.

Desktop may use a side rail or top rail. Mobile may use a bottom/tab rail.
The four primary mirrors must remain equally discoverable while allowing 日镜
to be the default landing surface.

## Concern Tags

Concern tags appear as compact chips or filters.

Required controls:

- active count out of five,
- create custom tag,
- archive/unarchive,
- resolve person mention,
- show unresolved mention state.

Forbidden controls:

- roster editor,
- context-item editor,
- instruction workspace,
- time-window builder,
- task/project controls.

## Settings

Settings contains:

- Self,
- People,
- Concern Tags,
- Memory & Plans,
- Response Preferences,
- Privacy / Local Data,
- Diagnostics.

These are grouped into three ordered sub-pages, navigated by a segmented tab
bar at the top of the Settings surface:

- 档案 — Self, People (identity and natal data, maintained once);
- 关注与记忆 — Concern Tags, Memory & Plans (ongoing tracked content);
- 设置 — Response Preferences, Privacy / Local Data, Diagnostics (app
  preferences and system / data hygiene).

The grouping is presentation-only; all seven surfaces remain required and each
appears in exactly one page.

Settings is opened from a global account/settings button and from readiness
blockers. It is not a primary product tab.

## RiJing

RiJing is scan-first:

- date and generation state,
- daily overview,
- active concern projections,
- evidence/citation drawer,
- record event action,
- ask ShiJing action.

RiJing should avoid report-like long pages. It should read like a compact daily
instrument.

## YueJing

YueJing is a rolling 30-day calendar:

- date cells,
- concern-tag filter,
- tendency legend,
- selected date detail,
- future PlanItem entry,
- past EventMemory entry,
- evidence/citation drawer,
- ask ShiJing action.

Tendency classes are visual categories, not scores:

- supportive,
- steady,
- watch,
- blocked,
- turning.

The UI must not imply rankability across days.

## NianJing

NianJing shows long-horizon phases and inflections:

- one phase lane per active concern tag,
- phase bands,
- inflection markers,
- structured explanation drawer,
- ask ShiJing action.

Authoritative visual data is only phase bands and inflection points.

Forbidden as authoritative NianJing UI:

- K-line bars,
- numeric trend curves,
- luck scores,
- rankable numbers,
- score aggregation,
- trend chart surface.

Any decorative interpolation must not be persisted, cited, or treated as data.

## ShiJing

ShiJing is a session-based consultation surface:

- session list,
- conversation thread,
- composer,
- citation drawer,
- imported readings,
- cited memory/plan references.

AI answers must display their cited readings. Creating an EventMemory from a
conversation requires explicit user confirmation.

## Evidence and Failure

Every generated result needs a way to inspect:

- mirror kind,
- mirror scope,
- captured timestamp,
- input hash,
- feature snapshot hash,
- cited readings,
- cited memories/plans,
- uncertainty.

Typed blockers must be visible for:

- missing self natal inputs,
- invalid self natal inputs,
- unresolved person mention,
- incomplete related-person natal inputs,
- stale inputs,
- runtime AI failure,
- persistence failure,
- hash mismatch.

No blocked state may display successful reading content.

## Visual Tone

Use restrained surfaces, crisp hierarchy, and compact cards. Cards should frame
individual repeated items or detail drawers, not whole page sections. Avoid
marketing-style hero pages, decorative blobs, score dashboards, and ornamental
visuals that imply precision the model does not support.
