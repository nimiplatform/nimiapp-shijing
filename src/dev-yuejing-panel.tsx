// TEMP visual harness for the redesigned 月镜 30日行动指南 panel.
// Renders YueJingMonthPanel with synthetic data through the real CSS so the
// layout can be screenshotted without the Tauri runtime. Delete after review.

import { createRoot } from 'react-dom/client';
import { NimiThemeProvider, TooltipProvider } from '@nimiplatform/kit/ui';
import type { ConcernTag } from './domain/concern-tag.ts';
import type { YueJingCell, TendencyClass } from './domain/mirror-output.ts';
import { YueJingMonthPanel } from './product/tabs/yuejing-tab.tsx';
import './styles.css';

const START = '2024-07-05';

function datesFrom(start: string, n: number): string[] {
  const base = new Date(`${start}T00:00:00Z`).getTime();
  return Array.from({ length: n }, (_, i) =>
    new Date(base + i * 86_400_000).toISOString().slice(0, 10),
  );
}

const CONCERNS: ConcernTag[] = [
  { id: 'c-career', label: '#事业', status: 'active', sort_order: 0, parsed_topics: ['career'], mention_refs: [], prompt_text: '工作 · 项目 · 产出', created_at: '2024-07-05T00:00:00Z', updated_at: '2024-07-05T00:00:00Z' },
  { id: 'c-body', label: '#身体', status: 'active', sort_order: 1, parsed_topics: ['body'], mention_refs: [], prompt_text: '状态 · 节律 · 休整', created_at: '2024-07-05T00:00:00Z', updated_at: '2024-07-05T00:00:00Z' },
];

const DAY_TENDENCIES: Record<string, TendencyClass> = {
  '2024-07-05': 'watch',
  '2024-07-06': 'turning',
  '2024-07-07': 'turning',
  '2024-07-08': 'blocked',
  '2024-07-09': 'blocked',
  '2024-07-10': 'steady',
  '2024-07-11': 'supportive',
  '2024-07-12': 'supportive',
  '2024-07-13': 'supportive',
  '2024-07-14': 'supportive',
  '2024-07-15': 'watch',
  '2024-07-16': 'watch',
  '2024-07-17': 'steady',
  '2024-07-18': 'turning',
  '2024-07-19': 'turning',
  '2024-07-20': 'steady',
  '2024-07-21': 'supportive',
  '2024-07-22': 'supportive',
  '2024-07-23': 'supportive',
  '2024-07-24': 'supportive',
  '2024-07-25': 'watch',
  '2024-07-26': 'watch',
  '2024-07-27': 'blocked',
  '2024-07-28': 'blocked',
  '2024-07-29': 'steady',
  '2024-07-30': 'turning',
  '2024-07-31': 'turning',
  '2024-08-01': 'supportive',
  '2024-08-02': 'supportive',
  '2024-08-03': 'supportive',
};

const dates = datesFrom(START, 30);
const cellsByDate = new Map<string, readonly YueJingCell[]>();
dates.forEach((date) => {
  const cells: YueJingCell[] = CONCERNS.map((tag) => {
    const tendency = DAY_TENDENCIES[date] ?? 'steady';
    return { date, concern_tag_ref: tag.id, tendency_class: tendency, summary: '' };
  });
  cellsByDate.set(date, cells);
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <NimiThemeProvider accentPack="nimi-accent" defaultScheme="light">
    <TooltipProvider>
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
      </div>
    </TooltipProvider>
  </NimiThemeProvider>,
);
