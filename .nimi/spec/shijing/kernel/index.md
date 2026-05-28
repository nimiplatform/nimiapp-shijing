# ShiJing Kernel Authority Map

This directory is the normative authority landing for ShiJing (时镜).

Normative surfaces:

- `product-contract.md` for product-level invariants (`SJG-PROD-*`): single
  authority, embedded app boundary, personal-scale posture, single Reading
  entity, single workspace-instruction name, ViewTemplate as catalog,
  Runtime boundary, no pseudo-success, no algorithm stub.
- `data-model-contract.md` for `ShiJingSpace`, `SelfSubject`, `Person`,
  `SubjectRef`, `Relation`, `Event`, `View`, `Reading`, `Conversation`,
  `Settings`, `ShiJingCatalog`, `ViewTemplate` (`SJG-DATA-*`).
- `astrology-contract.md` for Astrology Contract v1 (`SJG-ASTRO-*`): reading
  kinds, reading scopes, kind/scope matrix anchor rules, output structure,
  forbidden outputs, uncertainty surface, consultation anchor rules,
  inputs_summary expiry.
- `algorithm-contract.md` for Astrology Algorithm Contract v1
  (`SJG-ALGO-*`): v1 method stack `bazi_ganzhi_jieqi_dayun_v1`, pipeline
  stages, time-window canonicalization, true-solar correction, DaYun
  derivation, deterministic feature snapshots, uncertainty decision
  table, canonical hashing, Runtime AI wording boundary.
- `ia-contract.md` for information architecture (`SJG-IA-*`): exactly four
  primary tabs (`今日`, `关注`, `问时镜`, `我`), CurrentObservationTarget
  switcher, stable tab ids, no removed tabs.
- `removed-surfaces-contract.md` for hard removals (`SJG-REMOVED-*`):
  Profile, Venture, HuangliDaily, Report, monthly/yearly report, trend
  chart, luck score, History tab, customer management, batch import/export,
  long-line, etc.
- `tables/reading-kind-scope-matrix.yaml` for valid `Reading.kind` ×
  `Reading.scope` combinations and per-cell anchor rules.
- `tables/view-template-catalog.yaml` for
  `ShiJingCatalog.view_templates[]` schema and accepted entries.
- `tables/removed-surface-names.yaml` for names whose reappearance as
  active product/source must fail closed.

Guide-only documents:

- `../INDEX.md` (`.nimi/spec/INDEX.md`) is the cross-domain reading path
  for humans.
- `../index.md` (`.nimi/spec/shijing/index.md`) is the ShiJing domain
  guide.
- `../shijing.md` is the product overview, positioning, and root-model
  snapshot.

Authority rules:

- All `SJG-<DOMAIN>-NN` ids are unique across this kernel tree. Domain ∈
  {`PROD`, `DATA`, `ASTRO`, `ALGO`, `IA`, `REMOVED`}.
- Implementation code under `src/{domain,contracts,product}/**` must stay
  in sync with these kernel surfaces; a spec edit must update the matching
  validators / generators in the same change, or open a dated drift note
  here.
- The Runtime AI wording layer (`SJG-ALGO-12`) is an explanation layer
  only. Pillars, DaYun, true-solar canonicalization, stage labels, and
  key windows belong to the deterministic pipeline.
- Removed-surface names (`SJG-REMOVED-*`) must never reappear in source as
  active entities or fields; the `removed-surfaces` validator + tests are
  the mechanical guard.
