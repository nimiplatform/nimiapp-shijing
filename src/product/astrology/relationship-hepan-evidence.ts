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
  RelationshipElementDirection,
  RelationshipHePanEvidence,
  RelationshipTimingEvidenceWindow,
} from '../../domain/algorithm.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { isSelfRef, subjectRefEquals } from '../../domain/subject-ref.ts';
import type { StageResult } from './stage-result.ts';
import { classifyBranchPair } from './branch-relations.ts';
import { STEM_TO_ELEMENT, elementControls, elementGenerates } from './element-relations.ts';

const PILLAR_POSITIONS: readonly PillarPosition[] = ['year', 'month', 'day', 'hour'] as const;
const PERIOD_MARKER_KINDS = new Set<string>(['dayun_boundary', 'annual_transition']);

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

function directionForTenGod(tenGod: string | undefined, driverRef: string): RelationshipElementDirection {
  if (!tenGod) return unknownDirection(driverRef);
  if (/比|劫/u.test(tenGod)) return { label: 'same', driver_ref: driverRef };
  if (/印/u.test(tenGod)) return { label: 'supporting', driver_ref: driverRef };
  if (/官|杀|殺/u.test(tenGod)) return { label: 'controlling', driver_ref: driverRef };
  if (/食|伤|傷|财|財/u.test(tenGod)) return { label: 'draining', driver_ref: driverRef };
  return { label: 'unknown', driver_ref: driverRef };
}

function tenGodDirection(
  self: BaziSubjectChart,
  related: BaziSubjectChart,
): RelationshipElementDirection {
  const selfDayTenGod = self.interpretation?.pillars.find((pillar) => pillar.position === 'day')?.ten_god;
  const relatedDayTenGod = related.interpretation?.pillars.find((pillar) => pillar.position === 'day')?.ten_god;
  const driverRef = `bazi:relationship.ten_god.self_day.${selfDayTenGod ?? 'unknown'}->related_day.${relatedDayTenGod ?? 'unknown'}`;
  if (!selfDayTenGod && !relatedDayTenGod) return unknownDirection(driverRef);
  if (selfDayTenGod && relatedDayTenGod && selfDayTenGod === relatedDayTenGod) {
    return { label: 'same', driver_ref: driverRef };
  }
  return directionForTenGod(relatedDayTenGod ?? selfDayTenGod, driverRef);
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

function deriveUnknownMethodRelationshipHePan(input: {
  readonly method_evidence: MethodEvidence;
  readonly related_person_ref: Extract<SubjectRef, { kind: 'person' }>;
  readonly display_name_snapshot: string;
  readonly anchor_year: number;
}): RelationshipHePanEvidence {
  const methodRef = `${input.method_evidence.method_id}:relationship_hepan.unsupported_method`;
  return {
    related_person_ref: input.related_person_ref,
    display_name_snapshot: input.display_name_snapshot,
    branch_interactions: [],
    day_master_relation: { label: 'unknown', driver_ref: `${methodRef}.day_master` },
    ten_god_relation: { label: 'unknown', driver_ref: `${methodRef}.ten_god` },
    yong_shen_relation: { label: 'unknown', driver_ref: `${methodRef}.yong_shen` },
    timing_windows: [
      annualWindow(input.anchor_year, [`${methodRef}.anchor_year.${input.anchor_year}`], 'steady'),
    ],
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
  return {
    ok: true,
    value: deriveUnknownMethodRelationshipHePan(input),
  };
}
