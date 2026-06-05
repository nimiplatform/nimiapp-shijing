// Shared concern → life-domain classification, used by every engine to map a
// ConcernTag onto a life area (which each engine then renders in its own terms:
// 八字 十神, 紫微 宫位, ...). Keyword-based for v1.

import type { ConcernTag } from '../../../domain/concern-tag.ts';

export type ConcernDomain = 'love' | 'career' | 'health' | 'wealth' | 'general';

function textHasAny(value: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => value.includes(token));
}

export function concernDomainFor(tag: ConcernTag): ConcernDomain {
  const haystack = [tag.id, tag.label, tag.prompt_text, ...tag.parsed_topics].join(' ').toLowerCase();
  if (textHasAny(haystack, ['love', 'relationship', 'romance', 'partner', '姻缘', '婚恋', '感情', '关系'])) return 'love';
  if (textHasAny(haystack, ['career', 'work', 'job', 'office', 'profession', '事业', '工作', '职场', '职业'])) return 'career';
  if (textHasAny(haystack, ['health', 'body', 'sleep', 'wellness', '健康', '身体', '睡眠', '精力'])) return 'health';
  if (textHasAny(haystack, ['wealth', 'money', 'finance', 'income', '财富', '财务', '收入', '金钱'])) return 'wealth';
  return 'general';
}
