# ShiJing Spec AGENTS.md

> Authoring rules for AI agents editing ShiJing product authority spec.

## Authority

- `.nimi/spec/shijing/kernel/**` is the only normative ShiJing product
  authority.
- `.nimi/spec/shijing/shijing.md`, `index.md`, `user-storybook.md`,
  `design-system.md`, and this file are guide-level documents and must not
  contradict kernel authority.
- `.nimi/{methodology,contracts,config}/**` is the nimicoding governance
  projection owned by `@nimiplatform/nimi-coding`, managed via
  `pnpm nimicoding sync`, and never hand-edited as ShiJing product truth.
- `.nimi/local/**` and `.nimi/cache/**` are local-only operational artifacts.

## Structure

```text
.nimi/spec/
  INDEX.md
  shijing/
    AGENTS.md
    index.md
    shijing.md
    user-storybook.md
    design-system.md
    kernel/
      index.md
      product-contract.md
      data-model-contract.md
      astrology-contract.md
      algorithm-contract.md
      ia-contract.md
      removed-surfaces-contract.md
      tables/
        concern-tag-catalog.yaml
        mirror-kind-scope-matrix.yaml
        mirror-output-contract.yaml
        memory-use-policy.yaml
        removed-surface-names.yaml
```

## Rule ID Format

`SJG-<DOMAIN>-<NN>` where DOMAIN is `PROD`, `DATA`, `ASTRO`, `ALGO`, `IA`,
or `REMOVED`. NN is zero-padded sequential per contract file. Rule IDs must
be unique across `.nimi/spec/shijing/kernel/**`.

## Hard Editing Rules

1. Do not reintroduce Profile, Venture, VentureNode, HuangliDaily, Report,
   monthly report, yearly report, trend chart, luck score, History tab,
   customer management, batch import, batch export, third-party consultant
   workflow, project-management vocabulary, View, ViewTemplate, View roster,
   View context item, View instruction, View memory, Relation, or
   CurrentObservationTarget as active product surfaces.
2. Do not implement runtime, source, validators, persistence, renderer code, or
   migrations inside a spec-only authority wave.
3. Do not move ShiJing authority out of `.nimi/spec/shijing/kernel/**`.
4. Do not invent parallel persisted astrology output entities. `Reading` is
   the only persisted astrology output entity.
5. `ShiJingSpace` must not contain a catalog snapshot or mutable product
   catalog truth.
6. Concern tags are projection intents, not persons, events, plans, tasks, or
   containers. At most five may be active.
7. Person remains first-class for natal inputs and consent posture, but Person
   must not own conversations, events, memories, plans, settings, focus themes,
   or lifecycle.
8. EventMemory and PlanItem are separate concepts. PlanItem must not acquire
   status, due/overdue, priority, dependency, progress, assignee, board,
   milestone, Gantt, or workflow semantics.
9. NianJing authority is phase bands plus inflection points only. Do not make
   K-line bars, numeric trend curves, luck scores, rankable daily/yearly
   numbers, or aggregated trend charts authoritative.
10. Runtime AI is an explanation/wording layer only. It must not become the
    astrology calculation owner for pillars, DaYun, true solar time, stage
    labels, key windows, tendency classes, phase bands, or inflection points.

## Source / Spec Coherence

For every concrete domain or contract change in `.nimi/spec/shijing/kernel/**`,
the matching `src/{domain,contracts,product}/**` and tests must be synchronized
before any source-consuming wave can close.

This authority cut intentionally leaves source synchronization pending. The
topic must record that W02+ implementation is blocked until source contracts,
validators, state, persistence, renderer surfaces, and tests catch up.

## Admitted tsconfig Drift

`tsconfig.json` carries `allowImportingTsExtensions: true`, `allowJs: true`,
and `checkJs: false` because Node 24 native TypeScript stripping requires
literal `.ts` file extensions in ESM import specifiers. This is the only
admitted drift from the workspace-app scaffold template; any further deviation
requires its own entry under this heading.
