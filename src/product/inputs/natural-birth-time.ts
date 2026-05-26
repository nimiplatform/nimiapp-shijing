export interface ParsedNaturalBirthTime {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

type TimePrefix = '上午' | '早上' | '下午' | '晚上' | '晚' | '凌晨' | '中午';

const TIME_PREFIX_PATTERN = '(上午|早上|下午|晚上|晚|凌晨|中午)?';

function parseChineseInteger(text: string): number | null {
  if (/^\d+$/.test(text)) return Number(text);
  const digitMap: Readonly<Record<string, number>> = {
    零: 0,
    〇: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };
  if (text === '十') return 10;
  if (text.startsWith('十')) {
    const ones = text.slice(1);
    return ones.length === 0 ? 10 : 10 + (digitMap[ones] ?? Number.NaN);
  }
  const tenIndex = text.indexOf('十');
  if (tenIndex >= 0) {
    const tensText = text.slice(0, tenIndex);
    const onesText = text.slice(tenIndex + 1);
    const tens = digitMap[tensText];
    const ones = onesText.length === 0 ? 0 : digitMap[onesText];
    if (tens === undefined || ones === undefined) return null;
    return tens * 10 + ones;
  }
  return digitMap[text] ?? null;
}

function applyPrefix(prefix: TimePrefix | undefined, hour: number): number {
  if (prefix === '下午' || prefix === '晚上' || prefix === '晚') {
    return hour >= 1 && hour <= 11 ? hour + 12 : hour;
  }
  if (prefix === '凌晨' && hour === 12) return 0;
  if ((prefix === '上午' || prefix === '早上') && hour === 12) return 0;
  return hour;
}

function validTime(hour: number, minute: number, second: number): ParsedNaturalBirthTime | null {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  if (!Number.isInteger(second) || second < 0 || second > 59) return null;
  return { hour, minute, second };
}

function parseMinuteText(text: string | undefined): number | null {
  if (text === undefined || text.length === 0) return 0;
  if (text === '半') return 30;
  if (text === '一刻') return 15;
  const minuteMatch = /^([零〇一二两三四五六七八九十\d]{1,3})分?$/.exec(text);
  if (!minuteMatch) return null;
  const minute = parseChineseInteger(minuteMatch[1]!);
  return minute !== null ? minute : null;
}

export function parseNaturalBirthTime(text: string): ParsedNaturalBirthTime | null {
  const trimmed = text.trim().replace(/\s+/g, '');
  const colonPattern = new RegExp(`^${TIME_PREFIX_PATTERN}(\\d{1,2})(?::|：)(\\d{1,2})(?:(?::|：)(\\d{1,2}))?$`);
  const colonMatch = colonPattern.exec(trimmed);
  if (colonMatch) {
    const prefix = colonMatch[1] as TimePrefix | undefined;
    const hour = applyPrefix(prefix, Number(colonMatch[2]));
    const minute = Number(colonMatch[3]);
    const second = Number(colonMatch[4] ?? '0');
    return validTime(hour, minute, second);
  }

  const pointPattern = new RegExp(`^${TIME_PREFIX_PATTERN}([零〇一二两三四五六七八九十\\d]{1,3})点(半|一刻|[零〇一二两三四五六七八九十\\d]{1,3}分?)?$`);
  const pointMatch = pointPattern.exec(trimmed);
  if (!pointMatch) return null;
  const prefix = pointMatch[1] as TimePrefix | undefined;
  const baseHour = parseChineseInteger(pointMatch[2]!);
  const minute = parseMinuteText(pointMatch[3]);
  if (baseHour === null || minute === null) return null;
  const hour = applyPrefix(prefix, baseHour);
  return validTime(hour, minute, 0);
}

