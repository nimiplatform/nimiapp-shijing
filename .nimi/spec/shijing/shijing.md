# ShiJing v0.8 Product Spec

> Top-level product authority. Detailed contracts live under
> `spec/kernel/**`. This document freezes positioning, the root data
> structure, and the scope/anti-scope envelope.

## Identity

- **App name (Chinese)**: 时镜
- **App name (English)**: ShiJing
- **App ID**: `app.nimi.shijing`
- **One-line**: ShiJing is a Nimi-embedded astrology reflection app for the
  individual user — observe self, family, and friends through View frames and
  Readings, not through customer management or batch reports.
- **Status**: Pre-Alpha. Wave 0 freezes app-local product authority and typed
  source contracts. Wave 3 freezes Astrology Algorithm Contract v1 as
  spec-only authority before persistence/runtime integration consumes
  `Reading`.

## Frozen Product Root

```text
NimiUser                                            // owned by Nimi platform
  └── ShiJingSpace                                  // owned by ShiJing app
        ├── self_subject                            // user's astrology extension
        ├── persons[]                               // other-person astrology objects
        ├── relations[]                             // relations between subjects
        ├── events[]                                // recorded astrology-relevant events
        ├── views[]                                 // reusable observation frames
        ├── readings[]                              // persisted astrology outputs
        ├── conversations[]                         // in-app conversations
        └── settings                                // workspace settings (incl. response_preferences)

ShiJingCatalog                                      // product catalog authority
  └── view_templates[]                              // templates, NOT user data
```

`SubjectRef = "self" | { kind: "person", id }` is the only reference shape for
astrology subjects. `Person` is an other-person astrology object for normal
family and friend calculation. `Person` is not another account and does not
own conversations, events, views, focus themes, notification settings, or
app lifecycle.

## Scope Envelope

In scope:

- Personal-scale astrology reflection for `self_subject` plus other-person
  Person objects;
- Reusable View frames with explicit anchor subject;
- Five Reading kinds: `today`, `period_outlook`, `key_window`, `sign`,
  `consultation`;
- Three Reading scopes: `subject`, `view`, `ad_hoc`;
- Single v1 algorithm method stack:
  `bazi_ganzhi_jieqi_dayun_v1`;
- Deterministic feature snapshots before AI wording;
- AI-maintained view context summary (`view_memory`) with lock state;
- Workspace-level `response_preferences` for AI tone/length;
- Product-owned ViewTemplate catalog under `ShiJingCatalog`.

Out of scope (hard removals, see
`kernel/removed-surfaces-contract.md`):

- Huangli mode and `黄历` daily surfaces;
- Profile, Person/Profile duality, Venture, VentureNode, project_memory,
  long-line state, long-line templates;
- History tab, monthly report, yearly report, trend chart, luck score curves;
- Batch person import, batch report export, customer management flows,
  third-party consultant workflow;
- App-level REST bypasses, hardcoded provider/model literals, fabricated
  astrology algorithm output.

## Algorithm Boundary

ShiJing v1 Reading generation is not prompt-first. It is:

```text
NatalInputs
  -> NatalCanonicalization
  -> NatalChartSnapshot
  -> CycleSnapshot
  -> AstrologyFeatureSnapshot
  -> Runtime AI wording
  -> validateReading
  -> persisted Reading
```

The deterministic algorithm stack owns true solar time, pillars, DaYun, stage
labels, key windows, time windows, and uncertainty inputs. Runtime AI receives
feature snapshots and context, then returns structured wording only. A runtime
failure or parse failure is a typed absence of Reading, not a fallback success.

## Architecture Anchor

| Layer | Technology | Location |
|-------|-----------|----------|
| Desktop shell | Tauri 2 via `nimi-shell-tauri` | `src-tauri/**` |
| Frontend shell | React 19 + Vite 7 | `src/shell/**` |
| Product domain types | TypeScript | `src/domain/**` |
| Product contracts/validators | TypeScript | `src/contracts/**` |
| Algorithm authority | Markdown spec | `spec/kernel/algorithm-contract.md` |
| AI access | nimi runtime wording over feature snapshots | via `@nimiplatform/sdk` only |
| UI components | `@nimiplatform/kit` | npm dependency |

ShiJing must not add direct HTTP/gRPC calls or hardcoded provider/model
lists. All runtime access goes through `@nimiplatform/sdk/runtime`. All
auth/permission/manifest/Tauri-shell glue stays in scaffold-managed files.

## Wave 0 Output Placement

Wave 0 writes app-local authority under `apps/shijing/spec/**` and typed
contracts under `apps/shijing/src/{domain,contracts}/**`. It does not edit
repo-wide `.nimi/spec/**`, Runtime, SDK, Desktop, Web, Kit, or any other
app. It does not modify scaffold-managed glue files (the `app-owned product
code` taxonomy entry, `src/shell/routes/product-area.tsx`, may consume the
typed model but the model itself lives in `src/domain` and `src/contracts`).

## Wave 3 Spec-Only Authority Placement

Wave 3 writes `apps/shijing/spec/**` and topic evidence only. It does not
modify `apps/shijing/src/**`, persistence, runtime, SDK, Tauri, or renderer
implementation. Any downstream persistence/runtime/renderer wave that consumes
`Reading` must first synchronize source contracts with
`spec/kernel/algorithm-contract.md`.
