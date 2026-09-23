// Mounts the in-app RiJing generation entry for the product lifetime: the
// daily run schedule, the RiJing page, and manual generation all request
// through it; saved Readings are projected as App activity when an activity
// port is provided. Everything stops when the product unmounts, including
// when the Host reports the Nimi session invalidated.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { nimiToast } from '@nimiplatform/kit/ui';
import { newReadingId } from '../ids/index.ts';
import { useProductCopy, type ProductCopy } from '../i18n/copy.ts';
import { describePersistenceError } from '../persistence/persistence-error-detail.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import {
  persistenceReadyForAutoGeneration,
  persistenceReadyForManualGeneration,
} from '../tabs/auto-generation-readiness.ts';
import { DEFAULT_BASIS_TIME_ZONE } from '../tabs/mirror-scope-helpers.ts';
import { readingFailureHeadline } from '../tabs/shared/reading-failure-copy.ts';
import { createDailyRiJingSchedule } from './daily-rijing-schedule.ts';
import {
  createRiJingActivityPublisher,
  type RiJingActivityPort,
  type RiJingActivityPublisher,
} from './rijing-activity.ts';
import {
  createRiJingGeneration,
  type RiJingGeneration,
  type RiJingGenerationOutcome,
  type RiJingGenerationStatus,
  type RiJingGenerationTrigger,
} from './rijing-generation.ts';

interface RiJingGenerationValue {
  readonly request: (trigger: RiJingGenerationTrigger) => Promise<RiJingGenerationOutcome>;
  readonly status: RiJingGenerationStatus;
}

const IDLE: RiJingGenerationStatus = { kind: 'idle' };

function noGeneration(): Promise<RiJingGenerationOutcome> {
  return Promise.resolve('stopped');
}

const RiJingGenerationContext = createContext<RiJingGenerationValue | null>(null);

interface SessionWork {
  readonly generation: RiJingGeneration;
  readonly publisher: RiJingActivityPublisher | null;
}

export function RiJingGenerationProvider(props: {
  readonly activity: RiJingActivityPort | null;
  readonly onOpenRiJing: () => void;
  readonly children: ReactNode;
}) {
  const store = useShijingStore();
  const copy = useProductCopy();
  const latest = useRef({ store, copy, onOpenRiJing: props.onOpenRiJing });
  latest.current = { store, copy, onOpenRiJing: props.onOpenRiJing };
  const [work, setWork] = useState<SessionWork | null>(null);

  useEffect(() => {
    const publisher = props.activity
      ? createRiJingActivityPublisher({ activity: props.activity, copy: () => latest.current.copy })
      : null;
    const generation = createRiJingGeneration({
      now: () => new Date(),
      space: () => latest.current.store.state.snapshot,
      persistenceReady: (trigger) =>
        (trigger === 'manual' ? persistenceReadyForManualGeneration : persistenceReadyForAutoGeneration)({
          persistence_status: latest.current.store.persistence_status,
          has_persistence_client: latest.current.store.persistence_client !== null,
        }),
      generate: (input) =>
        generateReadingForStorage({ ...input, deps: { runtime_ai_client: latest.current.store.runtime_ai_client } }),
      save: (space) => latest.current.store.replace_snapshot(space),
      saved: (reading) => {
        void publisher?.publish(reading);
      },
      newReadingId: () => newReadingId(),
    });
    setWork({ generation, publisher });
    return () => {
      generation.stop();
      publisher?.stop();
      setWork(null);
    };
  }, [props.activity]);

  const generation = work?.generation ?? null;
  const subscribe = useCallback(
    (listener: () => void) => generation?.subscribe(listener) ?? (() => undefined),
    [generation],
  );
  const status = useSyncExternalStore(subscribe, () => generation?.status() ?? IDLE);

  const daily = store.state.snapshot.settings.daily_rijing;
  const dailyKey = daily?.enabled ? daily.time : null;
  const scheduleRef = useRef<ReturnType<typeof createDailyRiJingSchedule> | null>(null);
  useEffect(() => {
    if (!generation) return undefined;
    const schedule = createDailyRiJingSchedule({
      now: () => new Date(),
      timeZone: DEFAULT_BASIS_TIME_ZONE,
      setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
      clearTimer: (handle) => window.clearTimeout(handle as number),
      start: () => {
        void generation.request('daily');
      },
    });
    scheduleRef.current = schedule;
    return () => {
      schedule.stop();
      scheduleRef.current = null;
    };
  }, [generation]);
  useEffect(() => {
    scheduleRef.current?.configure(dailyKey === null ? undefined : { enabled: true, time: dailyKey });
  }, [generation, dailyKey]);

  useDailyRunNotice(status, latest);
  useUnsyncedActivityNotice(work?.publisher ?? null, latest);

  const request = useCallback(
    (trigger: RiJingGenerationTrigger) => (generation ? generation.request(trigger) : noGeneration()),
    [generation],
  );
  const value = useMemo<RiJingGenerationValue>(() => ({ request, status }), [request, status]);

  return <RiJingGenerationContext.Provider value={value}>{props.children}</RiJingGenerationContext.Provider>;
}

type LatestProviderInput = { readonly current: { readonly copy: ProductCopy; readonly onOpenRiJing: () => void } };

// A daily run that could not start or did not save is reported wherever the
// user is; the RiJing page shows the same state inline.
function useDailyRunNotice(current: RiJingGenerationStatus, latest: LatestProviderInput) {
  useEffect(() => {
    if (!('trigger' in current) || current.trigger !== 'daily') return undefined;
    const text = latest.current.copy;
    let message: string | null = null;
    if (current.kind === 'blocked') message = text.dailyRiJing.notice.blocked[current.reason];
    if (current.kind === 'failed') message = text.dailyRiJing.notice.failed(readingFailureHeadline(text, current.failure));
    if (current.kind === 'save_failed') {
      message = text.dailyRiJing.notice.saveFailed(
        current.persistence.kind === 'error' ? describePersistenceError(current.persistence.error) : current.persistence.kind,
      );
    }
    if (!message) return undefined;
    const id = nimiToast.warning(message, {
      sticky: true,
      action: { label: text.dailyRiJing.notice.view, onClick: () => latest.current.onOpenRiJing() },
    });
    return () => nimiToast.dismiss(id);
  }, [current, latest]);
}

function useUnsyncedActivityNotice(publisher: RiJingActivityPublisher | null, latest: LatestProviderInput) {
  useEffect(() => {
    if (!publisher) return undefined;
    let toastId: string | null = null;
    const dismiss = () => {
      if (toastId) nimiToast.dismiss(toastId);
      toastId = null;
    };
    const unsubscribe = publisher.subscribe((unsynced) => {
      if (unsynced === 0) {
        dismiss();
        return;
      }
      if (toastId) return;
      toastId = nimiToast.warning(latest.current.copy.dailyRiJing.notice.unsynced, {
        sticky: true,
        action: {
          label: latest.current.copy.dailyRiJing.notice.retrySync,
          onClick: () => {
            toastId = null;
            void publisher.retry();
          },
        },
      });
    });
    return () => {
      unsubscribe();
      dismiss();
    };
  }, [publisher, latest]);
}

export function useRiJingGeneration(): RiJingGenerationValue {
  const value = useContext(RiJingGenerationContext);
  if (!value) throw new Error('useRiJingGeneration must be used inside <RiJingGenerationProvider>');
  return value;
}
