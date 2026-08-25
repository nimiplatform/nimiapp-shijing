# ShiJing (时镜) AGENTS.md

> Authoritative module-level instructions for AI agents working on ShiJing.

## Identity

- **App name (Chinese)**: 时镜
- **App name (English)**: ShiJing
- **Canonical Nimi app_id**: `nimi.shijing`
- **Product slug**: `shijing`
- **Tauri identifier**: `nimi.shijing`
- **One-line**: A personal astrology reading companion grounded in classical
  bazi/ganzhi/jieqi/dayun, with a deterministic feature pipeline and a
  Runtime-AI wording boundary.
- **Status**: Pre-Alpha, not yet launched.

## Architecture

| Layer | Technology | Location |
|-------|-----------|----------|
| Desktop shell | Tauri 2 | `src-tauri/` |
| Frontend | React 19 + Vite 7 | `src/shell/renderer/` |
| Persistence | Runtime-owned Registered-App-Subject JSON storage through the public SDK | `src/shell/persistence/`, `src/product/persistence/` |
| Astrology pipeline | Pure-TS deterministic v1 (`bazi_ganzhi_jieqi_dayun_v1`) | `src/product/astrology/` |
| AI wording | Protected Local App text candidate consumption under `runtime.consume` | `@nimiplatform/sdk/app` |
| UI components | `@nimiplatform/kit` | npm dependency |
| State | Custom store + reducer | `src/product/state/` |
| Dev port | 1430 | `vite.config.ts`, `src-tauri/tauri.conf.json` |

## Spec Authority & Sync

`.nimi/spec/shijing/**` is ShiJing's project-local product authority.
Normative product authority belongs only in closed v2 containers under
`.nimi/spec/shijing/canonical/*.authority.yaml`.

`.nimi/methodology/authority-authoring.yaml` is the package-managed
nimicoding authoring guide. App-specific configuration and contracts remain
host owned.

When spec and code conflict, first classify the implementation behavior
against the canonical authority. Retained behavior may update spec only
through an explicit redesign/admission decision that cites the affected
canonical unit IDs; otherwise align the implementation to the existing
canonical authority or track the mismatch as a defect. Do not promote bugs,
fail-open behavior, placeholder data writes, orphan surfaces, or
implementation-only behavior into authority.

Before making any change:

1. Read `.nimi/methodology/authority-authoring.yaml`.
2. Read only the affected `.nimi/spec/shijing/canonical/*.authority.yaml`
   containers or bounded `nimicoding authority context` output.
3. Read source code under `src/{domain,contracts,product}/**` to verify
   behavior or identify defects.

### Key Contracts

| Contract | Rule Family | Governs |
|----------|-------------|---------|
| `.nimi/spec/shijing/canonical/product.authority.yaml` | Product-level invariants |
| `.nimi/spec/shijing/canonical/data-model.authority.yaml` | ShiJingSpace and persisted product records |
| `.nimi/spec/shijing/canonical/astrology.authority.yaml` | Astrology outputs, boundaries, and anchor rules |
| `.nimi/spec/shijing/canonical/algorithm.authority.yaml` | Deterministic algorithm and Runtime-AI wording boundary |
| `.nimi/spec/shijing/canonical/ia.authority.yaml` | Information architecture |
| `.nimi/spec/shijing/canonical/removed-surfaces.authority.yaml` | Hard removals and exact-name guards |

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
- `validateReading` rejects any output that violates the canonical astrology
  invariants (summary length, subject-ref membership, `mirror_kind` /
  `mirror_scope` pairing, expired `inputs_summary`, forbidden phrases, or
  missing/extra fields).
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
- Runtime AI wording and consultation consume ShiJing's own App AIConfig through
  `client.ai.text.generateCandidate`; they never select or open a LocalAgent,
  create Runtime Agent conversation state, or depend on shared Agent AIConfig.
- `inputs_summary` on Reading is a frozen snapshot of the inputs at the time
  of generation and has its own expiry rules (`SJG-ASTRO`); stale summary →
  reject.

### IA Boundary

- Exactly six primary tabs, in widening-horizon order: `日镜` (rijing), `月镜`
  (yuejing), `年镜` (nianjing), `命镜` (mingjing), `合镜` (hejing), and
  `问镜` (shijing). See `rule.shijing.ia.r001` in
  `.nimi/spec/shijing/canonical/ia.authority.yaml`. `命镜` is the whole-life
  natal projection surface; `合镜` is the self-plus-one-Person relationship
  workbench governed by `rule.shijing.ia.r009`.
- No History tab. No customer management. No batch import/export. No project
  management vocabulary. See `rule.shijing.ia.r002` and
  `.nimi/spec/shijing/canonical/removed-surfaces.authority.yaml`.

### Subjects Boundary

- Subjects are `self` or `{ kind: "person", id }`. `Person` is an
  other-person astrology object only — it does NOT own conversations,
  events, views, focus themes, notification settings, or app lifecycle.
- Mirror readings are self-anchored by default. A related Person enters only
  through resolved concern tags, PlanItems, EventMemory references, or the
  exactly-one-Person HeJing workbench; no `View` or
  `CurrentObservationTarget` model may be reintroduced.

### Privacy Boundary

- Production and local-development shells persist through the admitted
  Runtime-owned App-private JSON partition. IndexedDB and in-memory adapters
  remain explicit test/preview-only components, not installed account truth.
  No cloud upload or third-party SDK data collection.
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

Start with: `.nimi/spec/shijing/canonical/`, `src/domain/`, `src/contracts/`,
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
  `tsconfig.json` opts in via `allowImportingTsExtensions: true`.
- Canonical hashing (`SJG-ALGO-11`) uses sha256 + json-c14n-v1 + NFC +
  utf-8 + hex-lowercase. The pure-JS implementation in
  `src/product/astrology/canonical-hash.ts` is the only authority; do not
  reintroduce `node:crypto` (it does not exist in the Vite/Tauri renderer).
- Tauri host glue is consumed from `nimi-shell-tauri` (crates.io).

<!-- nimicoding:managed:agents:start -->
# Nimi Coding Managed Block

- Product authority lives under `.nimi/spec/**`.
- For canonical authority authoring, read only `.nimi/methodology/authority-authoring.yaml`, the affected authority files or bounded task context, and CLI diagnostics.
- Use `nimicoding authority context <path> <id> --max-units <n> --max-bytes <n> --json` only for the complete declared outgoing interpretation closure; it is not complete task context, and failure never permits guessed or partial context.
- Use `nimicoding authority diff` and `authority impact` with explicit `--max-bytes`; impact reports declared review obligations and does not prove implementation, consumers, or tests are synchronized.
- Under `.nimi/spec/**`, author only closed multi-unit `*.authority.yaml` containers or single-unit `*.authority.md`; historical document formats are unsupported and never inferred.
- Run `nimicoding authority fmt` on each changed file, then `nimicoding authority check` on the complete authority input set.
- Never bypass a failure with inferred or fallback semantics; choose repair values only from product/task authority.
- Keep derived and verification evidence under `.nimi/local/**`; it is never product authority.
<!-- nimicoding:managed:agents:end -->
