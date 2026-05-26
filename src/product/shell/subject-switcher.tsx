// SJG-IA-04 — CurrentObservationTarget switcher. Always visible above the
// IA tab row. Lets the user re-anchor every tab's "观察对象" to either
// `self` or any admitted Person. Fail-close: never accepts a SubjectRef
// that isn't in the snapshot roster.

import { useMemo } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Avatar,
  Surface,
} from '@nimiplatform/kit/ui';
import { useShijingStore } from '../state/shijing-store.tsx';
import { subjectRefKey } from '../../domain/subject-ref.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { SELF_DISPLAY_NAME } from '../i18n/copy.ts';
import { subjectNatalReadiness } from '../subjects/natal-readiness.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';

interface SubjectOption {
  readonly ref: SubjectRef;
  readonly label: string;
  readonly initial: string;
  readonly meta: string;
}

function initialOf(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '?';
  const cp = trimmed.codePointAt(0);
  return cp ? String.fromCodePoint(cp).toUpperCase() : '?';
}

function birthDateLabel(birthDatetimeUtc: string): string {
  if (!birthDatetimeUtc) return '';
  const d = new Date(birthDatetimeUtc);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function subjectMeta(ref: SubjectRef, birthDatetimeUtc: string, snapshot: ShiJingSpace): string {
  const readiness = subjectNatalReadiness(ref, snapshot);
  if (!readiness.ok) return '生辰未完善';
  return birthDateLabel(birthDatetimeUtc);
}

export function SubjectSwitcher() {
  const { state, dispatch } = useShijingStore();
  const options = useMemo<SubjectOption[]>(() => {
    const list: SubjectOption[] = [];
    list.push({
      ref: 'self',
      label: SELF_DISPLAY_NAME,
      initial: '我',
      meta: subjectMeta('self', state.snapshot.self_subject.natal_inputs.birth_datetime_utc, state.snapshot),
    });
    for (const person of state.snapshot.persons) {
      list.push({
        ref: { kind: 'person', id: person.id },
        label: person.display_name,
        initial: initialOf(person.display_name),
        meta: subjectMeta({ kind: 'person', id: person.id }, person.natal_inputs?.birth_datetime_utc ?? '', state.snapshot),
      });
    }
    return list;
  }, [state.snapshot]);

  const current = options.find((o) => subjectRefKey(o.ref) === subjectRefKey(state.observation_target));

  if (!current) {
    return (
      <div className="shijing-subject-switcher shijing-subject-switcher--invalid" role="alert">
        <span>当前观察对象不存在</span>
        <TechnicalDetails content={`dangling_observation_target: ${subjectRefKey(state.observation_target)}`} />
      </div>
    );
  }

  function onSelect(option: SubjectOption) {
    if (subjectRefKey(option.ref) === subjectRefKey(state.observation_target)) return;
    dispatch({ type: 'observation/set', target: option.ref });
  }

  return (
    <div className="shijing-subject-switcher">
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="shijing-subject-switcher__trigger" aria-label="切换查看的人">
            <Avatar size="sm" shape="circle" tone="accent" alt={current.label} fallback={current.initial} />
            <span className="shijing-subject-switcher__current">
              <span className="shijing-subject-switcher__label">{current.label}</span>
              {current.meta ? (
                <span className="shijing-subject-switcher__meta">{current.meta}</span>
              ) : null}
            </span>
            <span className="shijing-subject-switcher__chevron" aria-hidden>›</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} className="shijing-subject-switcher__panel">
          <Surface tone="overlay" material="glass-regular" elevation="floating" padding="sm" className="shijing-subject-switcher__list">
            {options.map((option) => {
              const isActive = subjectRefKey(option.ref) === subjectRefKey(state.observation_target);
              return (
                <button
                  type="button"
                  key={subjectRefKey(option.ref)}
                  className={`shijing-subject-switcher__item${isActive ? ' shijing-subject-switcher__item--active' : ''}`}
                  onClick={() => onSelect(option)}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <Avatar size="sm" shape="circle" tone={isActive ? 'accent' : 'neutral'} alt={option.label} fallback={option.initial} />
                  <span className="shijing-subject-switcher__option-text">
                    <span>{option.label}</span>
                    {option.meta ? <small>{option.meta}</small> : null}
                  </span>
                </button>
              );
            })}
          </Surface>
        </PopoverContent>
      </Popover>
    </div>
  );
}
