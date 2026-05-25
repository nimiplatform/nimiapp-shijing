// SJG-DATA-10 — ShiJingCatalog loader. The catalog is product
// authority (not per-user, not stored under ShiJingSpace) so we
// bundle the kernel/tables/view-template-catalog.yaml seed inline as
// JSON.  Hand-edits to the yaml MUST be mirrored here; the integrity
// test (test/catalog.test.mjs) cross-checks the in-memory catalog
// against the kernel yaml so drift fails closed.

import type { ShiJingCatalog, ViewTemplate } from '../../domain/shijing-catalog.ts';
import {
  VIEW_TEMPLATE_CATEGORIES,
  VIEW_TEMPLATE_ID_PATTERN,
} from '../../domain/shijing-catalog.ts';
import { TIME_SCOPES } from '../../domain/view.ts';

const SEED_TEMPLATES: readonly ViewTemplate[] = [
  {
    id: 'self_weekly_reflection',
    title: '自我观察周',
    description: '以 self 为锚，回顾本周自身状态与节奏。',
    default_time_scope: 'rolling',
    default_instructions: '以中性温和语气回顾本周节奏，不给打分。',
    recommended_subjects: ['self'],
    category: 'self_reflection',
  },
  {
    id: 'family_open_window',
    title: '家人长期窗口',
    description: '跟踪一位家人长期状态，主体锚定该家人。',
    default_time_scope: 'open_ended',
    default_instructions: '关注该家人对应的关系变化与提醒，避免任何运势分数。',
    recommended_subjects: ['person'],
    category: 'relation',
  },
  {
    id: 'decision_horizon',
    title: '决策时窗',
    description: '围绕一个具体决定，圈出未来观察期。',
    default_time_scope: 'bounded',
    default_instructions: '围绕决定圈出 5-10 天观察期，输出方向，不给确定结果。',
    recommended_subjects: ['self'],
    category: 'decision_support',
  },
];

function assertCatalogIntegrity(templates: readonly ViewTemplate[]): void {
  const ids = new Set<string>();
  for (const template of templates) {
    if (!VIEW_TEMPLATE_ID_PATTERN.test(template.id)) {
      throw new Error(`ShiJingCatalog: template id "${template.id}" violates VIEW_TEMPLATE_ID_PATTERN`);
    }
    if (ids.has(template.id)) {
      throw new Error(`ShiJingCatalog: duplicate template id "${template.id}"`);
    }
    if (!TIME_SCOPES.includes(template.default_time_scope)) {
      throw new Error(
        `ShiJingCatalog: template "${template.id}" default_time_scope "${template.default_time_scope}" not in TIME_SCOPES`,
      );
    }
    if (!VIEW_TEMPLATE_CATEGORIES.includes(template.category)) {
      throw new Error(
        `ShiJingCatalog: template "${template.id}" category "${template.category}" not in VIEW_TEMPLATE_CATEGORIES`,
      );
    }
    for (const pattern of template.recommended_subjects) {
      if (pattern !== 'self' && pattern !== 'person') {
        throw new Error(
          `ShiJingCatalog: template "${template.id}" recommended_subjects contains "${pattern}" (must be "self" or "person")`,
        );
      }
    }
    ids.add(template.id);
  }
}

assertCatalogIntegrity(SEED_TEMPLATES);

const FROZEN_CATALOG: ShiJingCatalog = Object.freeze({
  view_templates: Object.freeze([...SEED_TEMPLATES]),
});

export function loadShijingCatalog(): ShiJingCatalog {
  return FROZEN_CATALOG;
}
