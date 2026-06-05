// SJG-ALGO-06 — 紫微斗数 chart adapter over iztro. Builds the natal astrolabe
// (twelve palaces, stars + brightness, 生年四化, 大限) from the true-solar
// wall-clock, and exposes the live astrolabe for 流年/流月/流日 horoscope queries.

import { astro } from 'iztro';
import type {
  ZiweiPalace,
  ZiweiStar,
  ZiweiSubjectChart,
} from '../../../../domain/algorithm.ts';
import type { CalculationSex } from '../../../../domain/person.ts';
import type { SubjectRef } from '../../../../domain/subject-ref.ts';

// Calendar provenance recorded on MethodProfile.ephemeris_version.
export const ZIWEI_EPHEMERIS_VERSION = 'iztro-2.5.8' as const;

type Astrolabe = ReturnType<typeof astro.bySolar>;

interface WallClock {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
}

// The true-solar instant is stored as a UTC ISO whose Y/M/D/H fields ARE the
// apparent-solar wall-clock (R1, same convention as the BaZi engine).
function wallClockFromTrueSolarIso(iso: string): WallClock | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours() };
}

// Local hour (0-23) → iztro time index 0-12 (0 = 早子 00-01, 12 = 晚子 23-24).
export function timeIndexFromHour(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  return Math.floor((h + 1) / 2);
}

const MUTAGENS = new Set(['禄', '权', '科', '忌']);
function coerceMutagen(m: unknown): ZiweiStar['mutagen'] {
  return typeof m === 'string' && MUTAGENS.has(m) ? (m as ZiweiStar['mutagen']) : '';
}
function toStar(s: { name: string; brightness?: string; mutagen?: string }): ZiweiStar {
  return { name: s.name, brightness: s.brightness ?? '', mutagen: coerceMutagen(s.mutagen) };
}

export interface ZiweiAstro {
  readonly astrolabe: Astrolabe;
  readonly chart: ZiweiSubjectChart;
  // star name -> the natal palace it occupies, for 四化飞星 lookups.
  readonly starToPalace: ReadonlyMap<string, string>;
  readonly birthSolarDate: string; // YYYY-M-D, for horoscope() queries
  readonly birthTimeIndex: number;
  readonly birthYear: number;
}

export type BuildZiweiOutcome =
  | { ok: true; value: ZiweiAstro }
  | { ok: false; reason: 'requires_birth_time' | 'invalid_input' };

// 紫微 strictly needs an exact 时辰 to place 命宫: fail closed otherwise.
export function buildZiweiAstro(
  subject_ref: SubjectRef,
  trueSolarIso: string | undefined,
  birthPrecision: 'exact' | 'rough_day' | 'rough_month' | 'rough_year' | 'unknown',
  sex: CalculationSex,
): BuildZiweiOutcome {
  if (birthPrecision !== 'exact') return { ok: false, reason: 'requires_birth_time' };
  if (sex === 'unspecified') return { ok: false, reason: 'requires_birth_time' };
  if (!trueSolarIso) return { ok: false, reason: 'invalid_input' };
  const wall = wallClockFromTrueSolarIso(trueSolarIso);
  if (!wall) return { ok: false, reason: 'invalid_input' };

  const solarDate = `${wall.year}-${wall.month}-${wall.day}`;
  const timeIndex = timeIndexFromHour(wall.hour);
  const astrolabe = astro.bySolar(solarDate, timeIndex, sex === 'male' ? '男' : '女', true, 'zh-CN');

  const palaces: ZiweiPalace[] = astrolabe.palaces.map((p) => ({
    index: p.index,
    name: p.name,
    heavenly_stem: p.heavenlyStem,
    earthly_branch: p.earthlyBranch,
    is_soul: p.name === '命宫', // iztro marks the soul palace by name
    is_body: Boolean(p.isBodyPalace),
    major_stars: (p.majorStars ?? []).map(toStar),
    minor_stars: (p.minorStars ?? []).map(toStar),
    decadal_start_age: p.decadal?.range?.[0] ?? 0,
    decadal_end_age: p.decadal?.range?.[1] ?? 0,
  }));

  const starToPalace = new Map<string, string>();
  for (const p of palaces) {
    for (const s of [...p.major_stars, ...p.minor_stars]) starToPalace.set(s.name, p.name);
  }

  const chart: ZiweiSubjectChart = {
    subject_ref,
    five_elements_class: astrolabe.fiveElementsClass,
    soul_star: astrolabe.soul,
    body_star: astrolabe.body,
    soul_palace_branch: astrolabe.earthlyBranchOfSoulPalace,
    palaces,
  };

  return {
    ok: true,
    value: { astrolabe, chart, starToPalace, birthSolarDate: solarDate, birthTimeIndex: timeIndex, birthYear: wall.year },
  };
}
