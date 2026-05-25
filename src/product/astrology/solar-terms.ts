// Wave-10 — approximate solar-term boundaries. Each year's 24 solar
// terms occur roughly when the sun's ecliptic longitude is a multiple
// of 15°. We approximate Li Chun (the year-pillar boundary, λ=315°)
// and the 12 jie (month-pillar boundaries) using fixed Gregorian
// dates with small year-drift; accuracy ~±2 days for the 1900-2100
// range. Acceptable for stage-label and pillar selection; admitted
// approximation tracked via ephemeris_version="shijing-approx-v1".

// SJG-ALGO-06 + SJG-ALGO-08 + SJG-ALGO-11 — the version label that
// every `GanzhiPillar` records. Bumping this constant indicates the
// admitted ephemeris table changed; all dependent caches must be
// invalidated and existing pillars must be treated as having an
// `ephemeris_missing` uncertainty input until regenerated.
export const EPHEMERIS_VERSION = 'shijing-approx-v1' as const;
export type EphemerisVersion = typeof EPHEMERIS_VERSION;

// Approximate UTC date (month/day) for each jie within a given year.
// Order: 0 = lichun (year transition), 1 = jingzhe, ... 11 = xiaohan.
// Note: lichun marks the year pillar boundary; for month-pillar we
// use the 12 jie starting from lichun → year-month mapping below.
interface JieEntry {
  readonly month: number; // 1..12 (gregorian month)
  readonly day: number;   // approximate day
  readonly hour_utc: number; // approximate hour UTC (we set noon for stability)
}

// Names included as comments for human reading.
export const JIE_APPROX: readonly JieEntry[] = [
  { month: 2, day: 4, hour_utc: 12 },   // 立春 lichun
  { month: 3, day: 6, hour_utc: 12 },   // 惊蛰 jingzhe
  { month: 4, day: 5, hour_utc: 12 },   // 清明 qingming
  { month: 5, day: 6, hour_utc: 12 },   // 立夏 lixia
  { month: 6, day: 6, hour_utc: 12 },   // 芒种 mangzhong
  { month: 7, day: 7, hour_utc: 12 },   // 小暑 xiaoshu
  { month: 8, day: 8, hour_utc: 12 },   // 立秋 liqiu
  { month: 9, day: 8, hour_utc: 12 },   // 白露 bailu
  { month: 10, day: 8, hour_utc: 12 },  // 寒露 hanlu
  { month: 11, day: 7, hour_utc: 12 },  // 立冬 lidong
  { month: 12, day: 7, hour_utc: 12 },  // 大雪 daxue
  { month: 1, day: 6, hour_utc: 12 },   // 小寒 xiaohan (next year's January)
];

export interface JieInstant {
  readonly index: number;
  readonly utc_ms: number;
  readonly month_branch_index: number; // 0=zi
}

// Returns the absolute UTC ms for jie index i within civil year y.
// xiaohan (index 11) belongs to year y+1 January.
export function jieInstantForYear(y: number, index: number): JieInstant {
  const entry = JIE_APPROX[index]!;
  const civilYear = index === 11 ? y + 1 : y;
  const utcMs = Date.UTC(civilYear, entry.month - 1, entry.day, entry.hour_utc, 0, 0);
  // month branch indexing: jie #0 (lichun) → month branch yin (index 2)
  const branchIdx = (index + 2) % 12;
  return { index, utc_ms: utcMs, month_branch_index: branchIdx };
}

// Year pillar transitions at Li Chun (jie index 0).
export function bagayearStartUtcMs(civilYear: number): number {
  return jieInstantForYear(civilYear, 0).utc_ms;
}

// Find the current month-pillar boundary covering an instant.
export interface CurrentJie {
  readonly jie: JieInstant;
  readonly next: JieInstant;
}

export function currentJieForInstant(utcMs: number): CurrentJie {
  const date = new Date(utcMs);
  const year = date.getUTCFullYear();
  const candidates: JieInstant[] = [];
  for (const y of [year - 1, year, year + 1]) {
    for (let i = 0; i < 12; i += 1) {
      candidates.push(jieInstantForYear(y, i));
    }
  }
  candidates.sort((a, b) => a.utc_ms - b.utc_ms);
  let current = candidates[0]!;
  for (let i = 0; i < candidates.length; i += 1) {
    if (candidates[i]!.utc_ms <= utcMs) current = candidates[i]!;
    else break;
  }
  const nextIdx = candidates.indexOf(current) + 1;
  const next = candidates[nextIdx] ?? candidates[candidates.length - 1]!;
  return { jie: current, next };
}
