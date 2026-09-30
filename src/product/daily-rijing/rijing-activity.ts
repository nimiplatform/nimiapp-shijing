// Projects each saved RiJing Reading as one ordinary App activity. The
// projection carries only the date, day pillar, and method label; Runtime-AI
// wording, concern text, memories, plans, and natal data stay inside ShiJing.

import type { NimiAppActivityPutInput } from '@nimiplatform/sdk/app';
import type { Reading } from '../../domain/reading.ts';
import type { ProductCopy } from '../i18n/copy.ts';
import { rijingDayPillar } from '../tabs/rijing/rijing-daily-almanac.ts';

export const RIJING_ACTIVITY_TYPE = 'nimi.shijing.rijing-reading.v1';

export type RiJingActivityPublication = NimiAppActivityPutInput & { readonly occurredAt: string };

function dailyDate(reading: Reading): string | null {
  const scope = reading.mirror_scope;
  return reading.mirror_kind === 'rijing' && scope.kind === 'daily' ? scope.date : null;
}

export function rijingActivityPublication(reading: Reading, copy: ProductCopy): RiJingActivityPublication | null {
  const date = dailyDate(reading);
  if (!date) return null;
  const methodId = reading.inputs_summary.method_profile.id;
  const [, month, day] = date.split('-').map(Number) as [number, number, number];
  return {
    key: `rijing:${date}:${methodId}`,
    // Regenerating the same date and method updates the same activity.
    revision: Math.floor(Date.parse(reading.created_at) / 1000),
    kind: 'activity',
    attention: false,
    title: copy.dailyRiJing.activity.title(month, day),
    summary: copy.dailyRiJing.activity.summary(
      rijingDayPillar(date) ?? '',
      copy.citationDrawer.methodLabels[methodId] ?? methodId,
    ),
    type: RIJING_ACTIVITY_TYPE,
    data: { date, methodProfileId: methodId },
    occurredAt: reading.created_at,
  };
}

export interface RiJingActivityPort {
  put(input: NimiAppActivityPutInput): Promise<unknown>;
}

export interface RiJingActivityPublisher {
  publish(reading: Reading): Promise<number>;
  // The user's explicit retry of publications not synced yet.
  retry(): Promise<number>;
  readonly unsynced: () => number;
  subscribe(listener: (unsynced: number) => void): () => void;
  // Ends the session's publication; nothing pending carries over.
  stop(): void;
}

function reasonCode(error: unknown): string {
  return String((error as { reasonCode?: unknown } | null)?.reasonCode ?? '');
}

// A revision Runtime already holds for this key is settled, not a failure.
function settled(error: unknown): boolean {
  const code = reasonCode(error);
  return code === 'content-conflict' || code === 'APP_ACTIVITY_REVISION_CONFLICT';
}

// @nimi-authority: rule.shijing.product.r017
export function createRiJingActivityPublisher(input: {
  readonly activity: RiJingActivityPort;
  readonly copy: () => ProductCopy;
  readonly report?: (error: unknown) => void;
}): RiJingActivityPublisher {
  const pending = new Map<string, RiJingActivityPublication>();
  const listeners = new Set<(unsynced: number) => void>();
  let queue: Promise<unknown> = Promise.resolve();
  let stopped = false;

  function serialized<T>(work: () => Promise<T>): Promise<T> {
    const run = queue.then(work, work);
    queue = run.then(() => undefined, () => undefined);
    return run;
  }

  async function flush(publications: readonly RiJingActivityPublication[]): Promise<number> {
    for (const publication of publications) {
      if (stopped) return 0;
      const key = publication.key;
      // A queued revision may have been superseded or already settled.
      if (pending.get(key) !== publication) continue;
      try {
        await input.activity.put(publication);
        if (pending.get(key) === publication) pending.delete(key);
      } catch (error) {
        if (settled(error)) {
          if (pending.get(key) === publication) pending.delete(key);
        } else {
          input.report?.(error);
        }
      }
    }
    if (stopped) return 0;
    for (const listener of listeners) listener(pending.size);
    return pending.size;
  }

  return {
    publish(reading) {
      if (stopped) return Promise.resolve(0);
      const publication = rijingActivityPublication(reading, input.copy());
      if (!publication) return Promise.resolve(pending.size);
      const existing = pending.get(publication.key);
      if (existing && existing.revision >= publication.revision) return Promise.resolve(pending.size);
      pending.set(publication.key, publication);
      // Publishing one Reading must not retry failures from other Readings.
      return serialized(() => flush([publication]));
    },
    retry() {
      if (stopped) return Promise.resolve(0);
      const publications = [...pending.values()];
      return serialized(() => flush(publications));
    },
    unsynced: () => pending.size,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    stop() {
      stopped = true;
      pending.clear();
      listeners.clear();
    },
  };
}
