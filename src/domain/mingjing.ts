// SJG-ALGO-16 — 命镜 natal projection (MingJingChart).
//
// A deterministic, live projection over the self subject's NatalCanonicalization
// for the 命镜 (Destiny Mirror) surface (SJG-IA-08). It is NOT a persisted
// Reading and NOT part of the hashed AstrologyFeatureSnapshot envelope
// (SJG-ALGO-08): it reuses the bazi_ziping_v1 engine but is rebuilt on demand.
//
// 空亡 / 格局 / 五行分布 are display-authoritative here and tendency-neutral
// everywhere (SJG-ALGO-15 carve-out): they must never drive a tendency class,
// phase band, or inflection point. See [[mingjing-projection]] for assembly.

import type { BirthPrecision } from './person.ts';
import type { SubjectRef } from './subject-ref.ts';
import type { TendencyClass } from './mirror-output.ts';
import type {
  BaziBranchRelation,
  BaziInterpretation,
  DayunDirection,
  EarthlyBranch,
  FiveElement,
  GanzhiPillar,
  NatalChartSnapshot,
  PillarPosition,
} from './algorithm.ts';

// ── 空亡 (旬空) ──────────────────────────────────────────────────────────────

export interface BaziVoid {
  // The 旬 the day pillar belongs to, named by its head 干支 (e.g. 甲子).
  readonly xun: string;
  // The two 旬空 branches of that 旬.
  readonly void_branches: readonly EarthlyBranch[];
  // Natal pillars whose branch is one of the void branches.
  readonly void_positions: readonly PillarPosition[];
}

// ── 格局 (月令取格) ──────────────────────────────────────────────────────────

// Closed set of admitted 格局 names. 比劫 月令 resolves to 建禄/阳刃 rather than a
// 比肩/劫财 "格", so the eight 正格 plus the two 禄刃 forms are the full v1 surface.
export type BaziPatternName =
  | '正官格'
  | '七杀格'
  | '正印格'
  | '偏印格'
  | '正财格'
  | '偏财格'
  | '食神格'
  | '伤官格'
  | '建禄格'
  | '阳刃格';

export const BAZI_PATTERN_NAMES: readonly BaziPatternName[] = [
  '正官格',
  '七杀格',
  '正印格',
  '偏印格',
  '正财格',
  '偏财格',
  '食神格',
  '伤官格',
  '建禄格',
  '阳刃格',
] as const;

// How 月令取格 selected the 格: from the month-branch 本气, from a transparent
// (透干) middle/residual hidden stem, or as a 禄刃 form when the 本气 is 比劫.
export type BaziPatternSource = '本气' | '透干' | '禄刃';

export const BAZI_PATTERN_SOURCES: readonly BaziPatternSource[] = ['本气', '透干', '禄刃'] as const;

// 成格 (clean) / 假成 (formed but flawed) / 破格 (broken). A deterministic
// 透干 + 通根 + 月令逢冲 heuristic — never a luck score.
export type BaziPatternDisposition = '成格' | '假成' | '破格';

export const BAZI_PATTERN_DISPOSITIONS: readonly BaziPatternDisposition[] = [
  '成格',
  '假成',
  '破格',
] as const;

export interface BaziPattern {
  readonly name: BaziPatternName;
  // The 格 ten-god (月令本气 / 透出之神). Empty string for 禄刃 forms.
  readonly ten_god: string;
  readonly source: BaziPatternSource;
  readonly transparent: boolean; // 格神是否透干
  readonly rooted: boolean; // 格神是否通根月令
  readonly disposition: BaziPatternDisposition;
  readonly basis: readonly string[];
}

// ── 五行分布 ─────────────────────────────────────────────────────────────────

export type FiveElementTally = Readonly<Record<FiveElement, number>>;

export interface FiveElementDistribution {
  // Position-weighted scores (stems + 藏干), same weighting family as 旺衰.
  readonly weighted: FiveElementTally;
  // Raw stem + 藏干 occurrence counts.
  readonly count: FiveElementTally;
  readonly dominant: FiveElement;
  readonly weakest: FiveElement;
  // 五行缺 — elements with zero raw occurrences.
  readonly absent: readonly FiveElement[];
}

// ── 大运结构 ─────────────────────────────────────────────────────────────────

export type PeriodFavor = '喜' | '忌' | '平';

export const PERIOD_FAVORS: readonly PeriodFavor[] = ['喜', '忌', '平'] as const;

export interface DayunPeriodFeature {
  readonly pillar: GanzhiPillar;
  readonly start_age: number; // 虚岁
  readonly end_age: number;
  readonly start_year: number;
  readonly end_year: number;
  readonly stem_ten_god: string; // 十神 of the 大运 stem vs day master
  readonly terrain: string; // 日主 十二长生 at the 大运 branch
  readonly nature: TendencyClass; // 用神 favourability of the 大运 stem element
  readonly favor: PeriodFavor;
  readonly natal_branch_relations: readonly BaziBranchRelation[]; // 大运支 vs natal branches
  readonly is_inflection: boolean; // 转折: boundary / 冲提纲 / 冲日支
  readonly is_current: boolean;
}

export interface DayunStructure {
  readonly required: true;
  readonly direction: DayunDirection; // forward = 顺行, reverse = 逆行
  readonly start_age_years: number; // 起运
  readonly periods: readonly DayunPeriodFeature[];
}

// ── 流年关键窗口 ─────────────────────────────────────────────────────────────

export type LiuNianSalience = 'high' | 'medium';

export const LIUNIAN_SALIENCES: readonly LiuNianSalience[] = ['high', 'medium'] as const;

export interface LiuNianYearPillar {
  readonly year: number;
  readonly pillar: GanzhiPillar;
}

export interface LiuNianWindow {
  readonly start_year: number;
  readonly end_year: number;
  readonly pillars: readonly LiuNianYearPillar[];
  readonly nature: TendencyClass;
  readonly favor: PeriodFavor;
  readonly salience: LiuNianSalience;
  readonly natal_branch_relations: readonly BaziBranchRelation[]; // 流年支 vs 日支/月令
  readonly dayun_pillar?: GanzhiPillar; // the 大运 the window sits in
  readonly basis: readonly string[];
}

export interface LiuNianHorizon {
  readonly start_year: number;
  readonly end_year: number;
}

export interface LiuNianProjection {
  readonly horizon: LiuNianHorizon;
  // Salient windows only — never a year-by-year ledger (SJG-ALGO-16).
  readonly windows: readonly LiuNianWindow[];
}

// ── MingJingChart ────────────────────────────────────────────────────────────

export interface MingJingChart {
  readonly subject_ref: SubjectRef; // always 'self' in v1
  readonly canonicalization_hash: string;
  readonly natal_chart: NatalChartSnapshot;
  readonly interpretation: BaziInterpretation;
  readonly void: BaziVoid;
  readonly five_elements: FiveElementDistribution;
  readonly pattern: BaziPattern;
  readonly dayun: DayunStructure;
  readonly liunian: LiuNianProjection;
  readonly birth_precision: BirthPrecision;
}
