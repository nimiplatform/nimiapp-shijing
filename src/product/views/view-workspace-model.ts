import type { Event } from '../../domain/event.ts';
import type { Reading, ReadingTimeWindow } from '../../domain/reading.ts';
import type { ReadingKind } from '../../domain/reading-matrix.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import type { View } from '../../domain/view.ts';
import {
  subjectNatalReadiness,
  subjectReadingReadiness,
  type NatalReadiness,
} from '../subjects/natal-readiness.ts';
import { localCivilDaysWindow } from './view-time-window.ts';

export type ViewGenerationKind = Extract<ReadingKind, 'period_outlook' | 'key_window'>;

export type ViewTimeWindowUnavailable =
  | {
      readonly reason: 'anchor_subject_not_ready';
      readonly subject: SubjectRef;
      readonly readiness: Exclude<NatalReadiness, { ok: true }>;
      readonly detail: string;
    }
  | { readonly reason: 'bounded_time_scope_invalid'; readonly detail: string }
  | { readonly reason: 'rolling_time_scope_invalid'; readonly detail: string };

export type ViewTimeWindowResolution =
  | { readonly ok: true; readonly time_window: ReadingTimeWindow }
  | { readonly ok: false; readonly error: ViewTimeWindowUnavailable };

export type ViewGenerationReadiness =
  | { readonly ok: true; readonly time_window: ReadingTimeWindow }
  | {
      readonly ok: false;
      readonly reason: 'view_time_window_unavailable';
      readonly error: ViewTimeWindowUnavailable;
      readonly detail: string;
    }
  | {
      readonly ok: false;
      readonly reason: 'subject_readiness_failed';
      readonly subject: SubjectRef;
      readonly readiness: Exclude<NatalReadiness, { ok: true }>;
      readonly detail: string;
    };

function dateMs(iso: string): number {
  const value = new Date(iso).getTime();
  return Number.isFinite(value) ? value : Number.NaN;
}

export function readingsForView(readings: readonly Reading[], viewId: string): readonly Reading[] {
  return [...readings]
    .filter((reading) => reading.scope === 'view' && reading.view_id === viewId)
    .sort((a, b) => dateMs(b.created_at) - dateMs(a.created_at));
}

export function eventsForView(events: readonly Event[], viewId: string): readonly Event[] {
  return [...events]
    .filter((event) => event.view_refs.includes(viewId))
    .sort((a, b) => dateMs(b.occurred_at) - dateMs(a.occurred_at));
}

export function resolveViewTimeWindow(
  view: View,
  space: ShiJingSpace,
  now: Date = new Date(),
  kind: ViewGenerationKind = 'period_outlook',
): ViewTimeWindowResolution {
  const anchorReadiness = subjectNatalReadiness(view.anchor_subject, space);
  if (!anchorReadiness.ok) {
    return {
      ok: false,
      error: {
        reason: 'anchor_subject_not_ready',
        subject: view.anchor_subject,
        readiness: anchorReadiness,
        detail: anchorReadiness.detail,
      },
    };
  }
  const basisTimeZone = anchorReadiness.inputs.birth_location.iana_time_zone;
  if (view.time_scope === 'bounded') {
    const start = view.bounded_range?.start;
    const end = view.bounded_range?.end;
    const startMs = start ? dateMs(start) : Number.NaN;
    const endMs = end ? dateMs(end) : Number.NaN;
    if (!start || !end || !Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs) {
      return {
        ok: false,
        error: {
          reason: 'bounded_time_scope_invalid',
          detail: 'bounded_time_scope_invalid: bounded View requires valid start < end for ReadingTimeWindow',
        },
      };
    }
    if (kind === 'key_window') {
      const defaultKeyWindow = localCivilDaysWindow(basisTimeZone, 90, now);
      const defaultStartMs = dateMs(defaultKeyWindow.start_utc!);
      const defaultEndMs = dateMs(defaultKeyWindow.end_utc!);
      if (endMs - startMs >= defaultEndMs - defaultStartMs) {
        return { ok: true, time_window: defaultKeyWindow };
      }
    }
    return {
      ok: true,
      time_window: {
        mode: 'bounded',
        start_utc: start,
        end_utc: end,
        basis_time_zone: basisTimeZone,
        source: 'view_time_scope',
      },
    };
  }
  if (kind === 'key_window') {
    return { ok: true, time_window: localCivilDaysWindow(basisTimeZone, 90, now) };
  }
  if (view.time_scope === 'open_ended') {
    return { ok: true, time_window: localCivilDaysWindow(basisTimeZone, 180, now) };
  }
  const days = view.rolling_window_days;
  if (!Number.isInteger(days) || days === undefined || days <= 0) {
    return {
      ok: false,
      error: {
        reason: 'rolling_time_scope_invalid',
        detail: 'rolling_time_scope_invalid: rolling View requires positive rolling_window_days',
      },
    };
  }
  if (!Number.isFinite(now.getTime())) {
    return {
      ok: false,
      error: {
        reason: 'rolling_time_scope_invalid',
        detail: 'rolling_time_scope_invalid: generation time is not a valid Date',
      },
    };
  }
  return { ok: true, time_window: localCivilDaysWindow(basisTimeZone, days, now) };
}

export function viewGenerationReadiness(
  view: View,
  space: ShiJingSpace,
  kind: ViewGenerationKind,
  now: Date = new Date(),
): ViewGenerationReadiness {
  const timeWindow = resolveViewTimeWindow(view, space, now, kind);
  if (!timeWindow.ok) {
    return {
      ok: false,
      reason: 'view_time_window_unavailable',
      error: timeWindow.error,
      detail: timeWindow.error.detail,
    };
  }
  for (const subject of view.subjects) {
    const readiness = subjectReadingReadiness({
      subject,
      space,
      kind,
      scope: 'view',
      view,
      time_window: timeWindow.time_window,
    });
    if (!readiness.ok) {
      return {
        ok: false,
        reason: 'subject_readiness_failed',
        subject,
        readiness,
        detail: readiness.detail,
      };
    }
  }
  return { ok: true, time_window: timeWindow.time_window };
}
