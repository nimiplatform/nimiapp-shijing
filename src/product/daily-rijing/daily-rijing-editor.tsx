// Settings > 每日日镜 — enable the in-app daily RiJing run and pick its time
// (rule.shijing.product.r017). Saves immediately; the run schedule follows the
// saved setting.

import { useEffect, useState, type ChangeEvent } from 'react';
import { Toggle, nimiToast } from '@nimiplatform/kit/ui';
import { isDailyRiJingTime, type DailyRiJingSettings } from '../../domain/settings.ts';
import { useProductCopy } from '../i18n/copy.ts';
import { describePersistenceError } from '../persistence/persistence-error-detail.ts';
import { SettingsRow } from '../settings/settings-row.tsx';
import { persistenceWriteSucceeded } from '../state/persistence-bridge.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { commitDailyRiJing, dailyRiJingSettingsOf } from './daily-rijing-state.ts';

export function DailyRiJingEditor() {
  const { state, replace_snapshot } = useShijingStore();
  const copy = useProductCopy();
  const current = dailyRiJingSettingsOf(state.snapshot);
  const [timeDraft, setTimeDraft] = useState(current.time);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTimeDraft(current.time);
  }, [current.time]);

  async function save(next: DailyRiJingSettings) {
    const outcome = commitDailyRiJing(state.snapshot, next);
    if (!outcome.ok) {
      nimiToast.danger(copy.dailyRiJing.saveFailed(outcome.code));
      setTimeDraft(current.time);
      return;
    }
    setSaving(true);
    const persistence = await replace_snapshot(outcome.next_space);
    setSaving(false);
    if (!persistenceWriteSucceeded(persistence)) {
      nimiToast.danger(copy.dailyRiJing.saveFailed(
        persistence.kind === 'error' ? describePersistenceError(persistence.error) : persistence.kind,
      ));
      setTimeDraft(current.time);
      return;
    }
    nimiToast.success(copy.dailyRiJing.saved(next.enabled, next.time));
  }

  function onTimeChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.currentTarget.value;
    setTimeDraft(value);
    if (isDailyRiJingTime(value) && value !== current.time) void save({ ...current, time: value });
  }

  return (
    <SettingsRow
      id="settings-daily-rijing"
      icon={
        <svg
          className="sjp-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      }
      title={copy.dailyRiJing.title}
    >
      <div className="sjp-row__fields">
        <div className="sjp-inline-field">
          <span className="sjp-label">{copy.dailyRiJing.enable}</span>
          <Toggle
            checked={current.enabled}
            disabled={saving}
            ariaLabel={copy.dailyRiJing.enable}
            onValueChange={(enabled) => void save({ ...current, enabled })}
          />
        </div>
        <div className="sjp-field">
          <label className="sjp-label" htmlFor="daily-rijing-time">{copy.dailyRiJing.time}</label>
          <input
            id="daily-rijing-time"
            className="sjp-input"
            type="time"
            step={60}
            value={timeDraft}
            disabled={saving}
            onChange={onTimeChange}
          />
        </div>
        <p className="sjp-note">{copy.dailyRiJing.note}</p>
      </div>
    </SettingsRow>
  );
}
