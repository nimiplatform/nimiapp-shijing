# SJG-REMOVED - Removed Surfaces Contract

Removed names must not appear as active product surfaces, source entities,
source fields, source types, validator names, store keys, renderer-visible
terminology, or spec authority except as explicit removal evidence in this
contract set, the removed-surface table, source guards, and tests.

## SJG-REMOVED-01 - Product Surface Removals

The following product surfaces are removed:

- Huangli mode, Huangli daily card, Huangli calendar.
- Profile entity and Person/Profile duality.
- Venture, VentureNode, venture board, long-line state, long-line templates.
- History tab and global Reading history surface.
- Monthly report, yearly report, report builder, and report export.
- Luck score, luck curve, luck rank, score trend, and percentile fortune.
- Trend chart, luck trend, subject-comparison trend chart, K-line authority.
- Customer management, client list, client segmentation, CRM workflows.
- Batch person import and batch report export.
- Third-party consultant directory, booking flow, consultant-commerce CTA.
- Project-management vocabulary and surfaces: tasks, deadlines, overdue,
  dependencies, boards, milestones, Gantt, progress, priorities, assignees.
- View, Focus, View workspace, ViewTemplate, View roster, View context item,
  View instruction, View memory, View time-window builder.
- Relation as an active entity or active UI surface.
- CurrentObservationTarget switcher.
- User-space catalog snapshot.

## SJG-REMOVED-02 - Source / Field Name Removals

The authoritative machine list lives in
`tables/removed-surface-names.yaml`. Downstream guards must reject every listed
name as active source/spec truth.

The guard is exact-symbol / exact-field / exact-surface matching, not
substring matching. The table also carries an explicit allowlist for admitted
names such as `EventMemory`, `event_memories`, `PlanItem`, and
`cited_plan_item_refs` so the old removed `Event` surface cannot accidentally
invalidate the new memory/plan model.

Generic discriminator names such as `kind` are not globally removed because
the new v1 model legally uses them. Old `Reading.kind`, `Reading.scope`, and
other retired Reading fields are guarded through the table's owner-scoped
removed fields and by the Reading validator.

## SJG-REMOVED-03 - Placeholder and Pseudo-Success Removals

Forbidden placeholder categories include:

- substitute or mocked Reading content;
- fabricated astrology output;
- randomized fortune text;
- completion-marker stubs;
- empty successful astrology output;
- runtime fallback copy;
- deterministic pipeline bypass copy.

No successful Reading may contain these categories.

## SJG-REMOVED-04 - NianJing Visual Boundary

NianJing phase bands and inflection points are admitted. Authoritative trend
charts, K-line bars, luck-score curves, rankable numeric series, and
aggregatable scores are removed. Decorative UI interpolation, if ever used,
must not be persisted, cited, or treated as product truth.

## SJG-REMOVED-05 - Reopen Trigger

Reappearance of any removed surface as active product/source/spec truth fails
the authority cut and reopens the topic.
