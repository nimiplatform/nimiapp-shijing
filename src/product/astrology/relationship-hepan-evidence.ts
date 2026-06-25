// SJG-ALGO-17 - deterministic self-plus-person Relationship HePan evidence.
//
// This layer derives method-backed relationship evidence only. Runtime AI may
// later word admitted prose fields, but it must not calculate or replace these
// deterministic drivers.

import type {
  BaziSubjectChart,
  CycleMarker,
  MethodEvidence,
  PillarPosition,
  QizhengSiyuBody,
  QizhengSiyuSubjectChart,
  RelationshipElementDirection,
  RelationshipHePanEvidence,
  RelationshipTimingEvidenceWindow,
  ZiweiSubjectChart,
} from '../../domain/algorithm.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { isSelfRef, subjectRefEquals } from '../../domain/subject-ref.ts';
import type { StageResult } from './stage-result.ts';
import { classifyBranchPair } from './branch-relations.ts';
import { STEM_TO_ELEMENT, elementControls, elementGenerates } from './element-relations.ts';

const PILLAR_POSITIONS: readonly PillarPosition[] = ['year', 'month', 'day', 'hour'] as const;
const PERIOD_MARKER_KINDS = new Set<string>(['dayun_boundary', 'annual_transition']);
const ZIWEI_BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

function chartPillar(chart: BaziSubjectChart, position: PillarPosition) {
  switch (position) {
    case 'year':
      return chart.natal_chart.year_pillar;
    case 'month':
      return chart.natal_chart.month_pillar;
    case 'day':
      return chart.natal_chart.day_pillar;
    case 'hour':
      return chart.natal_chart.hour_pillar;
  }
}

function unknownDirection(driverRef: string): RelationshipElementDirection {
  return { label: 'unknown', driver_ref: driverRef };
}

function dayMasterDirection(
  self: BaziSubjectChart,
  related: BaziSubjectChart,
): RelationshipElementDirection {
  const selfStem = self.natal_chart.day_master ?? self.natal_chart.day_pillar?.stem;
  const relatedStem = related.natal_chart.day_master ?? related.natal_chart.day_pillar?.stem;
  if (!selfStem || !relatedStem) {
    return unknownDirection('bazi:relationship.day_master.unknown');
  }
  const selfElement = STEM_TO_ELEMENT[selfStem];
  const relatedElement = STEM_TO_ELEMENT[relatedStem];
  const driverRef = `bazi:relationship.day_master.${relatedElement}->${selfElement}`;
  if (relatedElement === selfElement) return { label: 'same', driver_ref: driverRef };
  if (elementGenerates(relatedElement, selfElement)) return { label: 'supporting', driver_ref: driverRef };
  if (elementControls(relatedElement, selfElement)) return { label: 'controlling', driver_ref: driverRef };
  if (elementGenerates(selfElement, relatedElement) || elementControls(selfElement, relatedElement)) {
    return { label: 'draining', driver_ref: driverRef };
  }
  return unknownDirection(driverRef);
}

function yongShenDirection(
  self: BaziSubjectChart,
  related: BaziSubjectChart,
): RelationshipElementDirection {
  const yong = self.interpretation?.yong_shen;
  const relatedStem = related.natal_chart.day_master ?? related.natal_chart.day_pillar?.stem;
  if (!yong || !relatedStem) {
    return unknownDirection('bazi:relationship.yong_shen.unknown');
  }
  const element = STEM_TO_ELEMENT[relatedStem];
  const driverRef = `bazi:relationship.yong_shen.${element}`;
  if (yong.yong.includes(element) || yong.xi.includes(element) || yong.tiaohou === element) {
    return { label: 'supporting', driver_ref: driverRef };
  }
  if (yong.ji.includes(element)) {
    return { label: 'draining', driver_ref: driverRef };
  }
  return { label: 'unknown', driver_ref: driverRef };
}

function tenGodDirection(
  self: BaziSubjectChart,
  related: BaziSubjectChart,
): RelationshipElementDirection {
  const selfStem = self.natal_chart.day_master ?? self.natal_chart.day_pillar?.stem;
  const relatedStem = related.natal_chart.day_master ?? related.natal_chart.day_pillar?.stem;
  if (!selfStem || !relatedStem) {
    return unknownDirection(
      `bazi:relationship.ten_god.related_day_master.${relatedStem ?? 'unknown'}:unknown->self_day_master.${selfStem ?? 'unknown'}`,
    );
  }
  const selfElement = STEM_TO_ELEMENT[selfStem];
  const relatedElement = STEM_TO_ELEMENT[relatedStem];
  if (relatedElement === selfElement) {
    return {
      label: 'same',
      driver_ref: `bazi:relationship.ten_god.related_day_master.${relatedStem}:bijie->self_day_master.${selfStem}`,
    };
  }
  if (elementGenerates(relatedElement, selfElement)) {
    return {
      label: 'supporting',
      driver_ref: `bazi:relationship.ten_god.related_day_master.${relatedStem}:yin->self_day_master.${selfStem}`,
    };
  }
  if (elementGenerates(selfElement, relatedElement)) {
    return {
      label: 'draining',
      driver_ref: `bazi:relationship.ten_god.related_day_master.${relatedStem}:shishang->self_day_master.${selfStem}`,
    };
  }
  if (elementControls(relatedElement, selfElement)) {
    return {
      label: 'controlling',
      driver_ref: `bazi:relationship.ten_god.related_day_master.${relatedStem}:guansha->self_day_master.${selfStem}`,
    };
  }
  if (elementControls(selfElement, relatedElement)) {
    return {
      label: 'draining',
      driver_ref: `bazi:relationship.ten_god.related_day_master.${relatedStem}:cai->self_day_master.${selfStem}`,
    };
  }
  return unknownDirection(
    `bazi:relationship.ten_god.related_day_master.${relatedStem}:unknown->self_day_master.${selfStem}`,
  );
}

function subjectDriverLabel(ref: SubjectRef): string {
  if (isSelfRef(ref)) return 'self';
  return `person:${ref.id}`;
}

function markerUtcYear(marker: CycleMarker): number | null {
  const date = new Date(marker.start_utc);
  const year = date.getUTCFullYear();
  return Number.isFinite(year) ? year : null;
}

function isRelevantPeriodMarker(marker: CycleMarker, anchorYear: number): boolean {
  if (!PERIOD_MARKER_KINDS.has(marker.kind)) return false;
  const year = markerUtcYear(marker);
  return year !== null && Math.abs(year - anchorYear) <= 1;
}

function periodMarkerDriverRefs(chart: BaziSubjectChart, anchorYear: number): string[] {
  const subjectLabel = subjectDriverLabel(chart.subject_ref);
  const markers = chart.cycle_snapshot.markers
    .filter((marker) => isRelevantPeriodMarker(marker, anchorYear))
    .sort((a, b) => a.start_utc.localeCompare(b.start_utc));
  if (markers.length === 0) {
    return [`bazi:relationship.period.${subjectLabel}.fallback.anchor_year.${anchorYear}`];
  }
  return markers.map(
    (marker) => `bazi:relationship.period.${subjectLabel}.${marker.kind}@${marker.start_utc}`,
  );
}

function natureForDirection(direction: RelationshipElementDirection['label']): RelationshipTimingEvidenceWindow['nature'] {
  switch (direction) {
    case 'supporting':
      return 'supportive';
    case 'controlling':
      return 'blocked';
    case 'draining':
      return 'watch';
    case 'same':
    case 'unknown':
      return 'steady';
  }
}

function annualWindow(
  anchorYear: number,
  driverRefs: readonly string[],
  nature: RelationshipTimingEvidenceWindow['nature'],
): RelationshipTimingEvidenceWindow {
  return {
    start_date: `${anchorYear}-01-01`,
    end_date: `${anchorYear}-12-31`,
    nature,
    driver_refs: driverRefs.length > 0 ? [...driverRefs] : [`bazi:relationship.anchor_year.${anchorYear}`],
  };
}

function branchDistance(a: string, b: string): number | null {
  const ai = ZIWEI_BRANCH_ORDER.indexOf(a as (typeof ZIWEI_BRANCH_ORDER)[number]);
  const bi = ZIWEI_BRANCH_ORDER.indexOf(b as (typeof ZIWEI_BRANCH_ORDER)[number]);
  if (ai < 0 || bi < 0) return null;
  const raw = Math.abs(ai - bi);
  return Math.min(raw, 12 - raw);
}

function directionFromBranchDistance(distance: number | null, driverRef: string): RelationshipElementDirection {
  if (distance === 0) return { label: 'same', driver_ref: driverRef };
  if (distance === 4) return { label: 'supporting', driver_ref: driverRef };
  if (distance === 6) return { label: 'controlling', driver_ref: driverRef };
  if (distance === 2 || distance === 10) return { label: 'draining', driver_ref: driverRef };
  return { label: 'unknown', driver_ref: driverRef };
}

function angleDistance(a: number, b: number): number {
  const raw = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(raw, 360 - raw);
}

function directionFromAngleDistance(distance: number, driverRef: string): RelationshipElementDirection {
  if (distance <= 15) return { label: 'same', driver_ref: driverRef };
  if (distance <= 75) return { label: 'supporting', driver_ref: driverRef };
  if (distance >= 165) return { label: 'controlling', driver_ref: driverRef };
  if (distance >= 90 && distance <= 135) return { label: 'draining', driver_ref: driverRef };
  return { label: 'unknown', driver_ref: driverRef };
}

function ziweiPalaceName(chart: ZiweiSubjectChart, kind: 'soul' | 'body'): string {
  const palace = chart.palaces.find((item) => kind === 'soul' ? item.is_soul : item.is_body);
  return palace?.name ?? 'unknown';
}

function deriveZiweiRelationshipHePan(input: {
  readonly method_evidence: Extract<MethodEvidence, { method_id: 'ziwei_sanhe_v1' }>;
  readonly related_person_ref: Extract<SubjectRef, { kind: 'person' }>;
  readonly display_name_snapshot: string;
  readonly anchor_year: number;
}): StageResult<RelationshipHePanEvidence> {
  const self = input.method_evidence.ziwei.self_subject;
  const related = input.method_evidence.ziwei.related_persons.find((chart) =>
    subjectRefEquals(chart.subject_ref, input.related_person_ref),
  );
  if (!related) {
    return {
      ok: false,
      error: {
        stage: 'build_feature_snapshot',
        kind: 'stage_missing_input',
        subject_ref: input.related_person_ref,
        detail: `relationship_hepan related chart missing for ${input.related_person_ref.id}`,
      },
    };
  }

  const dayMasterDriver = `ziwei:relationship.minggong.${related.soul_palace_branch}->${self.soul_palace_branch}`;
  const dayMasterRelation = directionFromBranchDistance(
    branchDistance(self.soul_palace_branch, related.soul_palace_branch),
    dayMasterDriver,
  );
  const tenGodDriver = `ziwei:relationship.main_star.${related.soul_star}->${self.soul_star}`;
  const tenGodRelation: RelationshipElementDirection =
    related.soul_star === self.soul_star
      ? { label: 'same', driver_ref: tenGodDriver }
      : related.soul_star === self.body_star || related.body_star === self.soul_star
        ? { label: 'supporting', driver_ref: tenGodDriver }
        : { label: 'unknown', driver_ref: tenGodDriver };
  const yongShenDriver = `ziwei:relationship.wuxingju.${related.five_elements_class}->${self.five_elements_class}`;
  const yongShenRelation: RelationshipElementDirection =
    related.five_elements_class === self.five_elements_class
      ? { label: 'same', driver_ref: yongShenDriver }
      : { label: 'unknown', driver_ref: yongShenDriver };
  const timingDriverRefs = [
    `ziwei:relationship.anchor_year.${input.anchor_year}`,
    `ziwei:relationship.self.minggong.${ziweiPalaceName(self, 'soul')}.${self.soul_palace_branch}`,
    `ziwei:relationship.person:${input.related_person_ref.id}.minggong.${ziweiPalaceName(related, 'soul')}.${related.soul_palace_branch}`,
    `ziwei:relationship.self.shengong.${ziweiPalaceName(self, 'body')}`,
    `ziwei:relationship.person:${input.related_person_ref.id}.shengong.${ziweiPalaceName(related, 'body')}`,
    dayMasterRelation.driver_ref,
    tenGodRelation.driver_ref,
    yongShenRelation.driver_ref,
  ];

  return {
    ok: true,
    value: {
      related_person_ref: input.related_person_ref,
      display_name_snapshot: input.display_name_snapshot,
      branch_interactions: [],
      day_master_relation: dayMasterRelation,
      ten_god_relation: tenGodRelation,
      yong_shen_relation: yongShenRelation,
      timing_windows: [
        annualWindow(input.anchor_year, timingDriverRefs, natureForDirection(dayMasterRelation.label)),
      ],
    },
  };
}

function bodyByKey(chart: QizhengSiyuSubjectChart, key: QizhengSiyuBody['key']): QizhengSiyuBody | undefined {
  return chart.bodies.find((body) => body.key === key);
}

function primaryLuminary(chart: QizhengSiyuSubjectChart): QizhengSiyuBody | undefined {
  return chart.chart_basis.day_night === 'day'
    ? bodyByKey(chart, 'taiyang')
    : bodyByKey(chart, 'taiyin');
}

function deriveQizhengRelationshipHePan(input: {
  readonly method_evidence: Extract<MethodEvidence, { method_id: 'qizheng_siyu_guolao_v1' }>;
  readonly related_person_ref: Extract<SubjectRef, { kind: 'person' }>;
  readonly display_name_snapshot: string;
  readonly anchor_year: number;
}): StageResult<RelationshipHePanEvidence> {
  const self = input.method_evidence.qizheng_siyu.self_subject;
  const related = input.method_evidence.qizheng_siyu.related_persons.find((chart) =>
    subjectRefEquals(chart.subject_ref, input.related_person_ref),
  );
  if (!related) {
    return {
      ok: false,
      error: {
        stage: 'build_feature_snapshot',
        kind: 'stage_missing_input',
        subject_ref: input.related_person_ref,
        detail: `relationship_hepan related chart missing for ${input.related_person_ref.id}`,
      },
    };
  }

  const ascDistance = angleDistance(
    self.chart_basis.ascendant_longitude,
    related.chart_basis.ascendant_longitude,
  );
  const dayMasterRelation = directionFromAngleDistance(
    ascDistance,
    `qizheng_siyu:relationship.ascendant.delta.${Math.round(ascDistance)}`,
  );
  const selfLuminary = primaryLuminary(self);
  const relatedLuminary = primaryLuminary(related);
  const tenGodDriver = `qizheng_siyu:relationship.luminary.${relatedLuminary?.key ?? 'unknown'}->${selfLuminary?.key ?? 'unknown'}`;
  const tenGodRelation: RelationshipElementDirection =
    selfLuminary && relatedLuminary && selfLuminary.house_name === relatedLuminary.house_name
      ? { label: 'same', driver_ref: tenGodDriver }
      : selfLuminary && relatedLuminary && selfLuminary.mansion === relatedLuminary.mansion
        ? { label: 'supporting', driver_ref: tenGodDriver }
        : { label: 'unknown', driver_ref: tenGodDriver };
  const selfTaibai = bodyByKey(self, 'taibai');
  const relatedTaibai = bodyByKey(related, 'taibai');
  const yongShenDriver = `qizheng_siyu:relationship.taibai.${relatedTaibai?.house_name ?? 'unknown'}->${selfTaibai?.house_name ?? 'unknown'}`;
  const yongShenRelation: RelationshipElementDirection =
    selfTaibai && relatedTaibai && selfTaibai.house_name === relatedTaibai.house_name
      ? { label: 'supporting', driver_ref: yongShenDriver }
      : { label: 'unknown', driver_ref: yongShenDriver };
  const timingDriverRefs = [
    `qizheng_siyu:relationship.anchor_year.${input.anchor_year}`,
    `qizheng_siyu:relationship.self.ascendant.${Math.round(self.chart_basis.ascendant_longitude)}`,
    `qizheng_siyu:relationship.person:${input.related_person_ref.id}.ascendant.${Math.round(related.chart_basis.ascendant_longitude)}`,
    `qizheng_siyu:relationship.self.luminary.${selfLuminary?.key ?? 'unknown'}.${selfLuminary?.house_name ?? 'unknown'}`,
    `qizheng_siyu:relationship.person:${input.related_person_ref.id}.luminary.${relatedLuminary?.key ?? 'unknown'}.${relatedLuminary?.house_name ?? 'unknown'}`,
    dayMasterRelation.driver_ref,
    tenGodRelation.driver_ref,
    yongShenRelation.driver_ref,
  ];

  return {
    ok: true,
    value: {
      related_person_ref: input.related_person_ref,
      display_name_snapshot: input.display_name_snapshot,
      branch_interactions: [],
      day_master_relation: dayMasterRelation,
      ten_god_relation: tenGodRelation,
      yong_shen_relation: yongShenRelation,
      timing_windows: [
        annualWindow(input.anchor_year, timingDriverRefs, natureForDirection(dayMasterRelation.label)),
      ],
    },
  };
}

function deriveBaziRelationshipHePan(input: {
  readonly method_evidence: Extract<MethodEvidence, { method_id: 'bazi_ziping_v1' }>;
  readonly related_person_ref: Extract<SubjectRef, { kind: 'person' }>;
  readonly display_name_snapshot: string;
  readonly anchor_year: number;
}): StageResult<RelationshipHePanEvidence> {
  const self = input.method_evidence.bazi.self_subject;
  const related = input.method_evidence.bazi.related_persons.find((chart) =>
    subjectRefEquals(chart.subject_ref, input.related_person_ref),
  );
  if (!related) {
    return {
      ok: false,
      error: {
        stage: 'build_feature_snapshot',
        kind: 'stage_missing_input',
        subject_ref: input.related_person_ref,
        detail: `relationship_hepan related chart missing for ${input.related_person_ref.id}`,
      },
    };
  }

  const branchInteractions = [];
  for (const selfPosition of PILLAR_POSITIONS) {
    const selfPillar = chartPillar(self, selfPosition);
    if (!selfPillar) continue;
    for (const relatedPosition of PILLAR_POSITIONS) {
      const relatedPillar = chartPillar(related, relatedPosition);
      if (!relatedPillar) continue;
      const kind = classifyBranchPair(selfPillar.branch, relatedPillar.branch);
      if (!kind) continue;
      branchInteractions.push({
        self_position: selfPosition,
        related_position: relatedPosition,
        kind,
        driver_ref: `bazi:relationship.branch.${selfPosition}-${relatedPosition}.${kind}@${selfPillar.branch}-${relatedPillar.branch}`,
      });
    }
  }

  const dayMasterRelation = dayMasterDirection(self, related);
  const tenGodRelation = tenGodDirection(self, related);
  const yongShenRelation = yongShenDirection(self, related);
  const periodDriverRefs = [
    ...periodMarkerDriverRefs(self, input.anchor_year),
    ...periodMarkerDriverRefs(related, input.anchor_year),
  ];
  const timingDriverRefs = [
    `bazi:relationship.anchor_year.${input.anchor_year}`,
    ...periodDriverRefs,
    dayMasterRelation.driver_ref,
    tenGodRelation.driver_ref,
    yongShenRelation.driver_ref,
    ...branchInteractions.slice(0, 3).map((item) => item.driver_ref),
  ];

  return {
    ok: true,
    value: {
      related_person_ref: input.related_person_ref,
      display_name_snapshot: input.display_name_snapshot,
      branch_interactions: branchInteractions,
      day_master_relation: dayMasterRelation,
      ten_god_relation: tenGodRelation,
      yong_shen_relation: yongShenRelation,
      timing_windows: [
        annualWindow(input.anchor_year, timingDriverRefs, natureForDirection(yongShenRelation.label)),
      ],
    },
  };
}

export function deriveRelationshipHePanEvidence(input: {
  readonly method_evidence: MethodEvidence;
  readonly related_person_ref: Extract<SubjectRef, { kind: 'person' }>;
  readonly display_name_snapshot: string;
  readonly anchor_year: number;
}): StageResult<RelationshipHePanEvidence> {
  if (input.method_evidence.method_id === 'bazi_ziping_v1') {
    return deriveBaziRelationshipHePan({
      method_evidence: input.method_evidence,
      related_person_ref: input.related_person_ref,
      display_name_snapshot: input.display_name_snapshot,
      anchor_year: input.anchor_year,
    });
  }
  if (input.method_evidence.method_id === 'ziwei_sanhe_v1') {
    return deriveZiweiRelationshipHePan({
      method_evidence: input.method_evidence,
      related_person_ref: input.related_person_ref,
      display_name_snapshot: input.display_name_snapshot,
      anchor_year: input.anchor_year,
    });
  }
  if (input.method_evidence.method_id === 'qizheng_siyu_guolao_v1') {
    return deriveQizhengRelationshipHePan({
      method_evidence: input.method_evidence,
      related_person_ref: input.related_person_ref,
      display_name_snapshot: input.display_name_snapshot,
      anchor_year: input.anchor_year,
    });
  }
  return {
    ok: false,
    error: {
      stage: 'build_feature_snapshot',
      kind: 'stage_invalid_input',
      subject_ref: input.related_person_ref,
      detail: 'relationship_hepan method not_supported:unknown',
    },
  };
}
