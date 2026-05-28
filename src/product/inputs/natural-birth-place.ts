import type { BirthLocation } from '../../domain/person.ts';
import GAZETTEER_DATA from './china-gazetteer.data.json' with { type: 'json' };

export interface ResolvedBirthPlace {
  readonly matched_query: string;
  readonly place_name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly iana_time_zone: string;
}

interface GazetteerRecord {
  readonly n: string;
  readonly p: string;
  readonly l: 1 | 2 | 3;
  readonly lng: number;
  readonly lat: number;
}

const RECORDS = GAZETTEER_DATA.records as readonly GazetteerRecord[];

// Modern PRC, post-1949: every Chinese place is Asia/Shanghai (UTC+8). The
// pre-1949 five-zone system would need a historical TZ table, not a place
// lookup, so we keep this as a constant.
const CN_TIME_ZONE = 'Asia/Shanghai';

// Generate user-typeable variants of a single segment by stripping trivial
// 行政区划 suffixes. We deliberately leave 自治区/自治州/盟/林区/特别行政区
// alone — those are part of the actual name (e.g., 内蒙古自治区, 海西蒙古族藏族自治州).
function segmentVariants(name: string): string[] {
  if (/(?:自治[区州县]|特别行政区|林区|盟)$/.test(name)) return [name];
  const stripped = name.replace(/[省市县区]$/, '');
  return stripped && stripped !== name ? [name, stripped] : [name];
}

function pathToPlaceName(segments: readonly string[]): string {
  // length 3 → drop the middle prefecture city ("湖北省,荆门市,钟祥市" → "湖北省钟祥市").
  // length 1 or 2 → join verbatim.
  if (segments.length === 3) return segments[0] + segments[2];
  return segments.join('');
}

let exactIndex: Map<string, GazetteerRecord> | null = null;
let fuzzyIndex: Map<string, GazetteerRecord[]> | null = null;

function buildIndexes(): void {
  const exact = new Map<string, GazetteerRecord>();
  const fuzzy = new Map<string, GazetteerRecord[]>();

  const addFuzzy = (key: string, record: GazetteerRecord): void => {
    const bucket = fuzzy.get(key);
    if (!bucket) {
      fuzzy.set(key, [record]);
    } else if (!bucket.includes(record)) {
      bucket.push(record);
    }
  };

  for (const record of RECORDS) {
    const segments = record.p.split(',');
    exact.set(segments.join(''), record);

    // Cartesian product over per-segment variants (with/without 省市县区 suffix).
    // Each combination is a user-typeable form like "湖北钟祥".
    const variants = segments.map(segmentVariants);
    const walk = (index: number, acc: string[]): void => {
      if (index === variants.length) {
        addFuzzy(acc.join(''), record);
        return;
      }
      for (const variant of variants[index]) walk(index + 1, [...acc, variant]);
    };
    walk(0, []);

    // For level-3, also index "province + leaf" and "prefecture + leaf"
    // (each skipping a middle segment) plus "leaf alone".
    if (record.l === 3 && segments.length >= 2) {
      const provinceVariants = segmentVariants(segments[0]);
      const leafVariants = segmentVariants(record.n);
      for (const province of provinceVariants) {
        for (const leaf of leafVariants) addFuzzy(province + leaf, record);
      }
      if (segments.length === 3) {
        const cityVariants = segmentVariants(segments[1]);
        for (const city of cityVariants) {
          for (const leaf of leafVariants) addFuzzy(city + leaf, record);
        }
      }
      for (const leaf of leafVariants) addFuzzy(leaf, record);
    } else if (record.l <= 2) {
      for (const leaf of segmentVariants(record.n)) addFuzzy(leaf, record);
    }
  }

  exactIndex = exact;
  fuzzyIndex = fuzzy;
}

function normalizePlaceText(text: string): string {
  // Strip whitespace and common separators users insert between segments.
  return text.trim().replace(/[\s,，、\-—/]+/g, '');
}

function toResolved(record: GazetteerRecord): ResolvedBirthPlace {
  const segments = record.p.split(',');
  const placeName = pathToPlaceName(segments);
  return {
    matched_query: segments.join(''),
    place_name: placeName,
    iana_time_zone: CN_TIME_ZONE,
    longitude: record.lng,
    latitude: record.lat,
  };
}

export function resolveBirthPlace(placeText: string): ResolvedBirthPlace | null {
  const normalized = normalizePlaceText(placeText);
  if (!normalized) return null;
  if (!exactIndex || !fuzzyIndex) buildIndexes();
  const exact = exactIndex!.get(normalized);
  if (exact) return toResolved(exact);
  const fuzzy = fuzzyIndex!.get(normalized);
  if (fuzzy && fuzzy.length === 1) return toResolved(fuzzy[0]);
  return null;
}

export function birthLocationFromResolvedPlace(place: ResolvedBirthPlace): BirthLocation {
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    iana_time_zone: place.iana_time_zone,
    place_name: place.place_name,
  };
}
