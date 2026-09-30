# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Pin the RiJing test clock at both scheduling and Reading freshness boundaries.
- Reject malformed uncertainty caveats/data gaps on generation and disk load.
- Include canonical natal inputs in Reading input hashes and freshness checks,
  preserving distinct natal versions and citation-safe retention.
- Connect Runtime AI failures to cause-specific Desktop recovery and manual retry;
  preserve rejected navigation and owner failure evidence.
- Move monthly, yearly, relationship and Ziwei surface copy into typed Chinese
  and English resources; audit copy objects and template literals as well as JSX.
- Support keyboard opening, wheel selection, confirmation, Escape and focus return
  for lunar birth dates.
- Preserve natal editor drafts when dismissing the lunar panel; disable keyboard
  entry and close the time panel when the birth time is unknown.
- Keep the 390px window usable: constrain calendar columns and failure copy, stack
  the yearly hero, wrap relationship controls and fit lunar panels to the viewport.

### Added
- A read-only archive of all saved Plans in Settings → Life records. Entry and
  editing remain on Monthly Mirror dates.

### Changed
- Explicitly admit the existing RiJing auxiliary almanac, independent of personal
  readings, deterministic decisions, hashes and Runtime-AI requests.
- Define access recovery as four SDK postures plus original owner reason/action
  evidence, instead of inferring five narrower causes from session state.
- Adopt App Tools 0.9 / SDK 0.16 / Kit 0.13 with the required Electron Host profile.
- Keep test/preview persistence adapters out of production barrel exports and
  correct validation/privacy documentation to match actual behavior.

## [0.1.10] - 2026-09-23 (source candidate)

### Added
- Daily RiJing scheduling while the App is open, with shared page/manual generation.
- Publish summary-only App activities after a Reading has been saved.

### Changed
- Stop session work after Host invalidation and adopt the development SDK 0.16 /
  Kit 0.12 / App Tools 0.8 cohort. This source candidate has no v0.1.10 tag yet.

## [0.1.9] - 2026-09-20

### Added
- Declare audience, AI text output, birth coordinates and health/finance consultation
  data for App information presentation. Keep SDK 0.11 / Kit 0.7 pairing.

### Changed
- Ground HeJing interaction patterns in admitted BaZi rules and provide real
  experience records linked to the selected Person.

## [0.1.8] - 2026-09-12

### Added
- Include icon, guide, release notes, license, declared access and storage facts in
  App information assets presented before installation.

### Changed
- Adopt App Tools 0.5.1 / SDK 0.11 / Kit 0.7.
- Refine intake, relationship pending states, Settings rows and consultation concern
  editing; preserve unsaved response-preference drafts.
- Remove obsolete Person consent state from natal records.

## [0.1.7] - 2026-09-10

### Fixed
- Include the Kit-owned protected Runtime carrier in the macOS App bundle.

## [0.1.6] - 2026-09-10

### Changed
- Advance the release version for installed-App update validation; no new product
  behavior beyond 0.1.5.

## [0.1.5] - 2026-09-10

### Added
- Package an unsigned macOS arm64 Electron App bundle alongside Windows output.

### Changed
- Adopt App Tools 0.3 / SDK 0.10 / Kit 0.6 and retain release verification gates.

## [0.1.4] - 2026-09-09

### Fixed
- Show Nimi connection and AI configuration without incorrectly describing
  Registry-installed Apps as development sessions.

### Pre-Alpha storage boundary
- Version 0.1.3 switched from Runtime JSON objects to streamed App-private
  assets. Updating preserves the registered App subject and both storage
  partitions, but does not automatically convert older JSON snapshots.
- Versions 0.1.3 and 0.1.4 use the same streamed snapshot path. There is no
  legacy reader or automatic migration in the App.

## [0.1.3] - 2026-09-09

### Fixed
- Preserve complete readings and consultation state through the public SDK's
  App-private asset storage, including after restarting the App.
- Align reading calculation dates and apply the accepted calendar corrections.
- Update the Electron carrier to the published SDK 0.9.1, Kit 0.5.1, and
  app-tools 0.2.8 integration verified during local acceptance.
- Read the packaged App version from package.json so release updates also
  update the Windows executable and bundled manifest versions.

## Initial development history (May–August 2026)

These are historical milestones, including surfaces and carriers subsequently
removed. They do not describe the current product or persistence contract.

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

## [0.1.0] - 2026-09-05

Initial standalone extraction from `nimi-realm/nimi/apps/shijing`.
