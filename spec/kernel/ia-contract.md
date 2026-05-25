# SJG-IA — Information Architecture Contract

> Defines exactly four primary tabs and the observation-target switcher
> contract. No fifth primary tab may be added without an explicit human-gate
> admission.

## SJG-IA-01 — Exactly Four Primary Tabs

The ShiJing renderer exposes exactly four primary tabs, in this order:

| Order | Tab Id | Chinese Label | English Anchor |
|-------|--------|---------------|----------------|
| 1 | `today` | `今日` | Today |
| 2 | `views` | `视角` | Views |
| 3 | `consultation` | `问时镜` | Consultation |
| 4 | `me` | `我` | Me |

A fifth primary tab is forbidden in Wave 0. Adding a fifth primary tab is a
human-gate trigger and may not be done silently.

## SJG-IA-02 — Tab Identity Is Stable

Tab ids `today`, `views`, `consultation`, `me` are stable identifiers.
Renaming a tab id is a human-gate change. Display labels may be localized
but Chinese labels above are the canonical product labels.

## SJG-IA-03 — Removed Tabs

The following are forbidden primary tabs in Wave 0:

- `history` — there is no History tab. Past `Reading`s are surfaced inside
  the relevant `View` detail or via subject filter, not under a global
  History tab.
- `huangli` — there is no Huangli mode tab.
- `reports` — there is no aggregated Report tab. Reading is the only
  persisted astrology output entity (`SJG-PROD-04`).
- `customers` / `clients` — ShiJing is not a customer-management product
  (`SJG-PROD-03`).
- `trends` — no luck-score trend chart tab.
- `consultants` — no third-party consultant directory tab.

## SJG-IA-04 — CurrentObservationTarget Switcher

The top-of-screen switcher sets `CurrentObservationTarget: SubjectRef`. It
does not switch identity, account, or session. Identity remains the
authenticated NimiUser.

```text
CurrentObservationTarget = SubjectRef            // "self" | { kind: "person", id }
```

Invariants:

- `CurrentObservationTarget` always resolves to a subject present in the
  active `ShiJingSpace` (`self` or a `persons[].id`).
- Switching observation target does not change `NimiUser` session, does
  not switch which `ShiJingSpace` is loaded, and does not change ownership
  of `Conversation`s.

## SJG-IA-05 — Tab Routing Hint

Wave 0 source includes a routing-hint constant
`SHIJING_IA_TABS` under `src/contracts/ia-contract.ts` carrying the ordered
tab descriptor list. Renderer surfaces MUST consume this constant rather
than hardcoding parallel tab lists.
