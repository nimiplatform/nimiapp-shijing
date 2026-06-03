# ShiJing Spec Index

ShiJing product authority is organized by active domain. Kernel markdown
files and typed tables under each domain carry product semantics;
top-level domain files are reading guides.

## Active Product Domains

- `shijing`

## Reading Order

1. Open `shijing/index.md` for the domain reading guide.
2. Open `shijing/kernel/index.md` for the authority map.
3. Open the relevant `shijing/kernel/*.md` contract for normative rules,
   then the matching `shijing/kernel/tables/*.yaml` if your change is
   table-shaped.
4. For implementation-bearing waves, update `/src/{domain,contracts,product}/**`
   and `/test/**` in the same change. A spec-only authority cut may leave
   source synchronization pending only when the topic records that downstream
   source-consuming waves are blocked until implementation catches up.

## Authority Rules

- `.nimi/spec/**` is the only normative source of ShiJing product
  authority.
- `.nimi/{methodology,contracts,config}/**` is the nimicoding governance
  projection — owned by `@nimiplatform/nimi-coding`, managed via
  `pnpm nimicoding sync`, never hand-edited.
- `.nimi/local/**` and `.nimi/cache/**` are local-only operational
  artifacts; they do not promote to product truth.
- `.nimi/topics/**`, when present, holds human-authored topic lifecycle
  reports; the canonical authority for any admitted contract still lives
  here under `.nimi/spec/shijing/kernel/**`.
