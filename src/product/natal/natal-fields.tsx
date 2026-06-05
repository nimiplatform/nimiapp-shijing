// Shared birth-data field grid for a NatalInputs draft. Rendered by both the
// self editor and the person editor so the two stay in lockstep — a Person is
// a first-class astrology subject and needs its own complete natal inputs
// (SJG-PROD-06), not a copy of the self subject's chart.
//
// Layout: the everyday fields (出生日期类型 / 性别 / 出生日期 / 出生地 /
// 出生时间 + 「我不知道确切时间」) sit in the parent two-column grid. We pair
// 出生时间 with the unknown-time checkbox because the birth date is always
// known — the only real uncertainty is the clock time, so precision collapses
// to a binary: time entered → `exact`, "I don't know" → `rough_day` (hour
// pillar omitted). The precise latitude / longitude / IANA time-zone live in a
// collapsed「地点与时区校准」disclosure — the place autocomplete already fills
// them, so they only need touching for an unlisted place, a cross-timezone
// birth, or DST.
//
// The owning entity's free-text `notes` is rendered by the parent.

import { useState } from 'react';
import { DatePicker } from '@nimiplatform/kit/ui';
import {
  CALCULATION_SEXES,
  CALENDAR_SYSTEMS,
} from '../../domain/person.ts';
import { SjpSelect } from '../components/sjp-select.tsx';
import {
  LunarBirthDatePicker,
  type LunarBirthDateChange,
} from './lunar-birth-date-picker.tsx';
import { BirthTimePicker } from './birth-time-picker.tsx';
import { PlaceAutocomplete } from './place-autocomplete.tsx';
import { isUnknownClockTimeChecked } from './birth-time-precision.ts';
import { fullPlaceName } from './gazetteer.ts';
import { isDaylightSavingActive } from '../astrology/local-wall-clock.ts';
import {
  CALCULATION_SEX_LABELS,
  CALENDAR_SYSTEM_LABELS,
} from '../i18n/copy.ts';
import type { SelfNatalDraft } from '../self/self-editor-state.ts';

export interface NatalFieldsProps {
  readonly draft: SelfNatalDraft;
  readonly onChange: <K extends keyof SelfNatalDraft>(key: K, value: SelfNatalDraft[K]) => void;
  /** Prefix for input ids/labels so two NatalFields on one page stay unique. */
  readonly idPrefix: string;
}

export function NatalFields({ draft, onChange, idPrefix }: NatalFieldsProps) {
  const id = (suffix: string) => `${idPrefix}-${suffix}`;
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  function applyLunarDate(next: LunarBirthDateChange) {
    onChange('local_date_text', next.local_date_text);
    onChange('lunar_year', next.lunar_year);
    onChange('lunar_month', next.lunar_month);
    onChange('lunar_day', next.lunar_day);
    onChange('lunar_is_leap_month', next.lunar_is_leap_month);
  }
  function clearLunarDate() {
    onChange('local_date_text', '');
    onChange('lunar_year', '');
    onChange('lunar_month', '');
    onChange('lunar_day', '');
    onChange('lunar_is_leap_month', 'unanswered');
  }
  // Only meaningful for civil (gregorian) clock times; a lunar date string is
  // not a wall-clock instant in the zone.
  const dstActive =
    draft.calendar_system === 'gregorian' &&
    isDaylightSavingActive(draft.local_date_text, draft.local_time_text, draft.iana_time_zone);
  // This checkbox represents the explicit "date known, clock time unknown"
  // choice only. Broader precision states must not auto-check it.
  const timeUnknown = isUnknownClockTimeChecked(draft.birth_precision);
  return (
    <>
      <div className="sjp-field">
        <label className="sjp-label" htmlFor={id('calendar')}>出生日期类型</label>
        <SjpSelect
          id={id('calendar')}
          value={draft.calendar_system}
          onValueChange={(v) => onChange('calendar_system', v as SelfNatalDraft['calendar_system'])}
          options={CALENDAR_SYSTEMS.map((cs) => ({ value: cs, label: CALENDAR_SYSTEM_LABELS[cs] }))}
        />
      </div>

      <div className="sjp-field">
        <label className="sjp-label" htmlFor={id('sex')}>性别</label>
        <SjpSelect
          id={id('sex')}
          value={draft.calculation_sex}
          onValueChange={(v) => onChange('calculation_sex', v as SelfNatalDraft['calculation_sex'])}
          options={CALCULATION_SEXES.map((s) => ({ value: s, label: CALCULATION_SEX_LABELS[s] }))}
        />
      </div>

      <div className="sjp-field">
        <label className="sjp-label">出生日期</label>
        {draft.calendar_system === 'gregorian' ? (
          // 公历:nimi kit 日期面板的本仓库包装,年份轮从 1900 起。
          <div className="sjp-datepicker">
            <DatePicker
              value={draft.local_date_text}
              onChange={(next) => onChange('local_date_text', next)}
            />
          </div>
        ) : (
          // 农历:保留文本输入(农历日期不是公历日历项)。
          <div className="sjp-datepicker">
            <LunarBirthDatePicker
              id={id('date')}
              localDateText={draft.local_date_text}
              lunarYear={draft.lunar_year}
              lunarMonth={draft.lunar_month}
              lunarDay={draft.lunar_day}
              lunarIsLeapMonth={draft.lunar_is_leap_month}
              onChange={applyLunarDate}
              onClear={clearLunarDate}
            />
          </div>
        )}
      </div>

      <div className="sjp-field">
        <label className="sjp-label" htmlFor={id('place')}>出生地</label>
        <PlaceAutocomplete
          id={id('place')}
          placeholder="输入城市或区县名，如 广州 / 昆山"
          value={draft.place_text}
          onTextChange={(text) => onChange('place_text', text)}
          onSelect={(entry) => {
            const display = fullPlaceName(entry);
            onChange('place_text', display);
            onChange('place_name', display);
            onChange('latitude', String(entry.lat));
            onChange('longitude', String(entry.lng));
            onChange('iana_time_zone', entry.tz);
          }}
        />
      </div>

      <div className="sjp-field">
        <label className="sjp-label" htmlFor={id('time')}>出生时间</label>
        <div
          className="sjp-datepicker"
          style={timeUnknown ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
          aria-disabled={timeUnknown}
        >
          <BirthTimePicker
            value={timeUnknown ? '' : draft.local_time_text}
            onChange={(next) => {
              onChange('local_time_text', next);
              if (next.trim().length > 0 && draft.birth_precision !== 'exact') {
                onChange('birth_precision', 'exact');
              }
            }}
          />
        </div>
      </div>

      <div className="sjp-field">
        {/* Spacer label keeps the checkbox pill baseline-aligned with the
            出生时间 input in the two-column grid. */}
        <label className="sjp-label" aria-hidden="true">&nbsp;</label>
        <label className="sjp-inline-check">
          <input
            type="checkbox"
            checked={timeUnknown}
            onChange={(e) => {
              if (e.currentTarget.checked) {
                onChange('birth_precision', 'rough_day');
                onChange('local_time_text', '');
              } else {
                onChange('birth_precision', 'exact');
              }
            }}
          />
          我不知道确切时间
        </label>
      </div>

      {dstActive ? (
        <p className="sjp-note sjp-note--warn">
          提示：该出生时间处于<strong>夏令时</strong>期间（中国曾在 1986–1991 年实行夏令时）。
          请确认这里填的是当时<strong>钟表上显示的时间</strong>——系统会按夏令时自动 +1 小时换算时区，你无需手动加减。
        </p>
      ) : null}

      {/* Collapsed precise-coordinate calibration. The place autocomplete above
          fills these automatically; only unlisted places / cross-timezone /
          DST cases need a manual tweak. */}
      <div className="sjp-field sjp-field--full">
        <div className="sjp-collapse" data-open={calibrationOpen}>
          <button
            type="button"
            className="sjp-collapse__summary"
            aria-expanded={calibrationOpen}
            aria-controls={id('calibration')}
            onClick={() => setCalibrationOpen((v) => !v)}
          >
            <span>地点与时区校准 <span className="sjp-opt">· 可选</span></span>
            <svg
              className="sjp-collapse__chevron"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {calibrationOpen ? (
            <div className="sjp-collapse__body" id={id('calibration')}>
              <p className="sjp-note">
                系统会根据「出生地」自动匹配经纬度和时区，一般无需改动。只有当匹配不准、出生地跨时区，或涉及夏令时，才需要在这里手动调整。
              </p>
              <div className="sjp-grid sjp-grid--triple">
                <div className="sjp-field">
                  <label className="sjp-label" htmlFor={id('lat')}>纬度</label>
                  <input
                    id={id('lat')}
                    type="text"
                    className="sjp-input sjp-input--mono"
                    placeholder="例如 23.13"
                    value={draft.latitude}
                    onChange={(e) => onChange('latitude', e.currentTarget.value)}
                  />
                </div>
                <div className="sjp-field">
                  <label className="sjp-label" htmlFor={id('lng')}>经度</label>
                  <input
                    id={id('lng')}
                    type="text"
                    className="sjp-input sjp-input--mono"
                    placeholder="例如 113.26"
                    value={draft.longitude}
                    onChange={(e) => onChange('longitude', e.currentTarget.value)}
                  />
                </div>
                <div className="sjp-field">
                  <label className="sjp-label" htmlFor={id('tz')}>IANA 时区</label>
                  <input
                    id={id('tz')}
                    type="text"
                    className="sjp-input sjp-input--mono"
                    placeholder="例如 Asia/Shanghai"
                    value={draft.iana_time_zone}
                    onChange={(e) => onChange('iana_time_zone', e.currentTarget.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
