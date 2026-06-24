# ShiJing Settings CSS Decomposition Plan

Goal: split `src/styles-personal-data.css` into bounded settings-owned and feature-owned CSS files while preserving the current visual cascade.

Architecture:
- Keep `src/styles-personal-data.css` as a compatibility entrypoint for imports only during this refactor.
- Move shared settings shell and `sjp-*` primitives into `src/product/settings/*.css`.
- Move feature-specific styles next to the components that use them: self, persons, memories, concern-tags, natal, and onboarding.
- Keep portal-scoped drawer rules in a shared settings primitive file because drawers are rendered outside `.shijing-settings-page--styled`.
- Preserve existing selector bodies mechanically where possible; do not redesign visuals in this pass.

Files:
- Create `src/product/settings/settings-shell.css`: `.shijing-settings-page--styled`, page layout, subnav, settings module rail, page lede.
- Create `src/product/settings/settings-primitives.css`: shared `sjp-card`, buttons, common states, lede/tag, empty display.
- Create `src/product/settings/settings-forms.css`: shared `sjp-grid`, fields, inputs, DatePicker/Select alignment, notes, subpanels, collapse.
- Create `src/product/settings/settings-checks.css`: shared `sjp-check` and `sjp-inline-check` controls.
- Create `src/product/settings/settings-drawer.css`: portal drawer and drawer-scoped form/select/date/place/collapse rules.
- Create `src/product/settings/method-profile.css`: `.sjp-method-*` capability matrix.
- Create `src/product/self/self-editor.css`: `.sjp-profile`, `.sjp-stat`, self privacy/status/reminders, inline self form overrides.
- Create `src/product/persons/person-editor.css`: `.sjp-people*` list rules.
- Create `src/product/memories/memory-editor.css`: `.sjp-record*` list rules.
- Create `src/product/concern-tags/concern-tag-controls.css`: `.sjp-concern*`, inline add row.
- Create `src/product/natal/natal-fields.css`: `.sjp-place`, datetime alignment, birth wheel, natal collapse dependencies not already primitive.
- Create `src/product/onboarding/shijing-onboarding-settings.css`: onboarding-specific embedding override.
- Modify `src/styles-personal-data.css`: import the new files in cascade order.
- Modify `src/styles.css`: continue importing only `styles-personal-data.css`.
- Modify `test/style-architecture.test.mjs` and settings/natal related style tests to assert the new CSS ownership.

Execution order:
1. Add tests that fail while `styles-personal-data.css` still owns the monolith.
2. Split CSS by selector responsibility, preserving selector text and rule bodies.
3. Keep imports unlayered to avoid repeating the previous partial-layer cascade regression.
4. Run targeted style tests, full tests, typecheck, renderer build, and whitespace check.

Validation:
- `node --test test/style-architecture.test.mjs test/settings-page-nav.test.mjs test/settings-self.test.mjs test/onboarding-style.test.mjs`
- `pnpm test`
- `pnpm typecheck`
- `pnpm run build:renderer`
- `git diff --check`
