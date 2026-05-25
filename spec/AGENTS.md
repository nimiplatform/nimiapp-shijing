# ShiJing Spec — AGENTS.md

> Authoring rules for AI agents editing ShiJing product authority spec.

## Authority

- `spec/**` is the only active normative source of ShiJing product authority.
  It owns the data model, IA, Astrology Contract, Astrology Algorithm
  Contract, safety boundary, view template catalog schema, and removed-surface
  contract.
- `.nimi/**` is host-local nimicoding governance projection (scaffold +
  methodology + contracts + config). It is NOT ShiJing product authority.
- `ADMISSION.md` and any `.nimi/admission/**` are developer-submitted review
  inputs, not platform admission truth.

## Structure

```
spec/
├── AGENTS.md                              # this file
├── INDEX.md                               # reading path
├── shijing.md                             # top-level product spec
└── kernel/
    ├── product-contract.md                # SJG-PROD-*
    ├── data-model-contract.md             # SJG-DATA-*
    ├── astrology-contract.md              # SJG-ASTRO-*
    ├── algorithm-contract.md              # SJG-ALGO-*
    ├── ia-contract.md                     # SJG-IA-*
    ├── removed-surfaces-contract.md       # SJG-REMOVED-*
    └── tables/
        ├── reading-kind-scope-matrix.yaml
        ├── view-template-catalog.yaml
        └── removed-surface-names.yaml
```

## Rule ID Format

`SJG-<DOMAIN>-<NN>` where DOMAIN is `PROD`, `DATA`, `ASTRO`, `ALGO`, `IA`,
or `REMOVED`. NN is zero-padded sequential per file. Rule IDs must be unique
across the whole `spec/**` tree.

## Hard Editing Rules

1. Do not reintroduce Profile, Venture, VentureNode, HuangliDaily, Report,
   monthly report, yearly report, trend chart, luck score, History tab,
   customer management, batch import, batch export, third-party consultant
   workflow, or project management vocabulary as active product surfaces.
   These names may appear only inside `removed-surfaces-contract.md` and
   `removed-surface-names.yaml` as explicit removal evidence.
2. Do not implement real astrology algorithm source inside a spec-only
   authority wave. Astrology Algorithm Contract v1 may freeze method,
   canonicalization, feature, and uncertainty rules, but executable source,
   runtime calls, and persistence migrations require their own downstream
   implementation packet.
3. Do not move ShiJing authority out of `spec/**`.
4. Do not invent parallel reading entities. `Reading` is the only persisted
   astrology output entity.
5. `View.anchor_subject` must always be a member of `View.subjects`.
6. `Reading.kind` and `Reading.scope` are independent axes; pairings are
   constrained by `reading-kind-scope-matrix.yaml`.
7. `response_preferences` is the only workspace-level instruction setting
   name. Do not introduce `global_instructions`, `project_memory`, or
   `long-line` terminology.
8. `ShiJingCatalog.view_templates[]` is product catalog authority. It is not
   user-space data and must not be modeled inside `ShiJingSpace`.
9. Subjects are `self` or `{ kind: "person", id }`. `Person` is an
   other-person astrology object only. `Person` does not own conversations,
   events, views, focus themes, notification settings, or app lifecycle.
10. Runtime AI is an explanation layer only. It must not become the astrology
    calculation owner for pillars, DaYun, true solar time, stage labels, or key
    windows.

## Source / Spec Coherence

For every concrete domain or contract change in `spec/**`, the matching
`src/{domain,contracts}/**` source module must remain in sync before any
source-consuming wave can close.

A spec-only authority packet may intentionally leave source synchronization
pending when the packet explicitly forbids source writes. In that case, the
topic must record source synchronization as a downstream implementation
blocker, and no persistence/runtime/renderer closeout may claim semantic
closure until source contracts and validators catch up.

## Admitted Scaffold Drift

Wave 0 admits ONE tracked scaffold-managed-file drift: `tsconfig.json` adds
`allowImportingTsExtensions: true`, `allowJs: true`, and `checkJs: false`
to its `compilerOptions`. This is required because Node 24's native
TypeScript stripping (`--experimental-strip-types` enabled by default in
v24) requires literal `.ts` file extensions in ESM `import` specifiers,
and the scaffold-generated `pnpm test` script (`node --test
test/*.test.mjs`) is the test runner of record. Without this flag, tsc
rejects the `.ts` extension imports that Node requires at runtime.

This drift causes `nimi-app doctor` to report
`tsconfig.json: sha256 drift`. The drift is principled and tracked here.
The audit closure dimension `drift-resistance` accepts this single
admitted drift; any further drift requires its own admission entry under
this heading. The proper upstream fix is to land
`allowImportingTsExtensions: true` in the
`@nimiplatform/app-tools` workspace-app scaffold template; once that
lands, this app's tsconfig will re-align with the canonical scaffold
output and the drift entry can be removed.

The substring match `scaffoldProfile` in
`src/shell/auth/runtime-platform.ts` (which contains `Profile` as a
substring inside the scaffold-generated `scaffoldProfile = 'workspace-app'`
constant) is NOT product entity definition. The packet negative-test
language admits "no active entity definitions except explicit
removed-surface contract text"; scaffold metadata constants are neither.
This substring match is documented here so the audit can classify it
without further substring chasing.
