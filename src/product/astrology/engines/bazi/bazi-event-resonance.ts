// SJG-ALGO-16 / 历史事件验证 — deterministic resonance overlay.
//
// Maps each historical EventMemory onto the frozen DaYun/流年 timeline of the
// natal chart: which 大运 the event fell in, that period's 用神 nature, and the
// event-year 流年 nature. Pure deterministic projection — it states where an
// event sits on the timeline; it never asserts the event "proves" the chart and
// never mutates the chart. The AI narrative consumes this as grounding; the
// numbers come only from here.

import type { EventMemory } from '../../../../domain/event-memory.ts';
import type { GanzhiPillar } from '../../../../domain/algorithm.ts';
import type { MingJingChart } from '../../../../domain/mingjing.ts';
import type { TendencyClass } from '../../../../domain/mirror-output.ts';
import type { PeriodFavor } from '../../../../domain/mingjing.ts';
import { transitPillarsForCivilDate } from './bazi-calendar.ts';
import { baziPeriodNature } from './bazi-tendency.ts';

export interface EventResonance {
  readonly event_memory_ref: string;
  readonly occurred_year: number;
  readonly dayun_pillar?: GanzhiPillar;
  readonly dayun_ten_god?: string;
  readonly dayun_nature: TendencyClass;
  readonly dayun_favor: PeriodFavor;
  readonly liunian_pillar: GanzhiPillar;
  readonly liunian_nature: TendencyClass;
  readonly liunian_favor: PeriodFavor;
}

function yearOf(iso: string): number | null {
  const m = /^(\d{4})/.exec(iso);
  return m ? Number(m[1]) : null;
}

export function computeEventResonance(
  chart: MingJingChart,
  events: readonly EventMemory[],
): EventResonance[] {
  const yong = chart.interpretation.yong_shen;
  const out: EventResonance[] = [];

  for (const event of events) {
    const occurredYear = yearOf(event.occurred_at);
    if (occurredYear === null) continue;

    const period = chart.dayun.periods.find(
      (p) => occurredYear >= p.start_year && occurredYear <= p.end_year,
    );
    // 流年 of the event year (mid-year avoids the 立春 boundary).
    const liunianPillar = transitPillarsForCivilDate(occurredYear, 6, 1).year;
    const liunian = baziPeriodNature(liunianPillar.stem, yong);

    out.push({
      event_memory_ref: event.id,
      occurred_year: occurredYear,
      ...(period ? { dayun_pillar: period.pillar, dayun_ten_god: period.stem_ten_god } : {}),
      dayun_nature: period ? period.nature : 'steady',
      dayun_favor: period ? period.favor : '平',
      liunian_pillar: liunianPillar,
      liunian_nature: liunian.nature,
      liunian_favor: liunian.favor,
    });
  }

  return out;
}
