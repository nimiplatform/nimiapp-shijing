// Bundled offline place gazetteer + ranked search.
//
// Local-first: no network/geocoding API (the app keeps all data on-device).
// A user types a place name and picks a candidate; the editor then auto-fills
// latitude / longitude / IANA time zone, so nobody has to know raw coordinates.
//
// Two bundled datasets are merged:
//   • cn-gazetteer.data.json — county-level mainland China coverage (3306 rows:
//     4 直辖市 / 342 地级市 / 2960 县级), compact `{n, r, lat, lng, l}` shape.
//     Source: Sanotsu/regional-coordinates-of-China (BD-09; <1 km from WGS-84,
//     far below any 时柱 boundary risk). All mainland zones are Asia/Shanghai.
//     Administrative placeholder names (市辖区 / 县 …) are pre-filtered, and
//     municipality double-listings collapse to one entry. Build with
//     scripts/prepare-cn-gazetteer.cjs.
//   • gazetteer.data.json — HK/Macau/Taiwan + common overseas cities, each with
//     pinyin/English aliases and its own IANA time zone. Mainland cities are
//     intentionally NOT duplicated here — they live in the CN dataset above.
//
// Both are normalised to one GazetteerEntry shape and indexed at module load.

import cnData from './cn-gazetteer.data.json' with { type: 'json' };
import overseasData from './gazetteer.data.json' with { type: 'json' };

export interface GazetteerEntry {
  readonly id: string;
  /** Locality name as the user recognises it, e.g. 钟祥市 / 纽约. */
  readonly name: string;
  /** Province / parent region for disambiguation (e.g. 湖北省). Empty for
   *  municipalities and overseas cities. */
  readonly region: string;
  readonly lat: number;
  readonly lng: number;
  readonly tz: string;
}

export interface PlaceCandidate {
  readonly entry: GazetteerEntry;
  readonly score: number;
}

interface CnRecord {
  readonly n: string;
  readonly r: string;
  readonly lat: number;
  readonly lng: number;
  readonly l: 1 | 2 | 3;
}

interface OverseasRecord {
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lng: number;
  readonly tz: string;
  readonly aliases: readonly string[];
}

interface Indexed {
  readonly entry: GazetteerEntry;
  /** Lowercased search keys (name + suffix-stripped / alias variants). */
  readonly keys: readonly string[];
  /** Tie-break weight: higher administrative levels rank first. */
  readonly weight: number;
}

// Strip a trailing 行政区划 suffix to make a typeable short form (钟祥市 →
// 钟祥). Multi-char suffixes that are part of the actual name are preserved
// (自治区 / 自治州 / 特别行政区 / 盟 / 林区).
function stripSuffix(name: string): string {
  if (/(?:自治[区州县]|特别行政区|林区|盟)$/.test(name)) return name;
  const stripped = name.replace(/[省市县区旗]$/, '');
  return stripped.length > 0 ? stripped : name;
}

function buildIndex(): readonly Indexed[] {
  const indexed: Indexed[] = [];

  (cnData as readonly CnRecord[]).forEach((rec, i) => {
    const entry: GazetteerEntry = {
      id: `cn-${i}`,
      name: rec.n,
      region: rec.r,
      lat: rec.lat,
      lng: rec.lng,
      tz: 'Asia/Shanghai',
    };
    const keys = new Set<string>();
    keys.add(rec.n);
    keys.add(stripSuffix(rec.n));
    if (rec.r.length > 0) {
      keys.add(rec.r + rec.n);
      keys.add(stripSuffix(rec.r) + stripSuffix(rec.n));
    }
    // weight: province 3 > prefecture 2 > county 1 (so 北京市 beats a 北京 district)
    const weight = rec.l === 1 ? 3 : rec.l === 2 ? 2 : 1;
    indexed.push({ entry, keys: [...keys].map((k) => k.toLowerCase()), weight });
  });

  (overseasData as readonly OverseasRecord[]).forEach((rec) => {
    const entry: GazetteerEntry = {
      id: rec.id,
      name: rec.name,
      region: '',
      lat: rec.lat,
      lng: rec.lng,
      tz: rec.tz,
    };
    const keys = [rec.name, ...rec.aliases].map((k) => k.toLowerCase());
    indexed.push({ entry, keys, weight: 3 });
  });

  return indexed;
}

const INDEX = buildIndex();

// Precise, human-readable place string, e.g. 湖北省钟祥市 / 北京市 / 纽约.
export function fullPlaceName(entry: GazetteerEntry): string {
  if (entry.region.length === 0 || entry.name.startsWith(entry.region)) return entry.name;
  return `${entry.region}${entry.name}`;
}

// Rank entries by best key match: exact > prefix > substring, with the
// administrative-level weight as a tie-break. Case-insensitive; works for
// Chinese names and pinyin/English aliases.
export function searchGazetteer(query: string, limit = 8): readonly PlaceCandidate[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  const scored: PlaceCandidate[] = [];
  for (const item of INDEX) {
    let best = 0;
    for (const key of item.keys) {
      if (key === q) {
        best = Math.max(best, 100);
        break;
      } else if (key.startsWith(q)) {
        best = Math.max(best, 70);
      } else if (key.includes(q)) {
        best = Math.max(best, 40);
      }
    }
    if (best > 0) scored.push({ entry: item.entry, score: best + item.weight });
  }
  scored.sort((a, b) => b.score - a.score || a.entry.name.length - b.entry.name.length);
  return scored.slice(0, limit);
}
