# nimiapp-shijing

时镜 (ShiJing) — A personal astrology reading companion grounded in classical
bazi/ganzhi/jieqi/dayun, packaged as a standalone Electron + React 19 desktop
app.

> Migrated from the `apps/shijing` workspace in the `nimi-realm` monorepo.
> The nimi-realm copy remains in place; this project is the canonical
> standalone distribution.

## Architecture

| Layer | Technology | Location |
|-------|-----------|----------|
| Desktop shell | Electron | `src-electron/` |
| Optional carrier diagnostics | Tauri 2 | `src-tauri/` |
| Frontend | React 19 + Vite 7 | `src/shell/renderer/` |
| Persistence | Protected operation pending admission; IndexedDB/in-memory remain dev/test-only | `src/product/persistence/` |
| Astrology pipeline | Pure-TS deterministic v1 (`bazi_ganzhi_jieqi_dayun_v1`) | `src/product/astrology/` |
| AI wording | nimi runtime (`runtime.ai.text.generate`) | via `@nimiplatform/sdk` |
| UI components | `@nimiplatform/kit` | npm dependency |
| Governance | `@nimiplatform/nimi-coding` + `.nimi/**` | v2 canonical authority |

## Product Surface

Exactly six primary tabs, governed by `rule.shijing.ia.r001`:

- **日镜 (RiJing)** — Daily reflection.
- **月镜 (YueJing)** — Rolling 30-day calendar.
- **年镜 (NianJing)** — Long-horizon phase bands and inflection points.
- **命镜 (MingJing)** — Whole-life self natal projection.
- **合镜 (HeJing)** — Self-plus-one-Person relationship workbench.
- **问镜 (ShiJing)** — Session-based consultation grounded in cited readings.

The sole user-data root is `ShiJingSpace`: `user_id`, `self_subject`,
`persons[]`, `concern_tags[]`, `event_memories[]`, `plan_items[]`,
`readings[]`, `conversations[]`, and `settings`. See
`rule.shijing.data-model.r002` in
`.nimi/spec/shijing/canonical/data-model.authority.yaml`.

## Spec Authority

Normative product authority lives in closed v2 containers under
`.nimi/spec/shijing/canonical/**`.

Contract families:

| Family | File |
|--------|------|
| Product | `.nimi/spec/shijing/canonical/product.authority.yaml` |
| Data model | `.nimi/spec/shijing/canonical/data-model.authority.yaml` |
| Astrology | `.nimi/spec/shijing/canonical/astrology.authority.yaml` |
| Algorithm | `.nimi/spec/shijing/canonical/algorithm.authority.yaml` |
| IA | `.nimi/spec/shijing/canonical/ia.authority.yaml` |
| Removed surfaces | `.nimi/spec/shijing/canonical/removed-surfaces.authority.yaml` |

`.nimi/methodology/authority-authoring.yaml` is managed by
`@nimiplatform/nimi-coding`; app-specific configuration and contracts remain
host owned.

## Prerequisites

- Node.js ≥ 24 (uses native `--experimental-strip-types`)
- pnpm ≥ 10
- Windows x64 for the selected production package
- Rust + Cargo and Tauri 2 only for optional `src-tauri` diagnostics

## Install

```bash
pnpm install
```

Electron dependencies resolve from public npm, including the Kit-owned Windows
native binding. No sibling Nimi checkout is required to build the App. Optional
Tauri diagnostics additionally use `nimi-shell-tauri` from crates.io.

## Development

```bash
# Desktop-supervised Electron (the primary proven development path)
pnpm dev

# Explicit Desktop-supervised shell selection
pnpm dev:shell -- --shell electron

# Renderer-only; protected operations and product mounting fail closed
pnpm dev:renderer
```

## Build & Verify

```bash
# Type-check + renderer build
pnpm run build

# Test suite (Node 24 native --test runner on .mjs files)
pnpm test

# Lint (i18n + typecheck + eslint)
pnpm lint

# Canonical authority
pnpm spec:authority:check
pnpm spec:authority:compile
pnpm exec nimicoding sync --check

# The single Windows Electron production package
pnpm run build:electron:production
pnpm exec nimi-app pack --target windows-x86_64 --production
pnpm exec nimi-app pack --aggregate

# Optional Tauri diagnostic build; not a second release candidate
pnpm run build:tauri:production
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
deterministic pipeline. See `.nimi/spec/shijing/canonical/algorithm.authority.yaml`.

Canonical hashing (`SJG-ALGO-11`) uses sha256 + json-c14n-v1 + NFC + utf-8 +
hex-lowercase. The implementation lives in
`src/product/astrology/canonical-hash.ts` as a pure-JS SHA-256 so it works
identically in the Node `--test` runner and the Vite/Tauri renderer.

## Authority tooling sync

`.nimi/methodology/authority-authoring.yaml` is owned by
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
