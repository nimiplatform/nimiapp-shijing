import { Body, Ecliptic, GeoVector, SiderealTime } from 'astronomy-engine';
import type {
  NatalCanonicalization,
  QizhengSiyuBody,
  QizhengSiyuBodyKey,
  QizhengSiyuHouse,
  QizhengSiyuSubjectChart,
} from '../../../../domain/algorithm.ts';
import type { NatalInputs } from '../../../../domain/person.ts';
import type { SubjectRef } from '../../../../domain/subject-ref.ts';
import { computeCanonicalHash } from '../../canonical-hash.ts';
import type { StageResult } from '../../stage-result.ts';

export const QIZHENG_SIYU_EPHEMERIS_VERSION =
  'astronomy-engine-2.1.19;qizheng-siyu-v1-equal-house';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const J2000_UTC_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const DAYS_PER_JULIAN_CENTURY = 36525;
const DAYS_PER_TROPICAL_YEAR = 365.2422;

const ZODIAC_SIGNS = [
  '白羊',
  '金牛',
  '双子',
  '巨蟹',
  '狮子',
  '处女',
  '天秤',
  '天蝎',
  '射手',
  '摩羯',
  '水瓶',
  '双鱼',
] as const;

const MANSIONS = [
  '角',
  '亢',
  '氐',
  '房',
  '心',
  '尾',
  '箕',
  '斗',
  '牛',
  '女',
  '虚',
  '危',
  '室',
  '壁',
  '奎',
  '娄',
  '胃',
  '昴',
  '毕',
  '觜',
  '参',
  '井',
  '鬼',
  '柳',
  '星',
  '张',
  '翼',
  '轸',
] as const;

const HOUSE_NAMES = [
  '命宫',
  '财帛',
  '兄弟',
  '田宅',
  '男女',
  '奴仆',
  '夫妻',
  '疾厄',
  '迁移',
  '官禄',
  '福德',
  '相貌',
] as const;

const ANGULAR_HOUSES = new Set(['命宫', '田宅', '夫妻', '官禄']);
const SUCCEDENT_HOUSES = new Set(['财帛', '男女', '疾厄', '福德']);

const REAL_BODIES: readonly {
  readonly key: QizhengSiyuBodyKey;
  readonly label: string;
  readonly body: Body;
}[] = [
  { key: 'taiyang', label: '太阳', body: Body.Sun },
  { key: 'taiyin', label: '太阴', body: Body.Moon },
  { key: 'chenxing', label: '辰星', body: Body.Mercury },
  { key: 'taibai', label: '太白', body: Body.Venus },
  { key: 'yinghuo', label: '荧惑', body: Body.Mars },
  { key: 'suixing', label: '岁星', body: Body.Jupiter },
  { key: 'zhenxing', label: '镇星', body: Body.Saturn },
] as const;

function normalizeDegrees(value: number): number {
  const out = value % 360;
  return out < 0 ? out + 360 : out;
}

function roundLongitude(value: number): number {
  return Math.round(normalizeDegrees(value) * 1000) / 1000;
}

function julianCenturies(date: Date): number {
  return (date.getTime() - J2000_UTC_MS) / (86400 * 1000) / DAYS_PER_JULIAN_CENTURY;
}

function zodiacSign(longitude: number): string {
  return ZODIAC_SIGNS[Math.floor(normalizeDegrees(longitude) / 30)]!;
}

function mansion(longitude: number): string {
  return MANSIONS[Math.floor(normalizeDegrees(longitude) / (360 / 28))]!;
}

function houseIndexFor(longitude: number, ascendant: number): number {
  return Math.floor(normalizeDegrees(longitude - ascendant) / 30);
}

function positionClass(houseName: string): string {
  if (ANGULAR_HOUSES.has(houseName)) return '七强';
  if (SUCCEDENT_HOUSES.has(houseName)) return '次强';
  return '闲宫';
}

function bodyHouseName(longitude: number, ascendant: number): string {
  return HOUSE_NAMES[houseIndexFor(longitude, ascendant)]!;
}

function bodyLatitude(body: Body, date: Date): number | undefined {
  const ecliptic = Ecliptic(GeoVector(body, date, true));
  return Math.round(ecliptic.elat * 1000) / 1000;
}

function realBodyLongitude(body: Body, date: Date): number {
  const ecliptic = Ecliptic(GeoVector(body, date, true));
  return roundLongitude(ecliptic.elon);
}

// Mean lunar node: Meeus-style low-order expression, sufficient for route
// evidence because 四余 v1 exposes its model provenance.
function ascendingNodeLongitude(date: Date): number {
  const t = julianCenturies(date);
  return roundLongitude(125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t * t * t) / 450000);
}

function lunarApogeeLongitude(date: Date): number {
  const t = julianCenturies(date);
  const perigee = 83.3532465 + 4069.0137287 * t - 0.01032 * t * t - (t * t * t) / 80053;
  return roundLongitude(perigee + 180);
}

function ziqiLongitude(date: Date): number {
  const yearsFromJ2000 = (date.getTime() - J2000_UTC_MS) / (86400 * 1000) / DAYS_PER_TROPICAL_YEAR;
  return roundLongitude((yearsFromJ2000 / 28) * 360);
}

function ascendantLongitude(date: Date, latitude: number, longitude: number): number {
  const localSiderealHours = SiderealTime(date) + longitude / 15;
  const theta = normalizeDegrees(localSiderealHours * 15) * DEG2RAD;
  const phi = latitude * DEG2RAD;
  const epsilon = 23.439291 * DEG2RAD;
  const y = -Math.cos(theta);
  const x = Math.sin(theta) * Math.cos(epsilon) + Math.tan(phi) * Math.sin(epsilon);
  return roundLongitude(Math.atan2(y, x) * RAD2DEG);
}

function buildHouses(ascendant: number, bodies: readonly QizhengSiyuBody[]): QizhengSiyuHouse[] {
  return HOUSE_NAMES.map((name, index) => {
    const start = roundLongitude(ascendant + index * 30);
    const end = roundLongitude(ascendant + (index + 1) * 30);
    return {
      index,
      name,
      start_longitude: start,
      end_longitude: end,
      body_keys: bodies.filter((body) => body.house_name === name).map((body) => body.key),
    };
  });
}

function makeBody(input: {
  readonly key: QizhengSiyuBodyKey;
  readonly label: string;
  readonly kind: QizhengSiyuBody['kind'];
  readonly longitude: number;
  readonly latitude?: number;
  readonly ascendant: number;
  readonly provenance: string;
}): QizhengSiyuBody {
  const houseName = bodyHouseName(input.longitude, input.ascendant);
  return {
    key: input.key,
    label: input.label,
    kind: input.kind,
    longitude: roundLongitude(input.longitude),
    ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
    zodiac_sign: zodiacSign(input.longitude),
    mansion: mansion(input.longitude),
    house_name: houseName,
    position_class: positionClass(houseName),
    provenance: input.provenance,
  };
}

function buildBodies(date: Date, ascendant: number): QizhengSiyuBody[] {
  const bodies = REAL_BODIES.map((item) =>
    makeBody({
      key: item.key,
      label: item.label,
      kind: 'qizheng',
      longitude: realBodyLongitude(item.body, date),
      latitude: bodyLatitude(item.body, date),
      ascendant,
      provenance: 'astronomy-engine:geocentric-ecliptic-of-date',
    }),
  );
  const ascendingNode = ascendingNodeLongitude(date);
  return [
    ...bodies,
    makeBody({
      key: 'luohou',
      label: '罗喉',
      kind: 'siyu',
      longitude: ascendingNode,
      ascendant,
      provenance: 'qizheng-siyu-v1:ascending-lunar-node',
    }),
    makeBody({
      key: 'jidu',
      label: '计都',
      kind: 'siyu',
      longitude: ascendingNode + 180,
      ascendant,
      provenance: 'qizheng-siyu-v1:descending-lunar-node',
    }),
    makeBody({
      key: 'ziqi',
      label: '紫气',
      kind: 'siyu',
      longitude: ziqiLongitude(date),
      ascendant,
      provenance: 'qizheng-siyu-v1:28-year-virtual-point-j2000',
    }),
    makeBody({
      key: 'yuebei',
      label: '月孛',
      kind: 'siyu',
      longitude: lunarApogeeLongitude(date),
      ascendant,
      provenance: 'qizheng-siyu-v1:mean-lunar-apogee',
    }),
  ];
}

function isDayChart(sun: QizhengSiyuBody): boolean {
  return ['命宫', '财帛', '兄弟', '田宅', '男女', '奴仆'].includes(sun.house_name);
}

export function buildQizhengSiyuSubjectChart(input: {
  readonly subject_ref: SubjectRef;
  readonly canonicalization: NatalCanonicalization;
  readonly natal_inputs: NatalInputs;
}): StageResult<QizhengSiyuSubjectChart> {
  if (input.canonicalization.canonical_birth_precision !== 'exact') {
    return {
      ok: false,
      error: {
        stage: 'build_natal_chart',
        kind: 'stage_missing_input',
        subject_ref: input.subject_ref,
        detail: '七政四余/果老星宗命镜 requires exact birth time',
      },
    };
  }
  const date = new Date(input.canonicalization.canonical_birth_datetime_utc);
  if (Number.isNaN(date.getTime())) {
    return {
      ok: false,
      error: {
        stage: 'build_natal_chart',
        kind: 'stage_invalid_input',
        subject_ref: input.subject_ref,
        detail: '七政四余/果老星宗命镜 requires a valid birth UTC instant',
      },
    };
  }
  const location = input.natal_inputs.birth_location;
  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    location.iana_time_zone.length === 0
  ) {
    return {
      ok: false,
      error: {
        stage: 'build_natal_chart',
        kind: 'stage_missing_input',
        subject_ref: input.subject_ref,
        detail: '七政四余/果老星宗命镜 requires resolved birth location and timezone',
      },
    };
  }

  const ascendant = ascendantLongitude(date, location.latitude, location.longitude);
  const bodies = buildBodies(date, ascendant);
  const sun = bodies.find((body) => body.key === 'taiyang')!;
  const basis = {
    birth_utc: date.toISOString(),
    ascendant_longitude: ascendant,
    day_night: isDayChart(sun) ? 'day' as const : 'night' as const,
    zodiac_model: 'tropical-ecliptic-of-date',
    house_model: 'equal-house-from-ascendant-v1',
    mansion_model: '28-equal-mansion-v1',
    siyu_model: 'luohou-ascending-node;jidu-descending-node;ziqi-28-year-j2000;yuebei-mean-lunar-apogee',
    ephemeris_version: QIZHENG_SIYU_EPHEMERIS_VERSION,
  };
  return {
    ok: true,
    value: {
      subject_ref: input.subject_ref,
      canonicalization_hash: computeCanonicalHash(input.canonicalization),
      chart_basis: basis,
      bodies,
      houses: buildHouses(ascendant, bodies),
    },
  };
}
