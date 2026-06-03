# ShiJing User Storybook

> Guide-level storybook for the four-mirror product. Kernel contracts remain
> normative when details differ.

## S01 Establish Self

As a new user, I enter my own birth information so ShiJing can generate
deterministic feature snapshots.

Acceptance:

- No mirror reading is generated from placeholder birth data.
- Missing or invalid self natal inputs show readiness blockers on every mirror.
- Readiness blockers deep-link to Settings > Self.
- Settings > Self is also reachable from the global settings entry.

## S02 Choose Concern Tags

As a user, I select the life dimensions ShiJing should project onto time.

Acceptance:

- Built-in tags include `#姻缘`, `#事业`, `#健康`, and `#财富`.
- A user can create custom tags such as `#创业` or `#姻缘 @王某`.
- The sixth active tag is rejected with a typed validation error.
- Archived tags do not enter default mirror generation.
- Person and event counts do not consume the tag quota.

## S03 Resolve a Person Mention

As a user, I mention `@王某` inside a concern tag or plan so ShiJing can use the
right natal data when allowed.

Acceptance:

- A resolver can create or open a Person record.
- Person editing lives in Settings > People and the mention resolver.
- If a Person lacks usable natal inputs, readings show a typed blocker or a
  lowered-confidence caveat; they must not pretend a chart exists.
- Person has no conversations, events, views, relations, focus themes,
  notifications, or lifecycle ownership.

## S04 Open RiJing

As a daily user, I open ShiJing and see today's reading.

Acceptance:

- RiJing shows a daily overview plus projections for active concern tags.
- Each projection is backed by a valid Reading or a typed failure state.
- Users can record a same-day EventMemory from RiJing.
- Users can send any RiJing block into ShiJing consultation.

## S05 Use YueJing

As a user planning the near future, I view the next 30 days as a calendar.

Acceptance:

- YueJing covers a canonical rolling 30-day window from the selected anchor
  date.
- Calendar cells use bounded tendency classes, not scores.
- Users can filter by active concern tag.
- Future dates accept PlanItems.
- Past dates accept EventMemories.
- Details disclose eligible plan/memory references used by the reading.

## S06 Record Memory

As a user, I record what happened so ShiJing can preserve my personal timeline.

Acceptance:

- EventMemory stores date, text, optional person refs, optional concern-tag
  refs, source, timestamps, and admissible-use metadata.
- Memory is not injected silently. If used, it is cited.
- Memory retrieval failure or absence does not produce fake evidence.

## S07 Open NianJing

As a long-horizon user, I inspect phases and inflection points.

Acceptance:

- NianJing renders phase bands and inflection points by active concern tag.
- It does not render authoritative K-line bars, trend curves, scores, or
  rankable numbers.
- Every visible band or point maps to structured Reading output.
- Users can send a band or point into ShiJing consultation.

## S08 Ask ShiJing

As a user, I ask follow-up questions about mirror readings.

Acceptance:

- A consultation can cite multiple Reading ids.
- Runtime AI answers may explain and compare cited readings, but cannot mutate
  deterministic astrology facts.
- AI turns disclose cited readings, cited memory refs, and cited plan refs.
- Runtime failure is surfaced as a typed failure, not replaced by synthetic
  content.

## S09 Manage Settings Without a CRM

As a user, I can maintain the minimum information ShiJing needs without using a
customer-management product.

Acceptance:

- Settings contains Self, People, Concern Tags, Memory & Plans, Response
  Preferences, Privacy/Local Data, and Diagnostics.
- There is no primary `我` tab, History tab, relation manager, customer list,
  project board, or report export surface.
- Settings surfaces show typed readiness/failure states and recovery actions.

## S10 Trust and Audit

As a skeptical user, I can understand why a reading exists.

Acceptance:

- Each Reading stores mirror kind, mirror scope, generated timestamp, frozen
  inputs summary, input hash, feature snapshot hash, and output structure.
- Stale input summaries are rejected.
- Hash mismatch fails closed.
- UI distinguishes deterministic evidence, memory/plan references, and Runtime
  AI wording.
