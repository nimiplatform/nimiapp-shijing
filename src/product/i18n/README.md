# ShiJing I18n Module Map

`copy.ts` is the public facade. Existing app code should keep importing from
this file unless it is editing the i18n implementation itself.

`copy-types.ts` is the public schema aggregator. The actual schema lives under
`schema/` and is split by product surface:

- `schema/base.ts` for cross-surface labels and settings/profile/memory copy.
- `schema/rijing.ts` for RiJing copy.
- `schema/shijing.ts` for ShiJing consultation copy.
- `schema/mingjing.ts` for MingJing copy.
- `schema/shared.ts` for shared type aliases and imported domain types.

Add or remove copy keys in the relevant schema module before editing language
payloads so TypeScript keeps `zh` and `en` aligned.

`copy-helpers.ts` owns shared formatting helpers used by language payloads.
Keep it free of renderer hooks and product state.

`copy.zh.ts` and `copy.en.ts` are language payload aggregators. The actual
payloads live under `zh/` and `en/`, split by the same product-surface boundary
as `schema/`. A user-facing copy change should update both locale folders in
the same change unless the missing locale is intentional and recorded in the
task.

Source-text tests that assert product wording should read the payload files, not
the `copy.ts` facade. Use `test/i18n-source.mjs` for recursive test reads so
tests stay stable when payload modules are split further.

Every `.ts` module under this folder must stay below the AI structure budget.
`test/i18n-structure.test.mjs` enforces this locally.
