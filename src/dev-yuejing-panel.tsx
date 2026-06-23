// TEMP visual harness for the redesigned 月镜 30 日解读 panel.
// Renders YueJingMonthPanel with synthetic data through the real CSS so the
// layout can be screenshotted without the Tauri runtime. Delete after review.

import { createRoot } from 'react-dom/client';
import type { ConcernTag } from './domain/concern-tag.ts';
import type { YueJingCell, TendencyClass } from './domain/mirror-output.ts';
import { YueJingMonthPanel } from './product/tabs/yuejing-tab.tsx';
import './styles.css';

const START = '2026-06-22';

function datesFrom(start: string, n: number): string[] {
  const base = new Date(`${start}T00:00:00Z`).getTime();
  return Array.from({ length: n }, (_, i) =>
    new Date(base + i * 86_400_000).toISOString().slice(0, 10),
  );
}

const CONCERNS: ConcernTag[] = [
  { id: 'c-family', label: '#家人', status: 'active', sort_order: 0, parsed_topics: ['family'], mention_refs: [], prompt_text: '父母 · 伴侣 · 孩子', created_at: '2026-06-22T00:00:00Z', updated_at: '2026-06-22T00:00:00Z' },
  { id: 'c-career', label: '#事业', status: 'active', sort_order: 1, parsed_topics: ['career'], mention_refs: [], prompt_text: '工作 · 项目 · 产出', created_at: '2026-06-22T00:00:00Z', updated_at: '2026-06-22T00:00:00Z' },
  { id: 'c-love', label: '#姻缘', status: 'active', sort_order: 2, parsed_topics: ['love'], mention_refs: [], prompt_text: '感情 · 关系 · 家庭', created_at: '2026-06-22T00:00:00Z', updated_at: '2026-06-22T00:00:00Z' },
];

// Per-concern tendency patterns (no `blocked`, to match the mockup's
// four-category rhythm strip).
const PATTERNS: Record<string, readonly TendencyClass[]> = {
  'c-family': ['supportive', 'steady', 'watch', 'steady', 'supportive', 'steady', 'turning'],
  'c-career': ['steady', 'supportive', 'steady', 'steady', 'supportive', 'steady', 'watch'],
  'c-love': ['steady', 'steady', 'supportive', 'steady', 'watch', 'supportive', 'steady'],
};

const dates = datesFrom(START, 30);
const cellsByDate = new Map<string, readonly YueJingCell[]>();
dates.forEach((date, dayIdx) => {
  const cells: YueJingCell[] = CONCERNS.map((tag) => {
    const pattern = PATTERNS[tag.id] ?? ['steady'];
    const tendency = pattern[(dayIdx + tag.sort_order) % pattern.length] as TendencyClass;
    return { date, concern_tag_ref: tag.id, tendency_class: tendency, summary: '' };
  });
  cellsByDate.set(date, cells);
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <div className="shijing-shell" data-active-tab="yuejing">
    <div className="shijing-shell__main">
      <section className="shijing-tab shijing-yuejing" data-mirror-kind="yuejing">
        <YueJingMonthPanel
          dates={dates}
          cellsByDate={cellsByDate}
          activeTags={CONCERNS}
          eventMemories={[]}
          planItems={[]}
          onClose={() => {}}
        />
      </section>
    </div>
  </div>,
);
