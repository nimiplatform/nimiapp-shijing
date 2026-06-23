// SJG-ASTRO-13 - structural MingJing Relationship HePan generator.
//
// Produces validator-safe deterministic structure only. Runtime AI wording is
// still required before a Reading may be persisted.

import type {
  AstrologyFeatureSnapshot,
  MethodProfileId,
  RelationshipHePanEvidence,
} from '../../domain/algorithm.ts';
import type { RelationshipNatalMirrorScope } from '../../domain/mirror-scope.ts';
import type { MingJingRelationshipMirrorOutput } from '../../domain/mirror-output.ts';
import { subjectRefEquals } from '../../domain/subject-ref.ts';
import type { StageResult } from './stage-result.ts';

function directionText(label: RelationshipHePanEvidence['day_master_relation']['label']): string {
  switch (label) {
    case 'supporting':
      return 'supporting';
    case 'draining':
      return 'draining';
    case 'controlling':
      return 'controlling';
    case 'same':
      return 'same-element';
    case 'unknown':
      return 'unresolved';
  }
}

function timingSummary(nature: MingJingRelationshipMirrorOutput['timing_windows'][number]['nature']): string {
  switch (nature) {
    case 'supportive':
      return 'Anchor-year evidence leans supportive; use the window for explicit coordination and shared commitments.';
    case 'steady':
      return 'Anchor-year evidence is steady; keep communication regular and avoid assuming unspoken agreement.';
    case 'watch':
      return 'Anchor-year evidence asks for watchfulness; slow decisions down and check expectations before acting.';
    case 'blocked':
      return 'Anchor-year evidence marks friction; protect boundaries and repair misunderstandings quickly.';
    case 'turning':
      return 'Anchor-year evidence marks a turn; revisit the relationship rhythm before expanding obligations.';
  }
}

export function generateMingJingRelationshipOutput(input: {
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly mirror_scope: RelationshipNatalMirrorScope;
  readonly method_profile_id: MethodProfileId;
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
}): StageResult<MingJingRelationshipMirrorOutput> {
  const evidence = input.feature_snapshot.common.relationship_hepan;
  if (!evidence) {
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_missing_input',
        detail: 'feature_snapshot.common.relationship_hepan is required',
      },
    };
  }
  if (!subjectRefEquals(evidence.related_person_ref, input.mirror_scope.related_person_ref)) {
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_invalid_input',
        subject_ref: input.mirror_scope.related_person_ref,
        detail: 'relationship_hepan related_person_ref mismatch',
      },
    };
  }
  if (evidence.timing_windows.length === 0) {
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_missing_input',
        detail: 'relationship_hepan timing_windows are required',
      },
    };
  }
  for (const window of evidence.timing_windows) {
    if (window.driver_refs.length === 0 || window.driver_refs.some((ref) => ref.length === 0)) {
      return {
        ok: false,
        error: {
          stage: 'mingjing_projection',
          kind: 'stage_invalid_input',
          detail: 'relationship_hepan timing window driver_refs are required',
        },
      };
    }
  }

  const branchCount = evidence.branch_interactions.length;
  const dayMaster = directionText(evidence.day_master_relation.label);
  const yongShen = directionText(evidence.yong_shen_relation.label);

  return {
    ok: true,
    value: {
      mirror_kind: 'mingjing',
      output_kind: 'relationship_hepan',
      relationship_subject: {
        primary_subject_ref: 'self',
        related_person_ref: input.mirror_scope.related_person_ref,
        anchor_year: input.mirror_scope.anchor_year,
        basis_time_zone: input.mirror_scope.basis_time_zone,
      },
      summary: `Relationship HePan structural seed for ${input.mirror_scope.anchor_year}: day-master relation ${dayMaster}, yong-shen relation ${yongShen}.`,
      structure: {
        baseline_pattern: `The deterministic baseline is built from ${branchCount} branch interaction driver(s) plus day-master and yong-shen relation evidence.`,
        attraction_and_support: `Support cues come from ${evidence.day_master_relation.driver_ref} and ${evidence.yong_shen_relation.driver_ref}; treat them as coordination evidence, not a score.`,
        friction_and_misread: 'Potential friction should be read through concrete driver refs and repaired through explicit expectation checks.',
        communication_rhythm: 'Use short, regular check-ins when shared timing changes; do not rely on implied consent or silent alignment.',
        boundary_advice: 'Keep separate recovery time and decision authority visible before merging plans or obligations.',
      },
      timing_windows: evidence.timing_windows.map((window) => ({
        start_date: window.start_date,
        end_date: window.end_date,
        nature: window.nature,
        driver_refs: [...window.driver_refs],
        summary: timingSummary(window.nature),
      })),
      practice: {
        communication: 'State the concrete need, the timing, and the requested response before interpreting emotion.',
        boundary: 'Name what remains individual and what is shared before adding commitments.',
        repair: 'Return to the exact missed expectation, confirm each side heard it, and reset the next observable step.',
      },
      cited_event_memory_refs: [...input.cited_event_memory_refs],
      cited_plan_item_refs: [...input.cited_plan_item_refs],
      citations: [{ method: input.method_profile_id, reference: 'mingjing.relationship_hepan.v1' }],
    },
  };
}
