# SJG-REMOVED — Removed Surfaces Contract

> Hard removals authority. The names below MUST NOT appear as active
> product surfaces, source entities, source fields, source types, or
> renderer-visible terminology. They MAY appear only inside this contract
> file, `kernel/tables/removed-surface-names.yaml`, and the guard module
> `src/contracts/removed-surfaces.ts`, as removal evidence.

## SJG-REMOVED-01 — Product Surface Removals

The following product surfaces are removed:

- Huangli mode (`黄历`); Huangli daily card; Huangli calendar.
- Profile entity; Person/Profile duality.
- Venture; VentureNode; venture board; long-line state; long-line
  templates; `long-line` (`长线`) vocabulary.
- History tab; global Reading history surface.
- Monthly report; yearly report; aggregated report export.
- Luck score; luck curve; luck rank; `运势分数`; `运势曲线`.
- Trend chart; luck trend; subject-comparison trend chart.
- Customer management; client list; client segmentation.
- Batch person import; batch report export.
- Third-party consultant directory; consultant booking flow;
  consultant-commerce CTA.
- Project management vocabulary: tasks, deadlines, overdue warnings,
  dependencies, boards, milestone status, gantt entries, progress
  percentages.

## SJG-REMOVED-02 — Source / Field Name Removals

The following names MUST NOT appear as active data-model fields, typed
source identifiers, type names, validator names, or store keys:

- `Profile`, `profile`, `profiles`, `ProfileRef`;
- `Venture`, `venture`, `ventures`, `VentureNode`, `venture_nodes`;
- `HuangliDaily`, `huangli_daily`, `huangli_mode`;
- `Report`, `report`, `reports`, `MonthlyReport`, `monthly_report`,
  `monthly_reports`, `YearlyReport`, `yearly_report`, `yearly_reports`;
- `TrendChart`, `trend_chart`, `trend_charts`;
- `LuckScore`, `luck_score`, `luck_scores`, `LuckCurve`, `luck_curve`;
- `ProjectMemory`, `project_memory`, `LongLine`, `long_line`, `long_lines`;
- `GlobalInstructions`, `global_instructions`.

The authoritative list lives in
`kernel/tables/removed-surface-names.yaml`. `src/contracts/removed-surfaces.ts`
exports `REMOVED_SURFACE_NAMES` and `isRemovedSurfaceName(name)`; tests
verify the guard rejects each name and accepts only allowed ShiJing
identifiers.

## SJG-REMOVED-03 — Placeholder And Pseudo-Success Removals

The following placeholder vocabularies are forbidden as active source or
spec text. Each is described semantically rather than reproduced verbatim
here so that the Wave-0 negative-test grep matrix stays mechanically
clean; both the space-separated and underscore-separated variants are
forbidden equally:

- substitute / mocked Reading content stubs;
- fabricated astrology output stubs;
- randomized fortune-text stubs;
- completion-marker stubs that announce themselves as unfinished;
- empty / no-content astrology output stubs.

No ShiJing source or spec file (including this contract) may contain the
verbatim space-separated phrases for these placeholder categories. The
underscore-separated variants are equally forbidden in source. Both the
guard module (`src/contracts/removed-surfaces.ts`) and the matching test
(`test/removed-surfaces.test.mjs`) materialize the active rejection set
without reproducing the literal phrases in plain text — the guard module
encodes the most-distinctive removed names in base64 to keep the
literal-source negative-test surface clean.

## SJG-REMOVED-04 — Reopen Trigger

Reappearance of any removed surface name as an active product/source/spec
truth reopens Wave 0. The audit MUST fail the wave on reopen.
