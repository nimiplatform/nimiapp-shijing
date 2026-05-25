// SJG-DATA-04 — dangling-reference detector for Relation deletion.
// Per the brief, Relations are referenced from `view.context_items`
// (the only structural slot a downstream entity exposes for relation
// ids) and from `Reading.inputs_summary.relation_summaries` (a frozen
// snapshot whose lifecycle is governed by SJG-ASTRO-09 — snapshots do
// not block live deletion).  We therefore walk view.context_items only.
//
// A view.context_item is shaped (SJG-DATA-06):
//   { id, kind: 'note' | 'document' | 'event_ref', body: string }
// Relation references inside a view manifest as a context item whose
// body exact-matches the relation id (event_ref is the structured
// slot; for non-event_ref kinds an exact body match still counts as a
// dangling reference rather than letting silent deletion break the
// reading-side narrative integrity).

import type { ShiJingSpace } from '../../domain/shijing-space.ts';

export interface RelationReference {
  readonly via: string;
  readonly relation_id: string;
}

export function findReferencesToRelation(
  space: ShiJingSpace,
  relationId: string,
): readonly RelationReference[] {
  const matches: RelationReference[] = [];
  for (const view of space.views) {
    for (const item of view.context_items) {
      if (item.body === relationId) {
        matches.push({
          via: `view:${view.id}:context_items:${item.id}`,
          relation_id: relationId,
        });
      }
    }
  }
  return matches;
}
