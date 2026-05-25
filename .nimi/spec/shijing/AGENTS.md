# ShiJing Spec — AGENTS.md

> Authoring rules for AI agents editing ShiJing product authority spec.

## Authority

- `.nimi/spec/shijing/**` is the only active normative source of ShiJing
  product authority. It owns the data model, IA, Astrology Contract,
  Astrology Algorithm Contract, safety boundary, view template catalog
  schema, and removed-surface contract.
- `.nimi/{methodology,contracts,config}/**` is the nimicoding governance
  projection — owned by `@nimiplatform/nimi-coding`, managed via
  `pnpm nimicoding sync`. NOT ShiJing product authority and never
  hand-edited.
- `.nimi/local/**` and `.nimi/cache/**` are local-only operational
  artifacts.
- `ADMISSION.md` is a developer-submitted review input, not platform
  admission truth.

## Structure

```
.nimi/spec/
├── INDEX.md                                  # cross-domain reading path
└── shijing/
    ├── AGENTS.md                             # this file
    ├── index.md                              # domain reading guide
    ├── shijing.md                            # product overview + root model
    └── kernel/
        ├── index.md                          # kernel authority map
        ├── product-contract.md               # SJG-PROD-*
        ├── data-model-contract.md            # SJG-DATA-*
        ├── astrology-contract.md             # SJG-ASTRO-*
        ├── algorithm-contract.md             # SJG-ALGO-*
        ├── ia-contract.md                    # SJG-IA-*
        ├── removed-surfaces-contract.md      # SJG-REMOVED-*
        └── tables/
            ├── reading-kind-scope-matrix.yaml
            ├── view-template-catalog.yaml
            └── removed-surface-names.yaml
```

## Rule ID Format

`SJG-<DOMAIN>-<NN>` where DOMAIN is `PROD`, `DATA`, `ASTRO`, `ALGO`, `IA`,
or `REMOVED`. NN is zero-padded sequential per file. Rule IDs must be
unique across the whole `.nimi/spec/shijing/**` tree.

## Hard Editing Rules

1. Do not reintroduce Profile, Venture, VentureNode, HuangliDaily, Report,
   monthly report, yearly report, trend chart, luck score, History tab,
   customer management, batch import, batch export, third-party consultant
   workflow, or project management vocabulary as active product surfaces.
   These names may appear only inside `removed-surfaces-contract.md` and
   `removed-surface-names.yaml` as explicit removal evidence.
2. Do not implement real astrology algorithm source inside a spec-only
   authority wave. Astrology Algorithm Contract v1 freezes method,
   canonicalization, feature, and uncertainty rules; executable source,
   runtime calls, and persistence migrations require their own downstream
   implementation packet.
3. Do not move ShiJing authority out of `.nimi/spec/shijing/**`.
4. Do not invent parallel reading entities. `Reading` is the only
   persisted astrology output entity.
5. `View.anchor_subject` must always be a member of `View.subjects`.
6. `Reading.kind` and `Reading.scope` are independent axes; pairings are
   constrained by `kernel/tables/reading-kind-scope-matrix.yaml`.
7. `response_preferences` is the only workspace-level instruction setting
   name. Do not introduce `global_instructions`, `project_memory`, or
   `long-line` terminology.
8. `ShiJingCatalog.view_templates[]` is product catalog authority. It is
   not user-space data and must not be modeled inside `ShiJingSpace`.
9. Subjects are `self` or `{ kind: "person", id }`. `Person` is an
   other-person astrology object only. `Person` does not own
   conversations, events, views, focus themes, notification settings, or
   app lifecycle.
10. Runtime AI is an explanation layer only. It must not become the
    astrology calculation owner for pillars, DaYun, true solar time,
    stage labels, or key windows.

## Source / Spec Coherence

For every concrete domain or contract change in `.nimi/spec/shijing/**`,
the matching `src/{domain,contracts}/**` source module must remain in
sync before any source-consuming wave can close.

A spec-only authority packet may intentionally leave source
synchronization pending when the packet explicitly forbids source writes.
In that case, the topic must record source synchronization as a
downstream implementation blocker, and no persistence/runtime/renderer
closeout may claim semantic closure until source contracts and validators
catch up.

## Admitted tsconfig Drift

`tsconfig.json` carries `allowImportingTsExtensions: true`,
`allowJs: true`, and `checkJs: false` because Node 24's native TypeScript
stripping (`--experimental-strip-types`, enabled by default in v24)
requires literal `.ts` file extensions in ESM `import` specifiers, and
the project's `pnpm test` script (`node --test test/*.test.mjs`) is the
test runner of record. Without these flags, tsc rejects the `.ts`
extension imports that Node requires at runtime. This is the only
admitted drift from the workspace-app scaffold template; any further
deviation requires its own entry under this heading.
