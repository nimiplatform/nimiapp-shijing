// SJG-ALGO-05/06 — BaZi calendar adapter over tyme4ts. This is the single
// source of astronomical truth for the 八字 engine: accurate 节气 (to the
// second), four pillars, 流年/流月/流日 sixty-cycle, and 大运 (DecadeFortune)
// with correct 起运 and per-period 干支. It replaces the retired hand-rolled
// approximations (ganzhi.ts day-pillar epoch, solar-terms.ts fixed-date 节气,
// dayun.ts year-pillar stub).

import { ChildLimit, Gender, SolarDay, SolarTime } from 'tyme4ts';
import type { EightChar, SixtyCycle } from 'tyme4ts';
import type { CalculationSex } from '../../../../domain/person.ts';
import type { DayunDirection, GanzhiPillar } from '../../../../domain/algorithm.ts';
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from '../../../../domain/algorithm.ts';
import { CALENDAR_EPHEMERIS_VERSION } from '../../ephemeris.ts';

// Calendar provenance recorded on MethodProfile.ephemeris_version.
export const BAZI_EPHEMERIS_VERSION = CALENDAR_EPHEMERIS_VERSION;

// tyme4ts stem/branch indices share ordering with our domain enums
// (甲=0..癸=9, 子=0..亥=11), so we map purely by index — no name table.
export function pillarFromSixtyCycle(cycle: SixtyCycle): GanzhiPillar {
  const stem = HEAVENLY_STEMS[cycle.getHeavenStem().getIndex()];
  const branch = EARTHLY_BRANCHES[cycle.getEarthBranch().getIndex()];
  if (!stem || !branch) {
    throw new Error(`pillarFromSixtyCycle: unexpected sexagenary index for ${cycle.getName()}`);
  }
  return { stem, branch };
}

// A true-solar wall-clock: apparent solar time at the birth longitude expressed
// as civil Y/M/D/H/M/S fields, fed to tyme4ts as a SolarTime. This is the
// SJG-ALGO-05 真太阳时 排盘 convention (R1).
export interface SolarWallClock {
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

export interface FourPillars {
  readonly year: GanzhiPillar;
  readonly month: GanzhiPillar;
  readonly day: GanzhiPillar;
  readonly hour: GanzhiPillar;
}

function solarTimeOf(wall: SolarWallClock): SolarTime {
  return SolarTime.fromYmdHms(wall.year, wall.month, wall.day, wall.hour, wall.minute, wall.second);
}

// Natal four pillars from the true-solar wall-clock. 节气 boundaries decide the
// year/month pillars; the day pillar uses tyme4ts's continuous sexagenary index
// (晚子时: 23:00 rolls to the next day's 子时, R4); the hour pillar uses the
// true-solar 时辰.
// Raw tyme4ts EightChar for the interpretive layer (十神/藏干/纳音/十二长生).
export function eightCharOf(wall: SolarWallClock): EightChar {
  return solarTimeOf(wall).getLunarHour().getEightChar();
}

export function buildFourPillars(wall: SolarWallClock): FourPillars {
  const eightChar = eightCharOf(wall);
  return {
    year: pillarFromSixtyCycle(eightChar.getYear()),
    month: pillarFromSixtyCycle(eightChar.getMonth()),
    day: pillarFromSixtyCycle(eightChar.getDay()),
    hour: pillarFromSixtyCycle(eightChar.getHour()),
  };
}

// Transit (流年/流月/流日) pillars for a civil date. Uses the 节气-based
// sixty-cycle calendar: 流日 changes at the sexagenary day boundary, 流月 at the
// 12 jie, 流年 at 立春.
export interface TransitPillars {
  readonly year: GanzhiPillar;
  readonly month: GanzhiPillar;
  readonly day: GanzhiPillar;
}

export function transitPillarsForCivilDate(year: number, month: number, day: number): TransitPillars {
  const sixtyDay = SolarDay.fromYmd(year, month, day).getSixtyCycleDay();
  const sixtyMonth = sixtyDay.getSixtyCycleMonth();
  return {
    day: pillarFromSixtyCycle(sixtyDay.getSixtyCycle()),
    month: pillarFromSixtyCycle(sixtyMonth.getSixtyCycle()),
    year: pillarFromSixtyCycle(sixtyMonth.getSixtyCycleYear().getSixtyCycle()),
  };
}

export interface DayunPeriod {
  readonly start_age: number; // virtual age (虚岁) at which this 大运 begins
  readonly end_age: number;
  readonly start_lunar_year: number; // civil/lunar year the period begins
  readonly end_lunar_year: number;
  readonly pillar: GanzhiPillar;
}

export interface DayunSequence {
  readonly direction: DayunDirection;
  readonly start_age_years: number; // precise 起运 age in years
  readonly periods: readonly DayunPeriod[];
}

function genderOf(sex: Exclude<CalculationSex, 'unspecified'>): Gender {
  return sex === 'male' ? Gender.MAN : Gender.WOMAN;
}

// Full 大运 sequence (first `count` periods) with correct 起运 and per-period
// 干支, derived from tyme4ts ChildLimit/DecadeFortune. Direction is read back
// from the sequence (first 大运 vs month pillar) rather than re-deriving the
// yin-yang rule, so tyme4ts stays the single source of truth.
export function computeDayunSequence(
  wall: SolarWallClock,
  sex: Exclude<CalculationSex, 'unspecified'>,
  count = 12,
): DayunSequence {
  const childLimit = ChildLimit.fromSolarTime(solarTimeOf(wall), genderOf(sex));
  const startAgeYears =
    childLimit.getYearCount() + childLimit.getMonthCount() / 12 + childLimit.getDayCount() / 365.25;
  const monthPillar = pillarFromSixtyCycle(childLimit.getEightChar().getMonth());
  const periods: DayunPeriod[] = [];
  let fortune = childLimit.getStartDecadeFortune();
  for (let i = 0; i < count; i += 1) {
    periods.push({
      start_age: fortune.getStartAge(),
      end_age: fortune.getEndAge(),
      start_lunar_year: fortune.getStartLunarYear().getYear(),
      end_lunar_year: fortune.getEndLunarYear().getYear(),
      pillar: pillarFromSixtyCycle(fortune.getSixtyCycle()),
    });
    fortune = fortune.next(1);
  }
  const first = periods[0]!;
  const monthIdx = sexagenaryIndex(monthPillar);
  const firstIdx = sexagenaryIndex(first.pillar);
  const delta = ((firstIdx - monthIdx) % 60 + 60) % 60;
  const direction: DayunDirection = delta === 1 ? 'forward' : 'reverse';
  return { direction, start_age_years: Number(startAgeYears.toFixed(2)), periods };
}

// Sexagenary cycle index 0..59 for a pillar (甲子=0).
export function sexagenaryIndex(pillar: GanzhiPillar): number {
  const s = HEAVENLY_STEMS.indexOf(pillar.stem);
  const b = EARTHLY_BRANCHES.indexOf(pillar.branch);
  // Solve n ≡ s (mod 10), n ≡ b (mod 12), 0 ≤ n < 60.
  for (let n = s; n < 60; n += 10) {
    if (n % 12 === b) return n;
  }
  return -1;
}

// The 大运 period covering a civil year, or undefined if the year precedes 起运.
export function dayunPeriodForYear(
  sequence: DayunSequence,
  year: number,
): DayunPeriod | undefined {
  return sequence.periods.find((p) => year >= p.start_lunar_year && year <= p.end_lunar_year);
}
