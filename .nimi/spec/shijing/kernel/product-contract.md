# SJG-PROD — Product Contract

> Product-level invariants. Concrete data shapes live in
> `data-model-contract.md`. AI behavior lives in `astrology-contract.md`.
> Deterministic astrology generation rules live in `algorithm-contract.md`.
> IA lives in `ia-contract.md`. Removals live in
> `removed-surfaces-contract.md`.

## SJG-PROD-01 — Single Product Authority

ShiJing product authority is exactly `apps/shijing/spec/**`. No other
location, including `.nimi/spec/**`, may carry ShiJing-specific product
truth without an explicit human-gate admission.

## SJG-PROD-02 — Embedded App, Not Standalone Account

ShiJing is a Nimi-embedded app. Nimi owns the account, login, runtime
safety boundaries, and cross-device primitives. ShiJing owns only its
app-local astrology extension and user-space data under `ShiJingSpace`.

## SJG-PROD-03 — Personal Scale

ShiJing operates at personal scale. Subjects are `self_subject` plus
other-person `Person` objects representing normal family and friends.
ShiJing is not a customer-management product. Mass import, batch report
export, third-party consultant workflow, and customer segmentation are
forbidden surfaces.

## SJG-PROD-04 — One Reading Entity

`Reading` is the only persisted astrology output entity. Any alternative
output entity (DailyCard, Report, VentureJudgment, HuangliDaily, monthly
report, yearly report, trend chart, luck-score record) is forbidden.

## SJG-PROD-05 — Workspace Instructions Single Name

The only workspace-level instruction setting is
`Settings.response_preferences`. `global_instructions`, `project_memory`,
and `long-line` style settings are forbidden naming.

## SJG-PROD-06 — ViewTemplate Is Catalog Not User Data

`ShiJingCatalog.view_templates[]` is product catalog authority. It is
shared across users, is not stored under `ShiJingSpace`, and is not
user-mutable through the user-data path.

## SJG-PROD-07 — Runtime Boundary

AI access uses the nimi runtime through `@nimiplatform/sdk/runtime` only.
ShiJing must not perform direct HTTP/gRPC calls, host provider/model
literals, or implement Reading content fallback that hides a runtime
contract failure.

Runtime AI is a wording layer over deterministic Algorithm Contract feature
snapshots. It is not the owner of pillars, DaYun, true solar time, stage
labels, key windows, or uncertainty gating.

## SJG-PROD-08 — No Pseudo-Success

ShiJing must not synthesize Reading content as a fallback for a failed
runtime call, a missing schema field, a missing MIME type, or a missing
typed output. Reading absence is a typed failure, not a placeholder
success.

## SJG-PROD-09 — No Algorithm Stub

No canned horoscope text, placeholder Reading content, or prompt-only
astrology calculation may ship as Reading content. Algorithm authority is
frozen in `algorithm-contract.md`; executable implementation must later prove
it follows that contract.
