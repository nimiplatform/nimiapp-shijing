# ShiJing Kernel Authority Map

This directory is the normative authority landing for ShiJing (时镜).

## Normative Surfaces

- `product-contract.md` (`SJG-PROD-*`): five-tab product invariants,
  MingJing-owned Relationship HePan admission, no-legacy hard cut, single
  Reading entity, concern-tag limit, Runtime AI boundary, no pseudo-success,
  no user-space catalog truth.
- `data-model-contract.md` (`SJG-DATA-*`): `ShiJingSpace`, `SelfSubject`,
  `Person`, `SubjectRef`, `ConcernTag`, `MentionRef`, `EventMemory`,
  `PlanItem`, `Reading`, `relationship_natal` MirrorScope, `Conversation`, and
  `Settings`.
- `astrology-contract.md` (`SJG-ASTRO-*`): mirror kinds/scopes, output
  structure including MingJing Relationship HePan, forbidden outputs,
  uncertainty surface, inputs snapshots, and Runtime boundary.
- `algorithm-contract.md` (`SJG-ALGO-*`): method profile registry
  (`bazi_ziping_v1`; `ziwei_sanhe_v1`), the MethodEngine port,
  mirror-window canonicalization, DaYun predicate, the feature snapshot envelope
  (`common` + `method_evidence`), memory policy boundary, canonical hashing, and
  Runtime AI wording boundary, feature-method support matrix, plus
  Relationship HePan deterministic evidence.
- `ia-contract.md` (`SJG-IA-*`): exactly five primary tabs: `日镜`, `月镜`,
  `年镜`, `命镜`, `时镜`, plus mandatory secondary Settings. `命镜` is the
  whole-life natal projection surface (SJG-IA-08 / SJG-ALGO-16) and owns the
  `relationship_hepan` secondary mode.
- `removed-surfaces-contract.md` (`SJG-REMOVED-*`): hard removals including
  old View/Focus/Relation/CurrentObservationTarget/catalog surfaces,
  reports, trend charts, luck scores, History, CRM, and project-management
  concepts.
- `tables/concern-tag-catalog.yaml`: built-in concern tags and active/archive
  rules.
- `tables/mirror-kind-scope-matrix.yaml`: valid mirror kind / scope pairings.
- `tables/mirror-output-contract.yaml`: required structured payloads.
- `tables/memory-use-policy.yaml`: memory and plan eligibility/disclosure.
- `tables/removed-surface-names.yaml`: names whose reappearance as active
  product/source/spec truth must fail closed.

## Guide-Only Documents

- `../../INDEX.md` is the cross-domain reading path.
- `../index.md` is the ShiJing domain guide.
- `../shijing.md` is the product overview and root model snapshot.
- `../user-storybook.md` is the guide-level storybook.
- `../design-system.md` is guide-level UI and interaction guidance.

## Authority Rules

- All `SJG-<DOMAIN>-NN` ids are unique across this kernel tree. DOMAIN is one
  of `PROD`, `DATA`, `ASTRO`, `ALGO`, `IA`, or `REMOVED`.
- Source code under `src/{domain,contracts,product}/**` and tests under
  `test/**` are currently out of sync by design because this is a spec-only
  authority cut. W02+ must synchronize source before any implementation,
  persistence, runtime, or renderer closeout can claim semantic closure.
- Runtime AI is an explanation and wording layer only. Pillars, DaYun,
  true-solar canonicalization, stage labels, key windows, YueJing tendency
  classes, NianJing phase bands, and NianJing inflection points belong to the
  deterministic pipeline.
- Removed-surface names must never reappear as active entities or fields. They
  may appear only as explicit removal evidence in this contract set, the
  removed-surface table, source guards, and tests.
