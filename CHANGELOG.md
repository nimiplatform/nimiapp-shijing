# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial standalone project layout migrated from `apps/shijing` in the
  `nimi-realm` monorepo.
- `spec/kernel/**` host-authored product authority (SJG-PROD / SJG-DATA /
  SJG-ASTRO / SJG-ALGO / SJG-IA / SJG-REMOVED contract families).
- `@nimiplatform/nimi-coding` governance projection under
  `.nimi/{config,contracts,methodology}/**`.
- Full source for the 14-wave delivery of topic
  `2026-05-25-shijing-person-view-reading-hardcut`:
  - NatalInputs editor (wave-7)
  - Person management UI (wave-8)
  - View creation UI (wave-9)
  - Real bazi/ganzhi/jieqi/dayun pipeline (wave-10)
  - Runtime AI wording adapter (wave-11)
  - Today / Consultation reading wiring (wave-12)
  - End-to-end acceptance suite (wave-13)
- IndexedDB persistence adapter with debounced saver and typed lifecycle status.
- Pure-JS canonical SHA-256 (`canonical-hash.ts`) so canonicalization runs in
  both the Node `--test` runner and the Vite/Tauri renderer without
  `node:crypto`.

### Resolved
- `@nimiplatform/kit@^0.1.2` published to npm — `pnpm install` works end-to-end.
- `nimi-shell-tauri@0.1.0` published to crates.io — `src-tauri/Cargo.toml`
  consumes the registry version directly; no sibling checkout required.

## [0.1.0] - TBD

Initial standalone extraction from `nimi-realm/nimi/apps/shijing`.
