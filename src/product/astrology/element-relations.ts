// SJG-ALGO-08 — five-element (五行) classification for heavenly stems
// + 生克 transit-relative-to-natal-day-stem table used to derive
// cycle markers of kind `storage` | `resource` | `output` | `wealth` |
// `constraint` (per the SJG-ALGO-08 closed enum).
//
// Element mapping (standard):
//   jia / yi   → wood (木)   jia=yang, yi=yin
//   bing / ding → fire (火)  bing=yang, ding=yin
//   wu / ji    → earth (土)  wu=yang, ji=yin
//   geng / xin → metal (金)  geng=yang, xin=yin
//   ren / gui  → water (水)  ren=yang, gui=yin
//
// 生克 (transit element relative to the day-master / natal day stem):
//   transit == natal           → 比劫 ("same self")   → no marker (treated as 同我)
//   transit generates natal    → 印星 (resource)      → 'resource'
//   natal generates transit    → 食伤 (output)        → 'output'
//   transit controls natal     → 官杀 (constraint)    → 'constraint'
//   natal controls transit     → 财星 (wealth)        → 'wealth'
//
// 'storage' is reserved by SJG-ALGO-08 for natal-storage markers (墓库) and is
// not emitted by the transit five-element table here; it is reachable via
// other code paths (e.g. natal pillar-set storage detection) but the
// element-relations module owns only the transit-relation classification.

import type { HeavenlyStem } from '../../domain/algorithm.ts';

type MarkerKind = 'resource' | 'output' | 'constraint' | 'wealth';

export type FiveElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export const FIVE_ELEMENTS: readonly FiveElement[] = ['wood', 'fire', 'earth', 'metal', 'water'] as const;

export const STEM_TO_ELEMENT: Readonly<Record<HeavenlyStem, FiveElement>> = {
  jia: 'wood',
  yi: 'wood',
  bing: 'fire',
  ding: 'fire',
  wu: 'earth',
  ji: 'earth',
  geng: 'metal',
  xin: 'metal',
  ren: 'water',
  gui: 'water',
} as const;

// Classical generation cycle: wood -> fire -> earth -> metal -> water -> wood.
const GENERATES: Readonly<Record<FiveElement, FiveElement>> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
} as const;

// Classical control cycle: wood -> earth -> water -> fire -> metal -> wood.
const CONTROLS: Readonly<Record<FiveElement, FiveElement>> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
} as const;

export function elementGenerates(a: FiveElement, b: FiveElement): boolean {
  return GENERATES[a] === b;
}

export function elementControls(a: FiveElement, b: FiveElement): boolean {
  return CONTROLS[a] === b;
}

export type TransitElementRelation = 'same' | 'resource' | 'output' | 'constraint' | 'wealth';

/**
 * Classify a transit stem relative to the natal day stem (day-master).
 *
 * Returns one of:
 *   - 'same'       (比劫): transit element equals natal day-master element
 *   - 'resource'   (印星): transit generates natal day-master element
 *   - 'output'     (食伤): natal day-master element generates transit element
 *   - 'constraint' (官杀): transit element controls natal day-master element
 *   - 'wealth'     (财星): natal day-master element controls transit element
 */
export function classifyTransitToDayStem(
  transitStem: HeavenlyStem,
  natalDayStem: HeavenlyStem,
): TransitElementRelation {
  const transitEl = STEM_TO_ELEMENT[transitStem];
  const natalEl = STEM_TO_ELEMENT[natalDayStem];
  if (transitEl === natalEl) return 'same';
  if (elementGenerates(transitEl, natalEl)) return 'resource';
  if (elementGenerates(natalEl, transitEl)) return 'output';
  if (elementControls(transitEl, natalEl)) return 'constraint';
  if (elementControls(natalEl, transitEl)) return 'wealth';
  // The five-element graph is closed, so this is unreachable when inputs
  // are valid HeavenlyStem values. Fail-close to make any future enum drift
  // visible immediately rather than returning a misleading default.
  throw new Error(
    `classifyTransitToDayStem: unreachable five-element relation between ${transitStem} (${transitEl}) and ${natalDayStem} (${natalEl})`,
  );
}

/**
 * Map a non-'same' transit element relation onto the closed
 * `CycleMarkerKind` enum from SJG-ALGO-08. Returns null for 'same'
 * (no marker is emitted for 比劫 transits in v1).
 */
export function transitRelationToMarkerKind(
  relation: TransitElementRelation,
): MarkerKind | null {
  switch (relation) {
    case 'same':
      return null;
    case 'resource':
      return 'resource';
    case 'output':
      return 'output';
    case 'constraint':
      return 'constraint';
    case 'wealth':
      return 'wealth';
  }
}
