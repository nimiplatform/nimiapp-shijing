# ShiJing Domain Guide

This file is a reading guide. Normative ShiJing authority lives in
[kernel/index.md](kernel/index.md).

## Reading Path

| Document | Role |
| --- | --- |
| [kernel/index.md](kernel/index.md) | Kernel authority map and source-sync status |
| [shijing.md](shijing.md) | Product overview and root model snapshot |
| [user-storybook.md](user-storybook.md) | Guide-level user stories and acceptance expectations |
| [design-system.md](design-system.md) | Guide-level four-mirror UI and interaction rules |
| [AGENTS.md](AGENTS.md) | Spec authoring rules |
| [kernel/product-contract.md](kernel/product-contract.md) | `SJG-PROD-*` product invariants |
| [kernel/data-model-contract.md](kernel/data-model-contract.md) | `SJG-DATA-*` data entities and invariants |
| [kernel/astrology-contract.md](kernel/astrology-contract.md) | `SJG-ASTRO-*` mirror reading contracts |
| [kernel/algorithm-contract.md](kernel/algorithm-contract.md) | `SJG-ALGO-*` deterministic pipeline and Runtime AI boundary |
| [kernel/algorithm-feature-snapshot-shape.md](kernel/algorithm-feature-snapshot-shape.md) | SJG-ALGO-08 feature snapshot field-level shape appendix |
| [kernel/ia-contract.md](kernel/ia-contract.md) | `SJG-IA-*` four-mirror IA |
| [kernel/removed-surfaces-contract.md](kernel/removed-surfaces-contract.md) | `SJG-REMOVED-*` hard removals |
| [kernel/tables/concern-tag-catalog.yaml](kernel/tables/concern-tag-catalog.yaml) | Built-in concern tags and tag rules |
| [kernel/tables/mirror-kind-scope-matrix.yaml](kernel/tables/mirror-kind-scope-matrix.yaml) | Legal mirror kind / scope combinations |
| [kernel/tables/mirror-output-contract.yaml](kernel/tables/mirror-output-contract.yaml) | Structured output requirements by mirror |
| [kernel/tables/memory-use-policy.yaml](kernel/tables/memory-use-policy.yaml) | Memory and plan eligibility / disclosure policy |
| [kernel/tables/removed-surface-names.yaml](kernel/tables/removed-surface-names.yaml) | Hard-removed name catalog |

## Implementation Status

This authority cut intentionally does not edit source. Source synchronization
is a downstream W02+ blocker for `/src/{domain,contracts,product}/**` and
`/test/**`. No source-consuming wave may claim semantic closure until the code
matches this spec.
