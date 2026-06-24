# ShiJing CSS Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move ShiJing CSS from large page-era stylesheets into an explicit layered architecture with shared primitives and feature-owned rich surface files.

**Architecture:** `src/styles.css` remains the only global CSS entrypoint and owns Kit/theme imports, layer ordering, global tokens, and app shell basics. `src/styles-mirror-v1.css` owns only mirror shell, tab chrome, baseline form/list/card primitives, shared settings, citation/failure/import controls, and account menu. Rich mirror details move under `src/product/tabs/**`, with shared cross-mirror primitives under `src/product/tabs/shared/**`.

**Tech Stack:** React 19 renderer, Vite 7 CSS imports, plain CSS, Node `node:test` style-contract tests.

---

## File Structure

### Global Entry And Shared Shell

- Modify `src/styles.css`: keep Kit/theme/Tailwind imports, declare app CSS layer order, import the new shared and feature CSS files, and retain only `:root`, `html/body/#root`, `.shijing-app`, `.shijing-app__body`, and integrated shell body basics.
- Modify `src/styles-mirror-v1.css`: retain only shell, topbar, primary tabbar, `.shijing-tab` baseline typography/forms/lists/cards, concern tag controls, shared citation drawer, failure banner, import button, account menu, settings page, editor form baseline, and responsive shell/settings layout.
- Keep `src/styles-mirror-header.css`: shared mirror page header primitive.
- Move `src/styles-shared-surfaces.css` to `src/product/tabs/shared/mirror-primitives.css`: aurora shell background, transparent topbar chrome, shared glass tokens, shared concern/context editor primitives.

### Feature-Owned CSS

- Create `src/product/tabs/rijing/rijing-shell.css`: RiJing root variables, surface reset, date/header actions, empty-tag state.
- Create `src/product/tabs/rijing/rijing-onboarding.css`: onboarding shell, stepper, workbench, inline self-editor layout, mobile confirmation dock.
- Create `src/product/tabs/rijing/rijing-hero.css`: daily hero, energy meter, tendency pill, read-more, wish block.
- Create `src/product/tabs/rijing/rijing-projections.css`: concern lens, concern editor local styling, projection frames.
- Create `src/product/tabs/rijing/rijing-event-input.css`: daily event input and reference-event list.
- Create `src/product/tabs/rijing/rijing-actions.css`: daily action cards.
- Create `src/product/tabs/rijing/rijing-evidence.css`: data/evidence bar and detail panel.
- Create `src/product/tabs/rijing/rijing-responsive.css`: RiJing media queries.

- Create `src/product/tabs/yuejing/yuejing-shell.css`: YueJing root variables, surface reset, header actions, notice/stale state.
- Create `src/product/tabs/yuejing/yuejing-hero.css`: today hero and per-concern hero rows.
- Create `src/product/tabs/yuejing/yuejing-filters.css`: filter row, legend, concern editor local styling.
- Create `src/product/tabs/yuejing/yuejing-calendar.css`: weekday row, 30-day grid, day face states, selected/today/past states.
- Create `src/product/tabs/yuejing/yuejing-panel-shell.css`: panel backdrop/shell/close/header.
- Create `src/product/tabs/yuejing/yuejing-month-mainline.css`: monthly summary sections, mainline, primary tendency, rhythm grid, and stats.
- Create `src/product/tabs/yuejing/yuejing-month-windows.css`: key date windows and context.
- Create `src/product/tabs/yuejing/yuejing-month-timeline.css`: 30-day rhythm timeline.
- Create `src/product/tabs/yuejing/yuejing-month-concerns.css`: monthly concern action cards.
- Create `src/product/tabs/yuejing/yuejing-month-closing.css`: closing reminders, generation counts, and evidence disclosure.
- Create `src/product/tabs/yuejing/yuejing-day-panel.css`: day tendencies, day entry, day records, and panel responsive rules.
- Create `src/product/tabs/yuejing/yuejing-concerns.css`: bottom concern bar and details summary.

- Create `src/product/tabs/nianjing/nianjing-shell.css`: NianJing root variables, surface reset, header actions, notice/stale state.
- Create `src/product/tabs/nianjing/nianjing-hero.css`: current-phase hero and per-concern hero rows.
- Create `src/product/tabs/nianjing/nianjing-filters.css`: filter row, legend, concern editor local styling.
- Create `src/product/tabs/nianjing/nianjing-year-overview.css`: annual module matrix.
- Create `src/product/tabs/nianjing/nianjing-phase-list.css`: legacy baseline phase-band and inflection list rules that are still NianJing-owned.
- Create `src/product/tabs/nianjing/nianjing-timeline-base.css`: legacy baseline timeline lane/band/marker rules that must load before the rich timeline.
- Create `src/product/tabs/nianjing/nianjing-timeline.css`: rich long-horizon timeline, lanes, bands, markers, footer summary, responsive rules.
- Create `src/product/tabs/nianjing/nianjing-drawer.css`: inflection drawer and band detail drawer content.
- Create `src/product/tabs/nianjing/nianjing-recorder.css`: phase/inflection event recorder.

- Create `src/product/tabs/mingjing/mingjing-shell.css`: MingJing root variables, surface reset, onboarding shell variant, MingJing shell background.
- Create `src/product/tabs/mingjing/mingjing-hero.css`: legacy tab hero, natal overview hero, footer CTA, readiness/failure.
- Create `src/product/tabs/mingjing/mingjing-panels.css`: panel shell, anchors, info buttons/bubbles, shared element color mapping.
- Create `src/product/tabs/mingjing/mingjing-paipan.css`: BaZi paipan and five-element distribution.
- Create `src/product/tabs/mingjing/mingjing-geju.css`: natal pattern/geju cards.
- Create `src/product/tabs/mingjing/mingjing-dayun.css`: DaYun list, intro, timeline, mobile rules.
- Create `src/product/tabs/mingjing/mingjing-liunian.css`: future-year windows and evidence.
- Create `src/product/tabs/mingjing/mingjing-events.css`: historical event recorder.
- Create `src/product/tabs/mingjing/mingjing-reading.css`: AI reading and relationship hepan reading surfaces.
- Create `src/product/tabs/mingjing/mingjing-rectify.css`: birth-time rectification.
- Create `src/product/tabs/mingjing/mingjing-responsive.css`: MingJing surface media queries.

- Create `src/product/tabs/shijing/shijing-ask-shell.css`: consultation root, main padding, layout container.
- Create `src/product/tabs/shijing/shijing-ask-hero.css`: consultation hero/title/subtitle.
- Create `src/product/tabs/shijing/shijing-ask-rail.css`: history rail, search, filters, session groups.
- Create `src/product/tabs/shijing/shijing-ask-composer.css`: main column, composer, seed context, textarea, toolbar, submit button.
- Create `src/product/tabs/shijing/shijing-ask-context.css`: archive tray, context focus bar, context editor local styling, prompt chips.
- Create `src/product/tabs/shijing/shijing-ask-thread.css`: result thread and user/AI turns.
- Create `src/product/tabs/shijing/shijing-concern-bar.css`: shared bottom concern bar styles used by the consultation surface.

### Tests

- Modify `test/style-architecture.test.mjs`: assert `src/styles.css` imports feature CSS through the declared layer order; assert old rich CSS files are not imported; assert `src/styles-mirror-v1.css` has no concrete Ri/Yue/Nian/Ming/Ask rich surface selectors; assert feature files stay below explicit line budgets.
- Modify `test/rijing-layout.test.mjs`: read RiJing feature CSS bundle from `src/product/tabs/rijing/*.css` plus shared primitives.
- Modify `test/onboarding-style.test.mjs`: read onboarding CSS from `src/product/tabs/rijing/rijing-onboarding.css` and keep `src/styles-personal-data.css` checks unchanged.
- Modify `test/shijing-ask-style.test.mjs`: read Ask feature CSS bundle from `src/product/tabs/shijing/*.css` plus shared primitives.
- Modify `test/mingjing-layout.test.mjs`, `test/mingjing-readable-explanations.test.mjs`, and `test/mingjing-relationship-ui.test.mjs`: read MingJing feature CSS bundle from `src/product/tabs/mingjing/*.css`.
- Modify `test/nianjing-visualization.test.mjs`: read NianJing feature CSS bundle from `src/product/tabs/nianjing/*.css`, and assert timeline selectors no longer live in `src/styles-mirror-v1.css`.
- Keep `test/mirror-page-header.test.mjs` on `src/styles-mirror-header.css`, but update the import assertion if `styles.css` uses layered import syntax.

---

## Tasks

### Task 1: Add Architecture Contract Tests

**Files:**
- Modify: `test/style-architecture.test.mjs`
- Modify: `test/nianjing-visualization.test.mjs`

- [ ] Extend `test/style-architecture.test.mjs` so it expects feature CSS imports under `src/product/tabs/**`, rejects old rich CSS imports, rejects concrete rich selectors in `src/styles-mirror-v1.css`, and enforces feature file line budgets.
- [ ] Update `test/nianjing-visualization.test.mjs` so timeline selectors must be read from the NianJing feature bundle, not `src/styles-mirror-v1.css`.
- [ ] Run `node --test test/style-architecture.test.mjs test/nianjing-visualization.test.mjs`.
- [ ] Expected result before migration: fail because `styles.css` still imports old rich files and `styles-mirror-v1.css` still owns concrete YueJing/NianJing/RiJing selectors.

### Task 2: Move Shared Primitives

**Files:**
- Create: `src/product/tabs/shared/mirror-primitives.css`
- Delete: `src/styles-shared-surfaces.css`
- Modify: `src/styles.css`
- Modify: `test/style-architecture.test.mjs`
- Modify: `test/rijing-layout.test.mjs`
- Modify: `test/shijing-ask-style.test.mjs`
- Modify: `test/mingjing-layout.test.mjs`

- [ ] Move shared aurora, topbar chrome, glass tokens, and concern/context editor primitives into `src/product/tabs/shared/mirror-primitives.css`.
- [ ] Update all tests that read `src/styles-shared-surfaces.css` to read `src/product/tabs/shared/mirror-primitives.css`.
- [ ] Import `src/product/tabs/shared/mirror-primitives.css` from `src/styles.css` before all feature CSS imports.

### Task 3: Split RiJing CSS

**Files:**
- Create: `src/product/tabs/rijing/rijing-shell.css`
- Create: `src/product/tabs/rijing/rijing-onboarding.css`
- Create: `src/product/tabs/rijing/rijing-hero.css`
- Create: `src/product/tabs/rijing/rijing-projections.css`
- Create: `src/product/tabs/rijing/rijing-event-input.css`
- Create: `src/product/tabs/rijing/rijing-actions.css`
- Create: `src/product/tabs/rijing/rijing-evidence.css`
- Create: `src/product/tabs/rijing/rijing-responsive.css`
- Delete: `src/styles-rijing-rich.css`
- Modify: `src/styles.css`
- Modify: `test/rijing-layout.test.mjs`
- Modify: `test/onboarding-style.test.mjs`

- [ ] Move RiJing CSS blocks without changing selectors.
- [ ] Import the new RiJing files in the same relative order as the original file.
- [ ] Update RiJing tests to read the new bundle.

### Task 4: Split YueJing CSS

**Files:**
- Create: `src/product/tabs/yuejing/yuejing-shell.css`
- Create: `src/product/tabs/yuejing/yuejing-hero.css`
- Create: `src/product/tabs/yuejing/yuejing-filters.css`
- Create: `src/product/tabs/yuejing/yuejing-calendar.css`
- Create: `src/product/tabs/yuejing/yuejing-panel-shell.css`
- Create: `src/product/tabs/yuejing/yuejing-month-mainline.css`
- Create: `src/product/tabs/yuejing/yuejing-month-windows.css`
- Create: `src/product/tabs/yuejing/yuejing-month-timeline.css`
- Create: `src/product/tabs/yuejing/yuejing-month-concerns.css`
- Create: `src/product/tabs/yuejing/yuejing-month-closing.css`
- Create: `src/product/tabs/yuejing/yuejing-day-panel.css`
- Create: `src/product/tabs/yuejing/yuejing-concerns.css`
- Delete: `src/styles-yuejing-rich.css`
- Modify: `src/styles.css`

- [ ] Move YueJing CSS blocks without changing selectors.
- [ ] Import the new YueJing files in the same relative order as the original file.

### Task 5: Split NianJing CSS

**Files:**
- Create: `src/product/tabs/nianjing/nianjing-shell.css`
- Create: `src/product/tabs/nianjing/nianjing-hero.css`
- Create: `src/product/tabs/nianjing/nianjing-filters.css`
- Create: `src/product/tabs/nianjing/nianjing-year-overview.css`
- Create: `src/product/tabs/nianjing/nianjing-phase-list.css`
- Create: `src/product/tabs/nianjing/nianjing-timeline-base.css`
- Create: `src/product/tabs/nianjing/nianjing-timeline.css`
- Create: `src/product/tabs/nianjing/nianjing-drawer.css`
- Create: `src/product/tabs/nianjing/nianjing-recorder.css`
- Delete: `src/styles-nianjing-rich.css`
- Modify: `src/styles.css`
- Modify: `test/nianjing-visualization.test.mjs`

- [ ] Move NianJing CSS blocks without changing selectors.
- [ ] Import the new NianJing files in the same relative order as the original file.
- [ ] Update NianJing tests to read the new feature bundle.

### Task 6: Split MingJing CSS

**Files:**
- Create: `src/product/tabs/mingjing/mingjing-shell.css`
- Create: `src/product/tabs/mingjing/mingjing-hero.css`
- Create: `src/product/tabs/mingjing/mingjing-panels.css`
- Create: `src/product/tabs/mingjing/mingjing-paipan.css`
- Create: `src/product/tabs/mingjing/mingjing-geju.css`
- Create: `src/product/tabs/mingjing/mingjing-dayun.css`
- Create: `src/product/tabs/mingjing/mingjing-liunian.css`
- Create: `src/product/tabs/mingjing/mingjing-events.css`
- Create: `src/product/tabs/mingjing/mingjing-reading.css`
- Create: `src/product/tabs/mingjing/mingjing-rectify.css`
- Create: `src/product/tabs/mingjing/mingjing-responsive.css`
- Delete: `src/styles-mingjing-rich.css`
- Modify: `src/styles.css`
- Modify: `test/mingjing-layout.test.mjs`
- Modify: `test/mingjing-readable-explanations.test.mjs`
- Modify: `test/mingjing-relationship-ui.test.mjs`

- [ ] Move MingJing CSS blocks without changing selectors.
- [ ] Import the new MingJing files in the same relative order as the original file.
- [ ] Update MingJing tests to read the new feature bundle.

### Task 7: Split ShiJing Consultation CSS

**Files:**
- Create: `src/product/tabs/shijing/shijing-ask-shell.css`
- Create: `src/product/tabs/shijing/shijing-ask-hero.css`
- Create: `src/product/tabs/shijing/shijing-ask-rail.css`
- Create: `src/product/tabs/shijing/shijing-ask-composer.css`
- Create: `src/product/tabs/shijing/shijing-ask-context.css`
- Create: `src/product/tabs/shijing/shijing-ask-thread.css`
- Create: `src/product/tabs/shijing/shijing-concern-bar.css`
- Delete: `src/styles-shijing-rich.css`
- Modify: `src/styles.css`
- Modify: `test/shijing-ask-style.test.mjs`

- [ ] Move Ask ShiJing CSS blocks without changing selectors.
- [ ] Import the new Ask files in the same relative order as the original file.
- [ ] Update Ask tests to read the new feature bundle.

### Task 8: Remove Concrete Mirror Rules From Mirror v1

**Files:**
- Modify: `src/styles-mirror-v1.css`
- Modify: feature CSS files under `src/product/tabs/rijing`, `src/product/tabs/yuejing`, `src/product/tabs/nianjing`, and `src/product/tabs/shijing`

- [ ] Move remaining concrete `.shijing-rijing__*`, `.shijing-yuejing__*`, `.shijing-nianjing__*`, and `.shijing-shijing__*` rules out of `src/styles-mirror-v1.css`.
- [ ] Keep generic `.shijing-shell`, `.shijing-topbar`, `.shijing-primary-tabbar`, `.shijing-shell__main`, `.shijing-tab`, `.shijing-concern-tags`, shared settings, citation/failure/import, account, and editor baseline selectors in `src/styles-mirror-v1.css`.

### Task 9: Verification

**Files:**
- Modify only tests needed to read the new CSS bundles.

- [ ] Run `node --test test/style-architecture.test.mjs test/onboarding-style.test.mjs test/shijing-ask-style.test.mjs test/mingjing-layout.test.mjs test/mirror-page-header.test.mjs test/nianjing-visualization.test.mjs test/rijing-layout.test.mjs test/yuejing-month-panel.test.mjs test/mingjing-readable-explanations.test.mjs test/mingjing-relationship-ui.test.mjs`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm run build:renderer`.
- [ ] Run `git diff --check`.
- [ ] If the local dev server is already running, request `http://127.0.0.1:1430/src/styles.css` and confirm the bundled stylesheet still includes the new feature imports.

## Acceptance Criteria

- `src/styles.css` imports no `src/styles-*-rich.css` files.
- `src/styles.css` contains global tokens and app shell basics only after imports.
- `src/styles-mirror-v1.css` contains no concrete `.shijing-rijing__*`, `.shijing-yuejing__*`, `.shijing-nianjing__*`, `.shijing-mingjing__*`, `.shijing-ask__*`, or `.shijing-shijing__*` rich selectors.
- Shared primitives live in `src/product/tabs/shared/mirror-primitives.css`.
- Mirror-specific rich CSS lives under `src/product/tabs/{rijing,yuejing,nianjing,mingjing,shijing}/`.
- No feature CSS file exceeds the line budget enforced by `test/style-architecture.test.mjs`.
- Existing visual/style contract tests pass after reading the new CSS bundles.
- No renderer TypeScript, product semantics, astrology pipeline, or persistence behavior changes are introduced by this CSS refactor.
