// 本人资料卡 — pure derivation of the at-a-glance self summary.
//
// The 档案 page no longer shows an always-open form: it shows a calm summary
// card (核心资料 / 辅助信息 / 时镜标签) and only surfaces accuracy reminders
// when birth data is actually missing or uncertain. This file turns the stored
// self_subject.natal_inputs into that display shape; the editor itself lives in
// a drawer behind the「编辑」button.

import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import {
  getProductCopy,
  type ProductCopy,
} from '../i18n/copy.ts';
import { isScaffoldNatalInputs } from '../subjects/scaffold-natal-inputs.ts';

// One labelled cell in the core birth-info grid (性别 / 出生日期 / 出生时间).
export interface SelfProfileField {
  readonly label: string;
  readonly value: string;
  /** True when the value is a「未填写」placeholder — rendered muted. */
  readonly missing: boolean;
}

export interface SelfProfileSummary {
  /** Core birth-info cells: 性别 / 出生日期 / 出生时间. */
  readonly coreFields: readonly SelfProfileField[];
  /** 历法 · 城市 · 时间准确度 — the wide meta cell under the core grid. */
  readonly metaText: string;
  readonly metaMissing: boolean;
  /** 地点与时区校准 — latitude / longitude / IANA zone, mono. Null when none. */
  readonly calibrationText: string | null;
  /** Accuracy reminders — empty when the profile is complete. */
  readonly reminders: readonly string[];
  readonly isComplete: boolean;
  /** Whether any birth date has been entered at all. */
  readonly hasData: boolean;
}

function formatDate(text: string): string {
  // 1990-04-12 → 1990/04/12; leave lunar / free-form strings untouched.
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text.replace(/-/g, '/') : text;
}

// Latitude / longitude → "31.23°N" / "121.47°E". The signed numbers stored on
// BirthLocation get a hemisphere suffix here so the summary reads naturally
// without the user having to interpret negative coordinates.
function formatLatitude(lat: number): string {
  if (!Number.isFinite(lat)) return '';
  const abs = Math.abs(lat).toFixed(2);
  return `${abs}°${lat >= 0 ? 'N' : 'S'}`;
}

function formatLongitude(lng: number): string {
  if (!Number.isFinite(lng)) return '';
  const abs = Math.abs(lng).toFixed(2);
  return `${abs}°${lng >= 0 ? 'E' : 'W'}`;
}

// Treat the empty-snapshot defaults (0/0 + Etc/UTC) as「no calibration yet」,
// so the calibration line stays out of the way until the user enters a place.
function hasCalibration(lat: number, lng: number, tz: string): boolean {
  if (!tz || tz === 'Etc/UTC') return false;
  if (lat === 0 && lng === 0) return false;
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function summarizeSelfSubject(
  space: ShiJingSpace,
  copy: ProductCopy = getProductCopy('zh'),
): SelfProfileSummary {
  const inputs = space.self_subject.natal_inputs;
  const raw = inputs.raw_birth_input;
  const loc = inputs.birth_location;
  const isScaffold = isScaffoldNatalInputs(inputs);

  const dateText = isScaffold ? '' : raw.local_date_text.trim();
  const timeText = isScaffold ? '' : (raw.local_time_text ?? '').trim();
  const place = isScaffold ? '' : (loc.place_name ?? raw.place_text ?? '').trim();
  const sex = inputs.calculation_sex;
  const sexMissing = sex === 'unspecified';
  const hasData = dateText.length > 0;

  // 性别 / 出生日期 / 出生时间 — three labelled cells, each falling back to a
  // muted「未填写」placeholder so the grid keeps a steady shape.
  const coreFields: SelfProfileField[] = [
    {
      label: copy.self.coreLabels.sex,
      value: sexMissing ? copy.self.missing : copy.calculationSexLabels[sex],
      missing: sexMissing,
    },
    {
      label: copy.self.coreLabels.birthDate,
      value: dateText ? formatDate(dateText) : copy.self.missing,
      missing: !dateText,
    },
    {
      label: copy.self.coreLabels.birthTime,
      value: timeText || copy.self.missing,
      missing: !timeText,
    },
  ];

  // 历法 · 城市 · 时间准确度 — the wide meta cell. The precision label only
  // joins in when a birth time is actually recorded.
  const metaParts: string[] = isScaffold ? [] : [copy.calendarSystemLabels[inputs.calendar_system]];
  if (place) metaParts.push(place);
  if (hasData && timeText) metaParts.push(copy.birthPrecisionLabels[inputs.birth_precision]);
  const metaText = metaParts.length > 0 ? metaParts.join(' · ') : copy.self.missing;
  // Muted unless the user has supplied something beyond the default 历法.
  const metaMissing = isScaffold || (!place && !(hasData && timeText));

  const calibrationParts: string[] = [];
  if (hasCalibration(loc.latitude, loc.longitude, loc.iana_time_zone)) {
    calibrationParts.push(formatLatitude(loc.latitude));
    calibrationParts.push(formatLongitude(loc.longitude));
    calibrationParts.push(loc.iana_time_zone);
  }
  const calibrationText = calibrationParts.length > 0 ? calibrationParts.join(' · ') : null;

  const reminders: string[] = [];
  if (!dateText) reminders.push(copy.self.reminders.missingBirthDate);
  if (!timeText) reminders.push(copy.self.reminders.missingBirthTime);
  if (!place) reminders.push(copy.self.reminders.missingPlace);
  if (sex === 'unspecified') reminders.push(copy.self.reminders.missingSex);

  return {
    coreFields,
    metaText,
    metaMissing,
    calibrationText,
    reminders,
    isComplete: reminders.length === 0,
    hasData,
  };
}

// 本命盘 / 日镜 / 月镜 / 年镜 — the surfaces this self data feeds.
export const SELF_PROFILE_TAGS = ['本命盘', '日镜', '月镜', '年镜'] as const;
