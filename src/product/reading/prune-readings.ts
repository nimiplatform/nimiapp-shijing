// Reading retention — bound the persisted Reading set so auto-generation
// (daily RiJing, rolling YueJing) can't grow it without limit.
//
// Two passes, both citation-safe (a Reading cited by a Conversation or by another
// Reading — e.g. a ShiJing consultation source — is never dropped):
//   1. dedup by input_hash: regenerating the identical query (same scope + tags +
//      method + prefs) supersedes the older copy; keep the newest.
//   2. cap per mirror_kind to the most recent N, so unbounded distinct-day history
//      still has a ceiling.
//
// Layer-3: keys on inputs_summary.input_hash + mirror_kind only; never on
// method_evidence / driver_refs.

import type { Reading } from '../../domain/reading.ts';
import type { Conversation } from '../../domain/conversation.ts';

export interface PruneReadingsOptions {
  readonly max_per_kind?: number;
}

export const DEFAULT_MAX_READINGS_PER_KIND = 60;

function citedReadingIds(readings: readonly Reading[], conversations: readonly Conversation[]): Set<string> {
  const protectedIds = new Set<string>();
  for (const c of conversations) {
    for (const id of c.source_reading_ids) protectedIds.add(id);
    for (const t of c.turns) for (const id of t.cited_reading_ids) protectedIds.add(id);
  }
  for (const r of readings) for (const id of r.cited_reading_ids) protectedIds.add(id);
  return protectedIds;
}

export function pruneReadings(
  readings: readonly Reading[],
  conversations: readonly Conversation[] = [],
  options: PruneReadingsOptions = {},
): Reading[] {
  const maxPerKind = options.max_per_kind ?? DEFAULT_MAX_READINGS_PER_KIND;
  const protectedIds = citedReadingIds(readings, conversations);

  // Pass 1 — dedup by input_hash, keeping the newest; protected readings are
  // exempt (their id is referenced, so they must survive verbatim).
  const newestByHash = new Map<string, Reading>();
  const kept: Reading[] = [];
  const ascending = [...readings].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  for (const r of ascending) {
    if (protectedIds.has(r.id)) { kept.push(r); continue; }
    const hash = r.inputs_summary.input_hash;
    const prev = newestByHash.get(hash);
    if (prev) {
      const i = kept.indexOf(prev);
      if (i >= 0) kept.splice(i, 1);
    }
    newestByHash.set(hash, r);
    kept.push(r);
  }

  // Pass 2 — cap per mirror_kind (newest first); protected readings always survive.
  const byKind = new Map<string, Reading[]>();
  for (const r of kept) {
    const list = byKind.get(r.mirror_kind) ?? [];
    list.push(r);
    byKind.set(r.mirror_kind, list);
  }
  const survivors = new Set<string>();
  for (const list of byKind.values()) {
    const descending = [...list].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    let count = 0;
    for (const r of descending) {
      if (count < maxPerKind || protectedIds.has(r.id)) {
        survivors.add(r.id);
        count += 1;
      }
    }
  }
  return kept.filter((r) => survivors.has(r.id));
}
