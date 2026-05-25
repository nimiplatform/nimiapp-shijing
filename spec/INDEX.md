# ShiJing Spec — INDEX

> Reading guide for ShiJing v0.8 product authority.

## Reading Path

1. `spec/shijing.md` — top-level product positioning and frozen root model.
2. `spec/kernel/product-contract.md` — product-level invariants (`SJG-PROD-*`).
3. `spec/kernel/data-model-contract.md` — data model (`SJG-DATA-*`):
   ShiJingSpace, self_subject, Person, SubjectRef, Relation, Event, View,
   Reading, Conversation, Settings, ShiJingCatalog, ViewTemplate.
4. `spec/kernel/astrology-contract.md` — Astrology Contract v1
   (`SJG-ASTRO-*`): inputs, kind/scope matrix, output structure, forbidden
   outputs, uncertainty surface, consultation anchor rules,
   `inputs_summary` expiry.
5. `spec/kernel/algorithm-contract.md` — Astrology Algorithm Contract v1
   (`SJG-ALGO-*`): v1 method stack, time windows, true-solar canonicalization,
   DaYun, deterministic feature snapshots, uncertainty decision table, and
   runtime AI wording boundary.
6. `spec/kernel/ia-contract.md` — information architecture (`SJG-IA-*`):
   exactly four primary tabs (`今日`, `视角`, `问时镜`, `我`),
   CurrentObservationTarget.
7. `spec/kernel/removed-surfaces-contract.md` — hard removals
   (`SJG-REMOVED-*`).

## Authoritative Tables

| Table | Governs |
|-------|---------|
| `kernel/tables/reading-kind-scope-matrix.yaml` | Valid combinations of `Reading.kind` and `Reading.scope`, plus per-cell anchor rules. |
| `kernel/tables/view-template-catalog.yaml` | `ShiJingCatalog.view_templates[]` schema and accepted entries. |
| `kernel/tables/removed-surface-names.yaml` | Names whose reappearance as active product/source must fail closed. |

## Source / Test Cross-References

| Spec | Source | Test |
|------|--------|------|
| `data-model-contract.md` (SubjectRef) | `src/domain/subject-ref.ts`, `src/contracts/subject-ref-validator.ts` | `test/subject-ref.test.mjs` |
| `data-model-contract.md` (View) | `src/domain/view.ts`, `src/contracts/view-validator.ts` | `test/view.test.mjs` |
| `astrology-contract.md` + matrix | `src/domain/reading.ts`, `src/domain/reading-matrix.ts`, `src/contracts/reading-validator.ts` | `test/reading.test.mjs` |
| `algorithm-contract.md` | downstream source sync required before persistence/runtime closeout | downstream implementation wave |
| `ia-contract.md` | `src/contracts/ia-contract.ts` | `test/ia-contract.test.mjs` |
| `removed-surfaces-contract.md` + removed-surface-names | `src/contracts/removed-surfaces.ts` | `test/removed-surfaces.test.mjs` |
| `data-model-contract.md` (ShiJingSpace) | `src/domain/shijing-space.ts`, `src/contracts/shijing-space-validator.ts` | `test/shijing-space.test.mjs` |
