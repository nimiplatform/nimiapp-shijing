// SJG-ASTRO-13 - structural MingJing Relationship HePan generator.
//
// Produces validator-safe deterministic structure only: pattern selection,
// ranking, evidence refs, recent-changes availability, and the action target
// all come from the admitted pattern projection. Prose fields are seeded with
// templated English strings; Runtime AI wording is still required before a
// Reading may be persisted.
// @nimi-authority: rule.shijing.astrology.r013

import type {
  AstrologyFeatureSnapshot,
  MethodProfileId,
} from '../../domain/algorithm.ts';
import type { RelationshipNatalMirrorScope } from '../../domain/mirror-scope.ts';
import type {
  MingJingRelationshipMirrorOutput,
  MingJingRelationshipOverview,
  RelationshipPatternRuleId,
  TendencyClass,
} from '../../domain/mirror-output.ts';
import { subjectRefEquals } from '../../domain/subject-ref.ts';
import {
  getRelationshipPatternRule,
  projectRelationshipPatterns,
  type ProjectedRelationshipPattern,
} from './relationship-pattern-rules.ts';
import type { StageResult } from './stage-result.ts';

function recentWindowSummary(nature: TendencyClass): string {
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

function ruleShortToken(ruleRef: RelationshipPatternRuleId): string {
  return ruleRef.replace('bazi_ziping_v1.hepan.', '').replace(/_/g, '-');
}

function seedOverview(
  patterns: readonly ProjectedRelationshipPattern[],
): MingJingRelationshipOverview {
  const ruleRefs = patterns.map((pattern) => pattern.rule_ref);
  return {
    title: `Pattern seed: ${ruleShortToken(patterns[0]!.rule_ref)}${patterns.length > 1 ? ` +${patterns.length - 1} more` : ''}`,
    summary:
      `Deterministic projection admitted ${patterns.length} pattern(s) for this reading: ${ruleRefs.join(', ')}. ` +
      'Each pattern keeps its evidence summary verbatim; Runtime AI rewrites this overview into plain language over the admitted set only.',
    keywords: patterns.slice(0, 3).map((pattern) => ruleShortToken(pattern.rule_ref)),
  };
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

  const projection = projectRelationshipPatterns({
    method_profile_id: input.method_profile_id,
    evidence,
  });
  if (!projection.ok) {
    return {
      ok: false,
      error: {
        stage: 'relationship_pattern_projection',
        kind: 'stage_missing_input',
        detail: projection.detail,
      },
    };
  }

  const rankOne = projection.patterns[0]!;
  const rankOneSeed = getRelationshipPatternRule(rankOne.rule_ref).seed;

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
      overview: seedOverview(projection.patterns),
      patterns: projection.patterns.map((pattern) => {
        const seed = getRelationshipPatternRule(pattern.rule_ref).seed;
        return {
          pattern_id: pattern.pattern_id,
          rule_ref: pattern.rule_ref,
          rank: pattern.rank,
          driver_refs: [...pattern.driver_refs],
          evidence_summary: pattern.evidence_summary,
          name: seed.name,
          self_tendency: seed.self_tendency,
          related_tendency: seed.related_tendency,
          scenario: seed.scenario,
          aligned_expression: seed.aligned_expression,
          friction_expression: seed.friction_expression,
          signals: [...seed.signals],
        };
      }),
      recent_status: projection.recent_status.availability === 'available'
        ? {
            availability: 'available',
            window: {
              start_date: projection.recent_status.window.start_date,
              end_date: projection.recent_status.window.end_date,
              nature: projection.recent_status.window.nature,
              driver_refs: [...projection.recent_status.window.driver_refs],
              summary: recentWindowSummary(projection.recent_status.window.nature),
            },
          }
        : projection.recent_status,
      action: {
        target: projection.action_target,
        ...(projection.action_target.kind === 'recent_window'
          ? {
              situation: `Use this during the evidenced ${input.mirror_scope.anchor_year} window, when a shared decision or commitment is on the table.`,
              step: 'Before agreeing, write down the decision, the owner, and the check-back date in one message the other person can answer directly.',
              example_phrase: '"Before we decide, can we each name our part and when we will check back?"',
              rationale:
                'The window evidence only marks a period tendency; a concrete confirmation habit is useful in either direction and does not depend on the other person changing.',
              observation:
                'Watch whether the other person answers the concrete question or deflects it; that response is the real signal for the next step.',
            }
          : {
              situation: `Use this the next time the "${rankOneSeed.name}" pattern shows up: ${rankOneSeed.scenario}`,
              step: 'Name what you observed in one sentence, ask one open question about how the other person saw the same moment, and agree on one small next step.',
              example_phrase: '"In that moment just now I noticed ... — how did you see it?"',
              rationale:
                'The pattern evidence only marks a tendency; a short observational check tests it against reality without asking the other person to change first.',
              observation:
                'Watch whether the other person engages with the concrete moment or generalizes; record what actually happened as a real signal for this pattern.',
            }),
      },
      cited_event_memory_refs: [...input.cited_event_memory_refs],
      cited_plan_item_refs: [...input.cited_plan_item_refs],
      citations: [{ method: input.method_profile_id, reference: 'mingjing.relationship_hepan.v1' }],
    },
  };
}
