# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial standalone project layout migrated from `apps/shijing` in the
  `nimi-realm` monorepo.
- Host-authored ShiJing product authority (the original kernel layout was
  later hard-cut to closed v2 canonical containers).
- `@nimiplatform/nimi-coding` authority-authoring guide sync under
  `.nimi/methodology/authority-authoring.yaml`.
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

### Changed
- 命镜 流年关键窗口 narrative is now composed per window (nature lead + up to
  three basis-grounded sentences drawn from the window's own salience reasons +
  nature guidance) instead of one static sentence per tendency class, so
  distinct windows no longer share identical wording.
- 年镜 phase wording now carries concern-specific BaZi and Ziwei driver
  evidence into both deterministic guidance and the Runtime AI wording target;
  transient concern prompt text and cited plan summaries are included without
  persisting their raw text in Reading provenance.
- 问镜 follow-ups now include the existing conversation turns as read-only
  continuity context while cited Readings remain the astrology authority.
- 命镜 refreshes a missing, failed, or stale AI reading after an observed
  App AIConfig not-ready to ready transition, subject to projection and
  persistence readiness gates.
- Refined the intake blocker, HeJing empty state, MingJing event recorder, and
  ShiJing consultation layouts for a unified responsive glass-shell experience;
  local-development session and AIConfig status now lives in Settings.

### Resolved
- `@nimiplatform/kit@^0.1.2` published to npm — `pnpm install` works end-to-end.
- `nimi-shell-tauri@0.1.0` published to crates.io — `src-tauri/Cargo.toml`
  consumes the registry version directly; no sibling checkout required.

## [0.1.0] - TBD

Initial standalone extraction from `nimi-realm/nimi/apps/shijing`.
