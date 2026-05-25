# nimiapp-shijing

时镜 (ShiJing) — A personal astrology reading companion grounded in classical
bazi/ganzhi/jieqi/dayun, packaged as a standalone Tauri 2 + React 19 desktop
app.

> Migrated from the `apps/shijing` workspace in the `nimi-realm` monorepo.
> The nimi-realm copy remains in place; this project is the canonical
> standalone distribution.

## Architecture

| Layer | Technology | Location |
|-------|-----------|----------|
| Desktop shell | Tauri 2 | `src-tauri/` |
| Frontend | React 19 + Vite 7 | `src/shell/renderer/` |
| Persistence | IndexedDB (browser) / in-memory fallback | `src/product/persistence/` |
| Astrology pipeline | Pure-TS deterministic v1 (`bazi_ganzhi_jieqi_dayun_v1`) | `src/product/astrology/` |
| AI wording | nimi runtime (`runtime.ai.text.generate`) | via `@nimiplatform/sdk` |
| UI components | `@nimiplatform/kit` | npm dependency |
| Governance | `@nimiplatform/nimi-coding` + `.nimi/**` | bootstrap projections |

## Product Surface

Four primary tabs (`SJG-IA-*`):

- **今日 (Today)** — Generate and display the daily reading for the
  currently observed subject.
- **视角 (Views)** — Create / manage `View`s; each view fixes a subject set,
  an anchor subject, a time window, and a template.
- **问时镜 (Consultation)** — Ad-hoc consultation readings against an
  anchored subject.
- **我 (Me)** — `self_subject` `NatalInputs` + workspace `Settings`.

The data root is `ShiJingSpace`: `self_subject`, `persons[]`, `relations[]`,
`events[]`, `views[]`, `readings[]`, `conversations[]`, `settings`. See
`.nimi/spec/shijing/kernel/data-model-contract.md`.

## Spec Authority

Normative product authority lives under `.nimi/spec/shijing/kernel/**`
(markdown contracts + typed YAML tables). Guides:

- `.nimi/spec/INDEX.md` — cross-domain reading path
- `.nimi/spec/shijing/index.md` — domain reading guide
- `.nimi/spec/shijing/shijing.md` — top-level product positioning
- `.nimi/spec/shijing/AGENTS.md` — authoring rules + admitted drift
- `.nimi/spec/shijing/kernel/index.md` — kernel authority map

Contract families:

| Family | File |
|--------|------|
| `SJG-PROD-*` | `.nimi/spec/shijing/kernel/product-contract.md` |
| `SJG-DATA-*` | `.nimi/spec/shijing/kernel/data-model-contract.md` |
| `SJG-ASTRO-*` | `.nimi/spec/shijing/kernel/astrology-contract.md` |
| `SJG-ALGO-*` | `.nimi/spec/shijing/kernel/algorithm-contract.md` |
| `SJG-IA-*` | `.nimi/spec/shijing/kernel/ia-contract.md` |
| `SJG-REMOVED-*` | `.nimi/spec/shijing/kernel/removed-surfaces-contract.md` |

`.nimi/{config,contracts,methodology}/**` are projections from
`@nimiplatform/nimi-coding`; they are managed by `pnpm nimicoding sync` and
must not be hand-edited.

## Prerequisites

- Node.js ≥ 24 (uses native `--experimental-strip-types`)
- pnpm ≥ 10
- Rust (stable) + Cargo, with the Tauri 2 toolchain for `src-tauri`

## Install

```bash
pnpm install
```

All runtime dependencies resolve from npm (`@nimiplatform/kit`,
`@nimiplatform/sdk`) and crates.io (`nimi-shell-tauri`); no sibling
`nimi-realm` checkout is required.

## Development

```bash
# Renderer only (vite dev server on http://127.0.0.1:1430)
pnpm dev:renderer

# Full Tauri shell (renderer + native window)
pnpm dev:shell
```

## Build & Verify

```bash
# Type-check + renderer build + cargo check
pnpm run build

# Test suite (Node 24 native --test runner on .mjs files)
pnpm test

# Lint (typecheck + eslint + cargo check)
pnpm lint

# Native bundle (DMG / NSIS / AppImage depending on host)
pnpm build:shell
```

## Astrology Pipeline

The deterministic v1 pipeline (`SJG-ALGO-02`) runs entirely in TypeScript and
maps as follows:

```
NatalInputs
  ↓ canonicalize-natal-inputs.ts        (SJG-ALGO-04..06 canonicalization)
NatalCanonicalization
  ↓ build-natal-chart.ts                (SJG-ALGO-07 four pillars)
NatalChartSnapshot
  ↓ build-cycle-snapshot.ts             (SJG-ALGO-08 DaYun)
CycleSnapshot
  ↓ build-feature-snapshot.ts           (SJG-ALGO-09 stage labels + windows)
AstrologyFeatureSnapshot
  ↓ runtime-ai-client.ts                (SJG-ALGO-12 wording boundary)
Raw Reading text
  ↓ runtime-ai-parse.ts + validateReading
Persisted Reading
```

The Runtime AI layer is an **explanation layer only**. Pillars, DaYun,
true-solar canonicalization, stage labels, and key windows are owned by the
deterministic pipeline. See `.nimi/spec/shijing/kernel/algorithm-contract.md`.

Canonical hashing (`SJG-ALGO-11`) uses sha256 + json-c14n-v1 + NFC + utf-8 +
hex-lowercase. The implementation lives in
`src/product/astrology/canonical-hash.ts` as a pure-JS SHA-256 so it works
identically in the Node `--test` runner and the Vite/Tauri renderer.

## Governance projection sync

`.nimi/{config,contracts,methodology}/**` is owned by
`@nimiplatform/nimi-coding`. After bumping the package version:

```bash
pnpm install
pnpm exec nimicoding sync --apply
pnpm nimicoding:doctor
```

Commit the updated `.nimi/**` files alongside the `package.json` bump.

## Status

Pre-Alpha. Not yet launched. The 14-wave initial delivery is closed; see
`CHANGELOG.md` for the list of admitted contracts and the corresponding
source modules.
