// Today tab — Hero conclusion card. Renders the conclusion eyebrow, the
// serif headline, keyword chips, the narrative paragraph, the
// "宜推进 / 宜沟通 / 稳节奏" tendency chips, the confidence line, and
// the bottom reminder callout from a TodayHeroContent payload.
//
// The Hero also hosts these interactive / informational affordances tied
// to the conclusion:
//   - a small icon-only "refresh today" button pinned to the top-right
//   - a reminder slot at the bottom that has TWO modes:
//       * when there are natal-input gaps for the observation target,
//         the slot becomes a calm "资料完整度" info card — info icon,
//         a title naming what is incomplete, one body line describing
//         what補充 will unlock, and a "完善资料 →" text link
//       * otherwise it renders the existing heart-icon reminder that
//         surfaces a Reading caveat / data-gap line
//   - a "今日节奏" three-column morning / afternoon / evening strip
//   - a "今日参考的事件" footer that lists the events the user has
//     added as real-world context for the conclusion
// All these are intentionally part of the Hero so the cause-and-effect
// link (inputs → conclusion → pacing → action) is visible in one card.

import {
  HeartIcon,
  InfoIcon,
  MoonIcon,
  RefreshIcon,
  SunIcon,
  SunriseIcon,
} from './today-icons.tsx';
import type {
  TodayHeroContent,
  TodayTimeSlotItem,
} from './today-derive.ts';
import type { NatalGap } from '../subjects/natal-readiness.ts';
import { TodayHeroEvents } from './today-hero-events.tsx';

export interface TodayHeroProps {
  readonly content: TodayHeroContent;
  readonly refreshDisabled: boolean;
  readonly refreshAriaLabel: string;
  readonly onRefresh: () => void;
  readonly timeSlots: readonly TodayTimeSlotItem[];
  readonly gaps: readonly NatalGap[];
  readonly onCompleteBirthInfo: () => void;
}

function TimeSlotIcon({ slot }: { slot: TodayTimeSlotItem['slot'] }) {
  switch (slot) {
    case 'morning':
      return <SunriseIcon />;
    case 'afternoon':
      return <SunIcon />;
    case 'evening':
      return <MoonIcon />;
  }
}

function pickPrimaryGap(gaps: readonly NatalGap[]): NatalGap | undefined {
  return gaps.find((g) => g.severity === 'blocker') ?? gaps[0];
}

// Per-gap copy. The prior wording ("时柱与大运只能粗算" / "缺出生时区，
// 时间换算会偏") read like a system warning — which made the rest of
// the Hero feel uncertain. We reframe it as a *completeness signal*: a
// title that names what is still incomplete, and one calm body line
// that describes what補充 will unlock. No language suggests the current
// reading is wrong; only that补充 can make it更细.
interface GapInfo {
  readonly title: string;
  readonly body: string;
}

function gapInfo(gap: NatalGap): GapInfo {
  const isBlocker = gap.severity === 'blocker';
  switch (gap.key) {
    case 'birth_date':
      return {
        title: '资料完整度：出生日期待补充',
        body: isBlocker
          ? '缺出生日期，补充后即可生成今日。'
          : '出生日期还需要再确认，补充后判断会更稳。',
      };
    case 'birth_time_precision':
      return {
        title: '资料完整度：出生时间待补充',
        body: '补充后可细化时柱、大运与时段建议。',
      };
    case 'birth_location':
      return {
        title: '资料完整度：出生地点待补充',
        body: isBlocker
          ? '缺出生地点，补充后即可生成今日。'
          : '出生地点是默认占位，补充后真太阳时与时区会更准确。',
      };
    case 'time_zone':
      return {
        title: '资料完整度：出生时区待补充',
        body: '缺出生时区，补充后时间换算会更准确。',
      };
    case 'calculation_sex':
      return {
        title: '资料完整度：性别待补充',
        body: '未填性别，补充后可推算大运起运方向。',
      };
    default: {
      const exhaustive: never = gap.key;
      void exhaustive;
      return { title: gap.label, body: gap.help };
    }
  }
}

interface HeroReminderProps {
  readonly content: TodayHeroContent;
  readonly gaps: readonly NatalGap[];
  readonly onCompleteBirthInfo: () => void;
}

function HeroReminder(props: HeroReminderProps) {
  const primaryGap = pickPrimaryGap(props.gaps);
  if (primaryGap) {
    const info = gapInfo(primaryGap);
    // role="status" for both severities — the new framing is "资料
    // 完整度提示", not an error. We never want assistive tech to
    // announce this as alert.
    return (
      <aside
        className="shijing-today-hero__reminder shijing-today-hero__reminder--info"
        role="status"
      >
        <span className="shijing-today-hero__reminder-icon" aria-hidden>
          <InfoIcon />
        </span>
        <div className="shijing-today-hero__reminder-copy">
          <p className="shijing-today-hero__reminder-title">{info.title}</p>
          <p className="shijing-today-hero__reminder-body">{info.body}</p>
        </div>
        <button
          type="button"
          className="shijing-today-hero__reminder-link"
          onClick={props.onCompleteBirthInfo}
        >
          完善资料
          <span className="shijing-today-hero__reminder-link-arrow" aria-hidden>→</span>
        </button>
      </aside>
    );
  }
  return (
    <div className="shijing-today-hero__reminder">
      <HeartIcon />
      <p>{props.content.reminder}</p>
    </div>
  );
}

export function TodayHero(props: TodayHeroProps) {
  const { content, timeSlots } = props;
  return (
    <article
      className={`shijing-today-hero${content.hasReading ? '' : ' shijing-today-hero--empty'}`}
      aria-labelledby="shijing-today-hero-headline"
    >
      <button
        type="button"
        className="shijing-today-hero__refresh"
        onClick={props.onRefresh}
        disabled={props.refreshDisabled}
        aria-label={props.refreshAriaLabel}
        title={props.refreshAriaLabel}
      >
        <RefreshIcon />
      </button>
      <div className="shijing-today-hero__eyebrow" aria-hidden>
        <span className="shijing-today-hero__eyebrow-dash" />
        <span>{content.eyebrow}</span>
        <span className="shijing-today-hero__eyebrow-dash" />
      </div>
      <h3 id="shijing-today-hero-headline" className="shijing-today-hero__headline">
        {content.headline}
      </h3>
      <div className="shijing-today-hero__keywords" aria-label="今日关键词">
        <span className="shijing-today-hero__keywords-label">关键词</span>
        <span className="shijing-today-hero__keywords-list">
          {content.keywords.map((kw, idx) => (
            <span key={`${idx}-${kw}`} className="shijing-today-hero__keyword">
              {kw}
            </span>
          ))}
        </span>
      </div>
      <p className="shijing-today-hero__body">{content.description}</p>
      <div className="shijing-today-hero__leanings" aria-label="今日倾向">
        {content.leanings.map((leaning, idx) => (
          <span key={`${idx}-${leaning}`} className="shijing-today-hero__leaning">
            {leaning}
          </span>
        ))}
      </div>
      <div className="shijing-today-hero__confidence">
        <span className="shijing-today-hero__confidence-label">可信度</span>
        <span className="shijing-today-hero__confidence-value">{content.confidence_label}</span>
        <span className="shijing-today-hero__confidence-note">{content.confidence_note}</span>
      </div>
      <HeroReminder
        content={content}
        gaps={props.gaps}
        onCompleteBirthInfo={props.onCompleteBirthInfo}
      />
      {timeSlots.length > 0 ? (
        <section className="shijing-today-hero__time-slots" aria-label="今日节奏">
          <header className="shijing-today-hero__time-slots-head">
            <h4 className="shijing-today-hero__time-slots-title">今日节奏</h4>
          </header>
          <ul className="shijing-today-hero__time-slots-row">
            {timeSlots.map((slot) => (
              <li
                key={slot.slot}
                className={`shijing-today-hero__time-slot shijing-today-hero__time-slot--${slot.slot}`}
              >
                <div className="shijing-today-hero__time-slot-head">
                  <span className="shijing-today-hero__time-slot-icon" aria-hidden>
                    <TimeSlotIcon slot={slot.slot} />
                  </span>
                  <span className="shijing-today-hero__time-slot-label">{slot.label}</span>
                  <span className="shijing-today-hero__time-slot-range">{slot.time_range}</span>
                </div>
                <p className="shijing-today-hero__time-slot-body">{slot.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <TodayHeroEvents />
    </article>
  );
}
