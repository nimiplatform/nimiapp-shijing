import { SolarDay, type God, type Taboo, type SixtyCycleHour } from 'tyme4ts';

export interface RiJingDailyAlmanacRow {
  readonly label: string;
  readonly value: string;
}

export interface RiJingDailyAlmanacHour {
  readonly branch: string;
  readonly luck: '吉' | '凶';
}

export interface RiJingDailyAlmanac {
  readonly date: string;
  readonly lunar_title: string;
  readonly ganzhi_line: string;
  readonly recommends: readonly string[];
  readonly avoids: readonly string[];
  readonly direction_rows: readonly RiJingDailyAlmanacRow[];
  readonly foundation_rows: readonly RiJingDailyAlmanacRow[];
  readonly pengzu: string;
  readonly fetus: string;
  readonly good_gods: string;
  readonly bad_gods: string;
  readonly hours: readonly RiJingDailyAlmanacHour[];
}

const LUCKY_HOUR_STARS = new Set(['青龙', '明堂', '金匮', '天德', '玉堂', '司命']);

function parseIsoDate(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  return { year, month, day };
}

function names(items: readonly (God | Taboo)[]): string[] {
  return items.map((item) => item.getName()).filter((name) => name.length > 0);
}

function joinedNames(items: readonly God[]): string {
  return names(items).join(' ');
}

function hourLuck(hour: SixtyCycleHour): RiJingDailyAlmanacHour {
  return {
    branch: hour.getSixtyCycle().getEarthBranch().getName(),
    luck: LUCKY_HOUR_STARS.has(hour.getTwelveStar().getName()) ? '吉' : '凶',
  };
}

export function deriveRiJingDailyAlmanac(date: string): RiJingDailyAlmanac | null {
  const parsed = parseIsoDate(date);
  if (!parsed) return null;

  try {
    const solarDay = SolarDay.fromYmd(parsed.year, parsed.month, parsed.day);
    const lunarDay = solarDay.getLunarDay();
    const dayCycle = lunarDay.getSixtyCycle();
    const stem = dayCycle.getHeavenStem();
    const branch = dayCycle.getEarthBranch();
    const opposite = branch.getOpposite();
    const gods = lunarDay.getGods();
    const goodGods = gods.filter((god) => god.getLuck().getName() === '吉');
    const badGods = gods.filter((god) => god.getLuck().getName() === '凶');

    return {
      date,
      lunar_title: `${lunarDay.getLunarMonth().getName()}${lunarDay.getName()}`,
      ganzhi_line: `${lunarDay.getYearSixtyCycle().getName()}年 ${lunarDay.getMonthSixtyCycle().getName()}月 ${dayCycle.getName()}日 周${solarDay.getWeek().getName()}`,
      recommends: names(lunarDay.getRecommends()),
      avoids: names(lunarDay.getAvoids()),
      direction_rows: [
        { label: '财神', value: stem.getWealthDirection().getName() },
        { label: '喜神', value: stem.getJoyDirection().getName() },
        { label: '福神', value: stem.getMascotDirection().getName() },
        { label: '阳贵', value: stem.getYangDirection().getName() },
      ],
      foundation_rows: [
        { label: '五行', value: dayCycle.getSound().getName() },
        { label: '建除', value: `${lunarDay.getDuty().getName()}日` },
        { label: '冲煞', value: `冲${opposite.getZodiac().getName()} 煞${branch.getOminous().getName()}` },
        { label: '值神', value: lunarDay.getTwelveStar().getName() },
      ],
      pengzu: dayCycle.getPengZu().getName(),
      fetus: lunarDay.getFetusDay().getName(),
      good_gods: joinedNames(goodGods),
      bad_gods: joinedNames(badGods),
      hours: solarDay.getSixtyCycleDay().getHours().map(hourLuck),
    };
  } catch {
    return null;
  }
}
