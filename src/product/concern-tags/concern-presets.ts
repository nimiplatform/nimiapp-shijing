// SJG-IA-06 — shared concern preset catalog.
//
// The preset templates (姻缘 / 事业 / 身体 / …) and their display
// subtitles are surfaced in three places — the 年镜 / 月镜「编辑关注」
// popovers and the Settings → 关注「关注的事」card — which must all
// offer the same set so a concern added from one surface reads the same
// everywhere. This module is the single source of truth; the tab popovers
// and the settings card all import from here instead of re-declaring it.

import type { ConcernTag } from '../../domain/concern-tag.ts';

// A preset stores a topic key (used as parsed_topics) and a short subtitle
// hinting at what the concern covers; both seed the display text and the
// prompt_text when the user activates the preset.
export interface ConcernPreset {
  readonly label: string;
  readonly topics: readonly string[];
  readonly subtitle: string;
}

export const CONCERN_PRESETS: readonly ConcernPreset[] = [
  { label: '#姻缘', topics: ['love'], subtitle: '感情 · 关系 · 家庭' },
  { label: '#事业', topics: ['career'], subtitle: '工作 · 项目 · 产出' },
  { label: '#身体', topics: ['body'], subtitle: '状态 · 节律 · 休整' },
  { label: '#财运', topics: ['wealth'], subtitle: '现金流 · 回报' },
  { label: '#学业', topics: ['study'], subtitle: '学习 · 考试 · 研究' },
  { label: '#家人', topics: ['family'], subtitle: '父母 · 伴侣 · 孩子' },
];

const CONCERN_SUBTITLE_BY_LABEL: Record<string, string> = Object.fromEntries(
  CONCERN_PRESETS.map((p) => [p.label, p.subtitle]),
);

// Subtitle shown beneath a concern's label: the preset hint when the tag
// matches a known preset, otherwise the user's own prompt text (falling
// back to a generic「自定义关注」marker).
export function concernSubtitleFor(tag: ConcernTag): string {
  return CONCERN_SUBTITLE_BY_LABEL[tag.label] ?? (tag.prompt_text || '自定义关注');
}

// Concern tags parsed from `#姻缘` / `#事业` style input carry the `#` in
// their display label. Compact, width-constrained rows (hero / lane labels
// / filter pills / management rows) drop the prefix for cleaner reading.
export function trimmedConcernLabel(tag: ConcernTag): string {
  return tag.label.replace(/^#/, '');
}
