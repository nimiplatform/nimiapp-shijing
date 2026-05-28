# ShiJing (时镜) AGENTS.md

> Authoritative module-level instructions for AI agents working on ShiJing.

## Identity

- **App name (Chinese)**: 时镜
- **App name (English)**: ShiJing
- **App ID**: `ai.nimi.apps.shijing`
- **One-line**: A personal astrology reading companion grounded in classical
  bazi/ganzhi/jieqi/dayun, with a deterministic feature pipeline and a
  Runtime-AI wording boundary.
- **Status**: Pre-Alpha, not yet launched.

## Architecture

| Layer | Technology | Location |
|-------|-----------|----------|
| Desktop shell | Tauri 2 | `src-tauri/` |
| Frontend | React 19 + Vite 7 | `src/shell/renderer/` |
| Persistence | IndexedDB (browser) / in-memory fallback | `src/product/persistence/` |
| Astrology pipeline | Pure-TS deterministic v1 (`bazi_ganzhi_jieqi_dayun_v1`) | `src/product/astrology/` |
| AI wording | nimi runtime (`runtime.ai.text.generate`) | via `@nimiplatform/sdk` |
| UI components | `@nimiplatform/kit` | npm dependency |
| State | Custom store + reducer | `src/product/state/` |
| Dev port | 1430 | `vite.config.ts`, `src-tauri/tauri.conf.json` |

## Spec Authority & Sync

`.nimi/spec/shijing/**` is ShiJing's project-local product authority.
Normative product authority belongs only in
`.nimi/spec/shijing/kernel/*.md` and `.nimi/spec/shijing/kernel/tables/**`;
`.nimi/spec/INDEX.md`, `.nimi/spec/shijing/index.md`,
`.nimi/spec/shijing/shijing.md`, and `.nimi/spec/shijing/AGENTS.md` are
reading guides / authoring rules.

`.nimi/{methodology,contracts,config}/**` is the nimicoding governance
projection — owned by `@nimiplatform/nimi-coding`, managed by
`pnpm nimicoding sync`, and never hand-edited.

When spec and code conflict, first classify the implementation behavior
against the kernel authority. Retained behavior may update spec only
through an explicit redesign/admission decision that cites the affected
kernel authority; otherwise align the implementation to the existing
kernel authority or track the mismatch as a defect. Do not promote bugs,
fail-open behavior, placeholder data writes, orphan surfaces, or
implementation-only behavior into authority.

Before making any change:

1. Read `.nimi/spec/INDEX.md` for the cross-domain reading path.
2. Read `.nimi/spec/shijing/AGENTS.md` for the rule-ID format and hard
   editing rules.
3. Read `.nimi/spec/shijing/kernel/index.md` for the authority map, then
   the relevant `kernel/*.md` contract and its referenced
   `kernel/tables/*.yaml`.
4. Read source code under `src/{domain,contracts,product}/**` to verify
   behavior or identify defects.

### Key Contracts

| Contract | Rule Family | Governs |
|----------|-------------|---------|
| `.nimi/spec/shijing/kernel/product-contract.md` | `SJG-PROD-*` | Product-level invariants |
| `.nimi/spec/shijing/kernel/data-model-contract.md` | `SJG-DATA-*` | ShiJingSpace, Subject/Person, View, Reading, Conversation, Settings, ShiJingCatalog |
| `.nimi/spec/shijing/kernel/astrology-contract.md` | `SJG-ASTRO-*` | Astrology Contract v1: kind/scope matrix, output structure, forbidden outputs, uncertainty surface, consultation anchor rules |
| `.nimi/spec/shijing/kernel/algorithm-contract.md` | `SJG-ALGO-*` | Astrology Algorithm Contract v1: method stack, time windows, canonicalization, DaYun, deterministic feature snapshots, Runtime-AI wording boundary, canonical hashing |
| `.nimi/spec/shijing/kernel/ia-contract.md` | `SJG-IA-*` | Information architecture (four primary tabs: `今日`, `关注`, `问时镜`, `我`) |
| `.nimi/spec/shijing/kernel/removed-surfaces-contract.md` | `SJG-REMOVED-*` | Hard removals (Profile, Venture, HuangliDaily, Report, …) |

### Key Tables

| Table | Governs |
|-------|---------|
| `.nimi/spec/shijing/kernel/tables/reading-kind-scope-matrix.yaml` | Valid `Reading.kind` × `Reading.scope` combinations and per-cell anchor rules |
| `.nimi/spec/shijing/kernel/tables/view-template-catalog.yaml` | `ShiJingCatalog.view_templates[]` schema and accepted entries |
| `.nimi/spec/shijing/kernel/tables/removed-surface-names.yaml` | Names whose reappearance as active product/source must fail closed |

## Development Principles

### No Legacy, No Shims

This project starts from zero. There is no prior version, no deployed users,
no data to migrate. Therefore:

- No compatibility layers, adapters, or shims.
- No "simple version first, fix later" shortcuts.
- No degraded schemas.
- No backward-compatible fallback logic.
- Full schema, full astrology pipeline, full validators from day one.

### Fail-Close

- `validateShiJingSpace` rejects any removed-surface field reappearance.
- `validateReading` rejects any output that violates SJG-ASTRO invariants
  (summary length, subject-ref membership, kind/scope cell, expired
  `inputs_summary`, forbidden phrases, missing/extra fields).
- Runtime AI wording failure → typed `runtime_ai_failed` status surfaced
  verbatim; never a synthesized substitute Reading.
- Pipeline stage failure → typed `pipeline_stage_failed` with stage + kind +
  optional detail; never a silent retry.
- Canonical-hash mismatch on persisted artifacts → fail-close.

## Hard Boundaries

### Astrology Boundary

- The deterministic v1 pipeline owns four-pillar selection, DaYun selection,
  true-solar canonicalization, stage labels, and key windows.
- The Runtime AI layer is an explanation layer only. It must not become the
  astrology calculation owner.
- `inputs_summary` on Reading is a frozen snapshot of the inputs at the time
  of generation and has its own expiry rules (`SJG-ASTRO`); stale summary →
  reject.

### IA Boundary

- Exactly four primary tabs: `今日`, `关注`, `问时镜`, `我`.
- No History tab. No customer management. No batch import/export. No project
  management vocabulary. See `removed-surfaces-contract.md`.

### Subjects Boundary

- Subjects are `self` or `{ kind: "person", id }`. `Person` is an
  other-person astrology object only — it does NOT own conversations,
  events, views, focus themes, notification settings, or app lifecycle.
- `View.anchor_subject` must always be a member of `View.subjects`.

### Privacy Boundary

- All data stored locally in IndexedDB (browser) or in-memory (fallback). No
  cloud upload. No third-party SDK data collection.
- Runtime AI sends only the deterministic feature snapshot + the frozen
  `inputs_summary` over the runtime bridge; no raw user diary entries leak.

## Verification

```bash
# Code layer
pnpm typecheck
pnpm test
pnpm lint
pnpm run build

# Rust layer
(cd src-tauri && cargo check)

# Governance layer
pnpm nimicoding:doctor
```

## Retrieval Defaults

Start with: `spec/kernel/`, `src/domain/`, `src/contracts/`,
`src/product/astrology/`, `src/product/state/`, `src/product/persistence/`,
`src/shell/routes/`.

Skip: `node_modules/`, `dist/`, `src-tauri/target/`, `src-tauri/gen/`,
lockfiles, `.nimi/cache/`, `.nimi/local/`, `.nimi/topics/`.

## Code Conventions

- ULID for all new IDs.
- ISO 8601 (UTC, with explicit `Z`) for all date/time fields persisted on
  Reading / Snapshot.
- ESM imports use `.ts` extension for in-repo TypeScript files. Node 24
  native `--experimental-strip-types` requires literal `.ts`; the matching
  `tsconfig.json` opts in via `allowImportingTsExtensions: true`. This is
  documented under "Admitted Scaffold Drift" in `spec/AGENTS.md`.
- Canonical hashing (`SJG-ALGO-11`) uses sha256 + json-c14n-v1 + NFC +
  utf-8 + hex-lowercase. The pure-JS implementation in
  `src/product/astrology/canonical-hash.ts` is the only authority; do not
  reintroduce `node:crypto` (it does not exist in the Vite/Tauri renderer).
- Tauri host glue is consumed from `nimi-shell-tauri` (crates.io).

<!-- nimicoding:managed:agents:start -->
# Nimi Coding Managed Block

- Read .nimi/methodology, .nimi/spec, and .nimi/contracts before high-risk changes.
- Treat .nimi as the primary AI truth surface for this project.
- Treat `/.nimi/spec/**` as the current repo-wide product authority for this project, and use Git history for retired pre-cutover authority evidence.
- If .nimi/spec remains bootstrap-only, use .nimi/methodology/spec-reconstruction.yaml and .nimi/config/skills.yaml to drive AI-side truth reconstruction.
- Treat .nimi/methodology/spec-target-truth-profile.yaml as repo-local support guidance for future governance slices, not as the canonical reconstruction completion target or a guaranteed fresh-bootstrap seed.
- Treat .nimi/contracts/spec-reconstruction-result.yaml, .nimi/contracts/doc-spec-audit-result.yaml, .nimi/contracts/high-risk-execution-result.yaml, and .nimi/contracts/high-risk-admission.schema.yaml as machine contracts for reconstruction, audit, local-only high-risk closeout summaries, and canonical high-risk admission truth.
- Treat .nimi/config/skill-manifest.yaml, .nimi/config/host-profile.yaml, .nimi/config/host-adapter.yaml, .nimi/config/external-execution-artifacts.yaml, .nimi/config/skill-installer.yaml, .nimi/methodology/skill-runtime.yaml, .nimi/methodology/skill-installer-result.yaml, .nimi/methodology/skill-handoff.yaml, and admitted package-owned adapter profiles under adapters/**/profile.yaml as the canonical bridge to any external AI/skill execution.
- Treat standalone nimicoding as boundary-complete for bootstrap, handoff, validation, projection, and explicit admission only; do not assume packaged run-kernel, provider, scheduler, notification, or automation ownership.
- Treat .nimi/config/installer-evidence.yaml and .nimi/methodology/skill-installer-summary-projection.yaml as the operational-to-semantic installer projection boundary; do not promote concrete evidence artifacts into semantic truth.
- Treat high-risk external execution closeout, decision, ingest, and review payloads under .nimi/local/** as local-only operational projections; they do not promote semantic truth automatically, even when manager-owned.
- Use high-risk packetized execution only when authority, ownership, or cross-layer risk justifies it.
- Keep inline manager-worker as the default methodology posture; do not assume a separate worker runtime is mandatory.
- Keep code changes AI-context-efficient: favor bounded, cohesive files and split by responsibility during implementation instead of first concentrating unrelated logic into one file.
- Keep the methodology continuity-agnostic; do not assume daemon, heartbeat, or persistent manager ownership.
- Treat cutover readiness as preflight evidence only; the authority flip must come from an admitted cutover batch, not from readiness green by itself.
- Do not treat this managed block as a replacement for project-specific rules outside .nimi.
<!-- nimicoding:managed:agents:end -->
