// SJG-ALGO-08/09/11 — project the 紫微 chart onto the algorithm-agnostic common
// driver surface. The mapping (v1, 三合派 四化飞星):
//   - concern → palace: love→夫妻, career→官禄, wealth→财帛, health→疾厄, general→命宫
//   - dated tendency (rijing/yuejing): 流日/流月 四化 (禄/权/科/忌) flying into the
//     concern's natal palace → supportive / steady / watch / turning
//   - stage label: 流年 四化 into 命宫 → 进/养/收时, else 守时
//   - nianjing: 大限 bands (phases) + 大限/流年 boundaries (inflections)

import type { ConcernTag } from '../../../../domain/concern-tag.ts';
import type {
  CommonDrivers,
  KeyWindowFeature,
  NianJingInflectionDriver,
  NianJingPhaseDriver,
  ShijingStageLabel,
  StageDriver,
  UncertaintyInput,
  YueJingTendencyDriver,
} from '../../../../domain/algorithm.ts';
import type { MirrorKind, MirrorScope } from '../../../../domain/mirror-scope.ts';
import type { CanonicalMirrorWindow } from '../../../../domain/algorithm.ts';
import type { TendencyClass } from '../../../../domain/mirror-output.ts';
import { concernDomainFor, type ConcernDomain } from '../concern-domain.ts';
import type { ZiweiAstro } from './ziwei-chart.ts';

const DOMAIN_PALACE: Readonly<Record<ConcernDomain, string>> = {
  love: '夫妻',
  career: '官禄',
  wealth: '财帛',
  health: '疾厄',
  general: '命宫',
};

function concernPalaceName(tag: ConcernTag): string {
  return DOMAIN_PALACE[concernDomainFor(tag)];
}

// mutagen = [禄星, 权星, 科星, 忌星]. Favorable transformation flying into a
// palace lifts it; 忌 flying in flags it; both = turning (mixed pull).
function tendencyFromMutagen(
  mutagen: readonly string[],
  palaceName: string,
  starToPalace: ReadonlyMap<string, string>,
): TendencyClass {
  const [lu, quan, ke, ji] = mutagen;
  const palaceOf = (s: string | undefined) => (s ? starToPalace.get(s) : undefined);
  const favorable = [lu, quan, ke].some((s) => palaceOf(s) === palaceName);
  const burdened = palaceOf(ji) === palaceName;
  if (burdened) return favorable ? 'turning' : 'watch';
  if (favorable) return 'supportive';
  return 'steady';
}

const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
type PalaceSeat = { readonly name: string; readonly earthly_branch: string };

// 三方四正 of a palace = 本宫 + 对宫 (支+6) + 三合二宫 (支±4). The standard 紫微 lens
// for judging a palace: a 四化 anywhere in this set bears on it.
function sanFangSiZhengNames(concernPalace: string, palaces: readonly PalaceSeat[]): ReadonlySet<string> {
  const seat = palaces.find((p) => p.name === concernPalace);
  const b = seat ? BRANCH_ORDER.indexOf(seat.earthly_branch as (typeof BRANCH_ORDER)[number]) : -1;
  if (b < 0) return new Set([concernPalace]);
  const want = new Set([b, (b + 6) % 12, (b + 4) % 12, (b + 8) % 12]);
  return new Set(
    palaces
      .filter((p) => want.has(BRANCH_ORDER.indexOf(p.earthly_branch as (typeof BRANCH_ORDER)[number])))
      .map((p) => p.name),
  );
}

// 大限 phase nature: the decade's 四化 飞入 the concern's 三方四正 — not just the
// single 本宫, which fires too rarely and collapses every band to 平稳.
function daxianNature(
  mutagen: readonly string[],
  concernPalace: string,
  palaces: readonly PalaceSeat[],
  starToPalace: ReadonlyMap<string, string>,
): TendencyClass {
  const [lu, quan, ke, ji] = mutagen;
  const zone = sanFangSiZhengNames(concernPalace, palaces);
  const inZone = (s: string | undefined) => {
    const p = s ? starToPalace.get(s) : undefined;
    return p !== undefined && zone.has(p);
  };
  const favorable = [lu, quan, ke].some(inZone);
  const burdened = inZone(ji);
  if (burdened) return favorable ? 'turning' : 'watch';
  if (favorable) return 'supportive';
  return 'steady';
}

function stageFromYearMutagen(
  mutagen: readonly string[],
  starToPalace: ReadonlyMap<string, string>,
): ShijingStageLabel {
  const [lu, quan, ke, ji] = mutagen;
  const at = (s: string | undefined) => (s ? starToPalace.get(s) : undefined);
  if (at(ji) === '命宫') return '收时';
  if (at(lu) === '命宫' || at(quan) === '命宫') return '进时';
  if (at(ke) === '命宫') return '养时';
  return '守时';
}

function refDateOf(window: CanonicalMirrorWindow): string {
  const d = new Date(window.start_utc);
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

// 虚岁 → civil year of a 大限 start age.
function yearForAge(birthYear: number, age: number): number {
  return birthYear + age - 1;
}

function buildDatedDrivers(
  self: ZiweiAstro,
  scope: MirrorScope,
  mirrorKind: MirrorKind,
  concernTags: readonly ConcernTag[],
): YueJingTendencyDriver[] {
  const date = scope.kind === 'daily' ? scope.date : scope.kind === 'rolling_30_day' ? scope.start_date : null;
  if (!date) return [];
  const horo = self.astrolabe.horoscope(date, self.birthTimeIndex);
  const period = mirrorKind === 'yuejing' ? horo.monthly : horo.daily;
  const mutagen: readonly string[] = period?.mutagen ?? [];
  return concernTags.map((tag) => {
    const palace = concernPalaceName(tag);
    return {
      date,
      concern_tag_ref: tag.id,
      tendency_class: tendencyFromMutagen(mutagen, palace, self.starToPalace),
      driver_refs: [`ziwei:domain.${concernDomainFor(tag)}`, `ziwei:hua@${palace}@${date}`],
    };
  });
}

function buildStageDrivers(self: ZiweiAstro, window: CanonicalMirrorWindow): StageDriver[] {
  const refDate = refDateOf(window);
  const horo = self.astrolabe.horoscope(refDate, self.birthTimeIndex);
  const mutagen: readonly string[] = horo.yearly?.mutagen ?? [];
  const stage = stageFromYearMutagen(mutagen, self.starToPalace);
  return [{ stage_label: stage, marker_refs: [`ziwei:liunian_hua@${refDate}`], explanation_key: `ziwei.yearly.${stage}` }];
}

function buildKeyWindows(self: ZiweiAstro, window: CanonicalMirrorWindow): KeyWindowFeature[] {
  const startMs = Date.parse(window.start_utc);
  const endMs = Date.parse(window.end_utc);
  const features: KeyWindowFeature[] = [];
  for (const p of self.chart.palaces) {
    const boundaryMs = Date.UTC(yearForAge(self.birthYear, p.decadal_start_age), 0, 1);
    if (boundaryMs >= startMs && boundaryMs <= endMs) {
      features.push({
        start_utc: new Date(boundaryMs).toISOString(),
        end_utc: new Date(boundaryMs + 24 * 60 * 60 * 1000).toISOString(),
        label: 'transition',
        driver_refs: [`ziwei:daxian@${p.name}`],
        subject_refs: [self.chart.subject_ref],
      });
    }
  }
  return features;
}

function buildNianjing(
  self: ZiweiAstro,
  scope: MirrorScope,
  concernTags: readonly ConcernTag[],
): { phases: NianJingPhaseDriver[]; inflections: NianJingInflectionDriver[] } {
  if (scope.kind !== 'long_horizon') return { phases: [], inflections: [] };
  const startYear = Number(scope.start_date.slice(0, 4));
  const endYear = Number(scope.end_date.slice(0, 4));
  const phases: NianJingPhaseDriver[] = [];
  const inflections: NianJingInflectionDriver[] = [];

  // 大限 bands + boundaries overlapping the window.
  const daxian = self.chart.palaces
    .map((p) => ({ name: p.name, startYear: yearForAge(self.birthYear, p.decadal_start_age), endYear: yearForAge(self.birthYear, p.decadal_end_age) }))
    .filter((d) => d.endYear >= startYear && d.startYear <= endYear)
    .sort((a, b) => a.startYear - b.startYear);

  // 大限 四化 per band (decadal mutagen — same for every concern, so precompute):
  // 禄/权/科 flying into the concern's palace lifts the decade, 忌 flags it.
  const bandMutagen = new Map<string, readonly string[]>(
    daxian.map((d) => [d.name, self.astrolabe.horoscope(`${d.startYear}-06-01`, self.birthTimeIndex).decadal?.mutagen ?? []]),
  );

  for (const tag of concernTags) {
    const boundaryYears = new Set<number>();
    for (const d of daxian) {
      const bandStart = Math.max(d.startYear, startYear);
      const bandEnd = Math.min(d.endYear, endYear);
      const palace = concernPalaceName(tag);
      phases.push({
        concern_tag_ref: tag.id,
        start_date: `${bandStart}-01-01`,
        end_date: `${bandEnd}-12-31`,
        // 大限 phase nature from its 四化 飞入 the concern's 三方四正 — not a blanket 转折.
        nature: daxianNature(bandMutagen.get(d.name) ?? [], palace, self.chart.palaces, self.starToPalace),
        driver_refs: [`ziwei:daxian@${d.name}`, `ziwei:daxian_hua@${palace}@${d.startYear}`],
      });
      if (d.startYear >= startYear && d.startYear <= endYear) {
        inflections.push({ concern_tag_ref: tag.id, date: `${d.startYear}-01-01`, kind: 'dayun_boundary', driver_refs: [`ziwei:daxian@${d.name}`] });
        boundaryYears.add(d.startYear);
      }
    }
    // 流年 boundaries within the window — but a year that is already a 大限 boundary
    // is emitted as the (stronger) dayun_boundary above, never duplicated here.
    for (let y = startYear; y <= endYear; y += 1) {
      if (boundaryYears.has(y)) continue;
      inflections.push({ concern_tag_ref: tag.id, date: `${y}-01-01`, kind: 'annual_transition', driver_refs: [`ziwei:liunian@${y}`] });
    }
  }
  return { phases, inflections };
}

export interface DeriveZiweiCommonDriversInput {
  readonly self: ZiweiAstro;
  readonly base_uncertainty: readonly UncertaintyInput[];
  readonly mirror_kind: MirrorKind;
  readonly mirror_scope: MirrorScope;
  readonly canonical_window: CanonicalMirrorWindow;
  readonly active_concern_tags: readonly ConcernTag[];
}

export function deriveZiweiCommonDrivers(input: DeriveZiweiCommonDriversInput): CommonDrivers {
  const datedTendencies =
    input.mirror_kind === 'yuejing' || input.mirror_kind === 'rijing'
      ? buildDatedDrivers(input.self, input.mirror_scope, input.mirror_kind, input.active_concern_tags)
      : [];
  const nianjing =
    input.mirror_kind === 'nianjing'
      ? buildNianjing(input.self, input.mirror_scope, input.active_concern_tags)
      : { phases: [], inflections: [] };
  return {
    stage_drivers: buildStageDrivers(input.self, input.canonical_window),
    key_windows: buildKeyWindows(input.self, input.canonical_window),
    yuejing_tendency_drivers: datedTendencies,
    nianjing_phase_drivers: nianjing.phases,
    nianjing_inflection_drivers: nianjing.inflections,
    uncertainty_inputs: [...input.base_uncertainty],
  };
}
