// SJG-ALGO-17 - deterministic self-plus-person Relationship HePan evidence.
//
// This layer derives method-backed relationship evidence only. Runtime AI may
// later word admitted prose fields, but it must not calculate or replace these
// deterministic drivers.

import type {
  BaziSubjectChart,
  MethodEvidence,
  PillarPosition,
  RelationshipElementDirection,
  RelationshipHePanEvidence,
  RelationshipTimingEvidenceWindow,
} from '../../domain/algorithm.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { subjectRefEquals } from '../../domain/subject-ref.ts';
import type { StageResult } from './stage-result.ts';
import { classifyBranchPair } from './branch-relations.ts';
import { STEM_TO_ELEMENT, elementControls, elementGenerates } from './element-relations.ts';

const PILLAR_POSITIONS: readonly PillarPosition[] = ['year', 'month', 'day', 'hour'] as const;

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
  const yongShenRelation = yongShenDirection(self, related);
  const timingDriverRefs = [
    `bazi:relationship.anchor_year.${input.anchor_year}`,
    dayMasterRelation.driver_ref,
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
