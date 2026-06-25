// TEMP visual harness for the restyled NianJing year-overview (path card,
// year selector, selected-year detail, and basis). Drives the real
// buildNianJingYearModules pipeline with synthetic mirror output so the
// layout can be screenshotted without the Tauri runtime.

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ConcernTag } from './domain/concern-tag.ts';
import type {
  NianJingInflectionPoint,
  NianJingMirrorOutput,
  NianJingNature,
  NianJingPhaseBand,
} from './domain/mirror-output.ts';
import { buildNianJingYearModules } from './product/tabs/nianjing/nianjing-year-modules.ts';
import { NianJingYearOverview } from './product/tabs/nianjing/nianjing-year-overview.tsx';
import './styles.css';

const TODAY = '2026-06-25';

function tag(id: string, label: string, order: number): ConcernTag {
  return {
    id,
    label,
    status: 'active',
    sort_order: order,
    parsed_topics: [],
    mention_refs: [],
    prompt_text: '',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

const CONCERNS: ConcernTag[] = [
  tag('c-love', '#relationship', 0),
  tag('c-career', '#career', 1),
];

const LOVE: NianJingNature[] = [
  'supportive',
  'supportive',
  'steady',
  'turning',
  'supportive',
  'watch',
  'steady',
  'supportive',
  'watch',
  'steady',
  'supportive',
];

const CAREER: NianJingNature[] = [
  'supportive',
  'supportive',
  'supportive',
  'steady',
  'watch',
  'turning',
  'watch',
  'blocked',
  'steady',
  'supportive',
  'supportive',
];

const SUMMARY: Record<NianJingNature, string> = {
  supportive: 'Long-horizon support opens gradually; resources gather and favor deliberate planning.',
  steady: 'The window asks for steady operations, durable roots, and compounding effort.',
  watch: 'The signal is mixed; keep experiments small and preserve optionality.',
  turning: 'A prior stable pattern is loosening; decisions in this window shape the next phase.',
  blocked: 'Progress is effortful; reduce loss, repair foundations, and wait for the pattern to loosen.',
};

function bandsFor(concernId: string, natures: NianJingNature[]): NianJingPhaseBand[] {
  return natures.map((nature, i) => {
    const year = 2026 + i;
    return {
      concern_tag_ref: concernId,
      start_date: `${year}-01-01`,
      end_date: `${year}-12-31`,
      nature,
      driver_refs: ['annual stem activates useful element', 'DaYun five-phase shift'],
      summary: SUMMARY[nature],
    };
  });
}

const INFLECTIONS: NianJingInflectionPoint[] = [
  {
    concern_tag_ref: 'c-love',
    date: '2026-03-12',
    kind: 'annual_transition',
    driver_refs: [],
    summary: 'relationship field opens',
  },
  {
    concern_tag_ref: 'c-love',
    date: '2026-09-08',
    kind: 'monthly_transition',
    driver_refs: [],
    summary: 'relationship temperature rises',
  },
  {
    concern_tag_ref: 'c-career',
    date: '2026-05-20',
    kind: 'dayun_boundary',
    driver_refs: [],
    summary: 'support arrives',
  },
  {
    concern_tag_ref: 'c-career',
    date: '2026-11-15',
    kind: 'marker_cluster',
    driver_refs: [],
    summary: 'year-end adjustment',
  },
  {
    concern_tag_ref: 'c-career',
    date: '2031-05-04',
    kind: 'dayun_boundary',
    driver_refs: [],
    summary: 'platform transition',
  },
];

const OUTPUT: NianJingMirrorOutput = {
  mirror_kind: 'nianjing',
  summary: 'Ten-year horizon sample: the next cycle moves from holding to turning to deliberate action.',
  horizon: { start_date: '2026-01-01', end_date: '2036-12-31' },
  phase_bands: [...bandsFor('c-love', LOVE), ...bandsFor('c-career', CAREER)],
  inflection_points: INFLECTIONS,
  cited_event_memory_refs: [],
  cited_plan_item_refs: [],
  citations: [],
};

const MODULES = buildNianJingYearModules({
  output: OUTPUT,
  active_concern_tags: CONCERNS,
  today: TODAY,
});

function Harness() {
  const [log, setLog] = useState('(select any phase or marker to inspect onSelectDetail)');
  return (
    <div className="shijing-shell" data-active-tab="nianjing">
      <div className="shijing-shell__main">
        <section className="shijing-tab shijing-nianjing" data-mirror-kind="nianjing">
          <NianJingYearOverview
            overviewModules={MODULES}
            detailModules={MODULES}
            overviewTags={CONCERNS}
            detailTags={CONCERNS}
            focusedTag={null}
            onSelectDetail={(sel) => setLog(`onSelectDetail -> ${sel.kind} / ${sel.tag.label}`)}
          />
          <p style={{ marginTop: 16, color: '#8c9088', fontSize: 12 }}>{log}</p>
        </section>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<Harness />);
