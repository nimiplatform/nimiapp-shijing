# ShiJing Domain Guide

This file is a reading guide. ShiJing normative authority lives in
[kernel/index.md](kernel/index.md).

Reading path:

| Document | Role |
|----------|------|
| [kernel/index.md](kernel/index.md) | ShiJing kernel authority map (SJG-* rule families) |
| [shijing.md](shijing.md) | Product overview, positioning, root model snapshot |
| [AGENTS.md](AGENTS.md) | Authoring rules for AI agents editing this spec |
| [kernel/product-contract.md](kernel/product-contract.md) | `SJG-PROD-*` invariants |
| [kernel/data-model-contract.md](kernel/data-model-contract.md) | `SJG-DATA-*` entities |
| [kernel/astrology-contract.md](kernel/astrology-contract.md) | `SJG-ASTRO-*` reading kind/scope/output/uncertainty |
| [kernel/algorithm-contract.md](kernel/algorithm-contract.md) | `SJG-ALGO-*` pipeline, hashing, runtime-AI wording |
| [kernel/ia-contract.md](kernel/ia-contract.md) | `SJG-IA-*` four-tab IA + observation switcher |
| [kernel/removed-surfaces-contract.md](kernel/removed-surfaces-contract.md) | `SJG-REMOVED-*` hard removals |
| [kernel/tables/reading-kind-scope-matrix.yaml](kernel/tables/reading-kind-scope-matrix.yaml) | kind × scope cell admissions |
| [kernel/tables/view-template-catalog.yaml](kernel/tables/view-template-catalog.yaml) | admitted ViewTemplate seeds |
| [kernel/tables/removed-surface-names.yaml](kernel/tables/removed-surface-names.yaml) | hard-removed surface name catalog |

Implementation cross-references live in the project root under
`/src/{domain,contracts,product}/**` and `/test/**`. Every spec change
must keep the matching source modules in sync or open a dated drift
note in the relevant `kernel/*.md`.
