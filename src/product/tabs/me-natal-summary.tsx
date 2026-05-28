// Read-only summary card for self_subject natal inputs — the
// page's primary content surface ("本人资料").
//
// Layout:
//   1. Header: icon + title + right-aligned "编辑" link.
//   2. 4 core rows the user actually cares about (date+time / place
//      / calculation sex / resolved IANA timezone). Birth-precision
//      is intentionally NOT a row here — it gets its own gentle
//      callout below so the warning has somewhere to live without
//      polluting the resting state.
//   3. Precision-confirmation callout (only when
//      birth_precision === 'unknown'): amber tone, descriptive
//      copy, single "去确认" button on the right.
//   4. "排盘技术详情" disclosure — UTC, timezone identifier,
//      calendar, coordinates. Collapsed by default so the resting
//      page reads as a profile, not a debug panel.
//
// All mutations are routed through the NatalInputsForm overlay;
// the card never edits state itself.

import { useMemo } from 'react';
import { Surface } from '@nimiplatform/kit/ui';

import { useShijingStore } from '../state/shijing-store.tsx';
import { enumLabel } from '../i18n/enum-label.ts';
import { isScaffoldNatalInputs } from '../subjects/natal-readiness.ts';
import { MeIcon } from './me-icons.tsx';
import { summarizeNatalCompleteness } from './me-readiness-summary.ts';

export interface MeNatalSummaryProps {
  readonly onOpenNatalEditor: () => void;
}

function combinedBirthDateTime(
  date: string | undefined,
  time: string | undefined,
): string {
  const d = (date ?? '').trim();
  const t = (time ?? '').trim();
  if (!d && !t) return '未填写';
  if (d && t) return `${d} ${t}`;
  return d || t;
}

function placeFor(place: string | undefined, fallback: string | undefined): string {
  return place || fallback || '未填写';
}

// `birth_datetime_utc` is always serialized as ISO 8601
// (`1987-12-05T13:30:00.000Z`). That is correct for storage / API but
// reads as machine output in a "排盘技术详情" panel. Render it as
// "1987-12-05 13:30 UTC" so the user can compare it to the local time
// they entered at a glance. Seconds and milliseconds are dropped
// because `birth_precision` never carries sub-minute meaning.
function formatUtcForDisplay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${y}-${mo}-${da} ${hh}:${mm} UTC`;
}

// Coordinates: render with N/S + E/W suffixes and two decimals, which
// is enough granularity to identify a city without exposing the raw
// signed-decimal pair that geocoders produce.
function formatCoordinates(lat: number, lon: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '未识别';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${latDir} · ${Math.abs(lon).toFixed(2)}°${lonDir}`;
}

export function MeNatalSummary(props: MeNatalSummaryProps) {
  const { state } = useShijingStore();
  const inputs = state.snapshot.self_subject.natal_inputs;
  const summary = useMemo(() => summarizeNatalCompleteness(inputs), [inputs]);
  const isScaffold = useMemo(() => isScaffoldNatalInputs(inputs), [inputs]);

  const raw = inputs.raw_birth_input;
  const loc = inputs.birth_location;

  const showPrecisionCallout = !isScaffold && inputs.birth_precision === 'unknown';
  const tzDisplay = summary.time_zone_resolved
    ? loc.iana_time_zone
    : '尚未识别';

  return (
    <Surface
      as="section"
      tone="card"
      material="solid"
      padding="none"
      elevation="base"
      className="shijing-me-card shijing-me-card--natal"
      aria-label="本人资料"
    >
      <header className="shijing-me-card__head">
        <span className="shijing-me-card__icon" aria-hidden="true">
          <MeIcon name="user" size={20} />
        </span>
        <h3 className="shijing-me-card__title">本人资料</h3>
        <button
          type="button"
          className="shijing-me-card__head-action"
          onClick={props.onOpenNatalEditor}
        >
          <span>编辑</span>
          <MeIcon name="chevron-right" size={14} />
        </button>
      </header>

      {isScaffold ? (
        <p className="shijing-me-card__empty">
          还没有填写出生信息。点击右上角「编辑」开始填写。
        </p>
      ) : (
        <dl className="shijing-me-natal-rows">
          <div className="shijing-me-natal-rows__item">
            <dt>出生时间</dt>
            <dd>{combinedBirthDateTime(raw.local_date_text, raw.local_time_text)}</dd>
          </div>
          <div className="shijing-me-natal-rows__item">
            <dt>出生地点</dt>
            <dd>{placeFor(loc.place_name, raw.place_text)}</dd>
          </div>
          <div className="shijing-me-natal-rows__item">
            <dt>排盘性别</dt>
            <dd
              className={
                inputs.calculation_sex === 'unspecified'
                  ? 'shijing-me-card__warn'
                  : undefined
              }
            >
              {enumLabel('calculation_sex', inputs.calculation_sex)}
            </dd>
          </div>
          <div className="shijing-me-natal-rows__item">
            <dt>系统识别时区</dt>
            <dd
              className={
                summary.time_zone_resolved
                  ? undefined
                  : 'shijing-me-card__warn'
              }
            >
              {tzDisplay}
            </dd>
          </div>
        </dl>
      )}

      {showPrecisionCallout ? (
        <aside
          className="shijing-me-precision-callout"
          role="note"
          aria-label="出生时间准确度待确认"
        >
          <span className="shijing-me-precision-callout__icon" aria-hidden="true">
            <MeIcon name="alert" size={18} />
          </span>
          <div className="shijing-me-precision-callout__body">
            <p className="shijing-me-precision-callout__title">
              出生时间准确度待确认
            </p>
            <p className="shijing-me-precision-callout__copy">
              如果出生时间只是大概时间，部分细节分析可能会有偏差。
            </p>
          </div>
          <button
            type="button"
            className="shijing-me-precision-callout__action"
            onClick={props.onOpenNatalEditor}
          >
            去确认
          </button>
        </aside>
      ) : null}

      <details className="shijing-me-card__details shijing-me-card__details--quiet">
        <summary>
          <MeIcon name="chevron-right" size={14} />
          <span>排盘技术详情</span>
        </summary>
        <dl className="shijing-me-card__detail-grid">
          <div>
            <dt>标准化 UTC</dt>
            <dd>{formatUtcForDisplay(inputs.birth_datetime_utc)}</dd>
          </div>
          <div>
            <dt>时区标识</dt>
            <dd>{loc.iana_time_zone || '未识别'}</dd>
          </div>
          <div>
            <dt>历法</dt>
            <dd>{enumLabel('calendar_system', inputs.calendar_system)}</dd>
          </div>
          <div>
            <dt>地理坐标</dt>
            <dd>{formatCoordinates(loc.latitude, loc.longitude)}</dd>
          </div>
        </dl>
      </details>
    </Surface>
  );
}
