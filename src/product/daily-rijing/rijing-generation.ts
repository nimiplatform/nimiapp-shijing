// The one in-app entry for RiJing generation. RiJing page generation, the
// retry after a failure, explicit manual generation, and the daily run all
// request through it, so at most one generation runs at a time and an
// automatic request never repeats work for the same inputs.

import type { Reading, ReadingGenerationFailure } from '../../domain/reading.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { GenerateAndStoreInput, GenerateAndStoreOutcome } from '../reading/generate-and-store.ts';
import { pruneReadings } from '../reading/prune-readings.ts';
import { planRiJing } from '../reading/rijing-plan.ts';
import type { PersistenceLifecycleStatus } from '../state/persistence-bridge.ts';

export type RiJingGenerationTrigger = 'page' | 'daily' | 'manual';

export type RiJingRunBlock = 'persistence_unavailable' | 'profile_incomplete' | 'missing_focus';

export type RiJingGenerationStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'generating'; readonly trigger: RiJingGenerationTrigger; readonly signature: string }
  | { readonly kind: 'blocked'; readonly trigger: 'daily'; readonly reason: RiJingRunBlock; readonly date: string }
  | {
      readonly kind: 'failed';
      readonly trigger: RiJingGenerationTrigger;
      readonly signature: string;
      readonly failure: ReadingGenerationFailure;
    }
  | {
      readonly kind: 'save_failed';
      readonly trigger: RiJingGenerationTrigger;
      readonly signature: string;
      readonly persistence: PersistenceLifecycleStatus;
    }
  | { readonly kind: 'saved'; readonly trigger: RiJingGenerationTrigger; readonly reading_id: string; readonly date: string };

export type RiJingGenerationOutcome =
  | 'generated'
  | 'current'
  // Daily RiJing is on and today has no Reading yet: the page leaves the
  // first Reading to the daily run or an explicit request.
  | 'left_to_daily_run'
  | 'already_attempted'
  | 'blocked'
  | 'failed'
  | 'save_failed'
  | 'stopped';

export interface RiJingGenerationDeps {
  readonly now: () => Date;
  // The latest committed ShiJingSpace.
  readonly space: () => ShiJingSpace;
  readonly persistenceReady: (trigger: RiJingGenerationTrigger) => boolean;
  readonly generate: (input: GenerateAndStoreInput) => Promise<GenerateAndStoreOutcome>;
  // Saves the complete ShiJingSpace; resolves the persistence status.
  readonly save: (space: ShiJingSpace) => Promise<PersistenceLifecycleStatus>;
  // Called only after the Reading is saved.
  readonly saved: (reading: Reading) => void;
  readonly newReadingId: () => string;
}

export interface RiJingGeneration {
  request(trigger: RiJingGenerationTrigger): Promise<RiJingGenerationOutcome>;
  readonly status: () => RiJingGenerationStatus;
  subscribe(listener: () => void): () => void;
  // Ends the session's generation work; an in-flight generation neither
  // saves nor reports afterwards.
  stop(): void;
}

const MAX_REMEMBERED_ATTEMPTS = 32;

function isoSecond(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/u, 'Z');
}

function saveSucceeded(status: PersistenceLifecycleStatus): boolean {
  // `idle` is the result when no persistence client is configured (previews).
  return status.kind === 'saved' || status.kind === 'idle';
}

// @nimi-authority: rule.shijing.product.r017
export function createRiJingGeneration(deps: RiJingGenerationDeps): RiJingGeneration {
  let status: RiJingGenerationStatus = { kind: 'idle' };
  let inFlight: Promise<RiJingGenerationOutcome> | null = null;
  let stopped = false;
  const attempted: string[] = [];
  const listeners = new Set<() => void>();

  function setStatus(next: RiJingGenerationStatus) {
    if (stopped) return;
    status = next;
    for (const listener of listeners) listener();
  }

  function remember(signature: string) {
    if (attempted.includes(signature)) return;
    attempted.push(signature);
    if (attempted.length > MAX_REMEMBERED_ATTEMPTS) attempted.shift();
  }

  async function run(trigger: RiJingGenerationTrigger): Promise<RiJingGenerationOutcome> {
    const space = deps.space();
    const now = deps.now();
    const plan = planRiJing(space, now);
    if (trigger !== 'manual' && plan.current_reading) return 'current';
    // With daily RiJing on, the day's first Reading comes only from the daily
    // run at its time while ShiJing runs, or from an explicit request; the
    // page never produces it, so starting after a missed time is no catch-up.
    if (trigger === 'page' && space.settings.daily_rijing?.enabled && !plan.has_reading_today) return 'left_to_daily_run';
    const block: RiJingRunBlock | null = !deps.persistenceReady(trigger)
      ? 'persistence_unavailable'
      : !plan.readiness.ok
        ? 'profile_incomplete'
        : plan.active_tag_ids.length === 0
          ? 'missing_focus'
          : null;
    if (block) {
      // The RiJing page shows these prerequisites itself; only a daily run
      // that could not start needs its own notice.
      if (trigger === 'daily') setStatus({ kind: 'blocked', trigger, reason: block, date: plan.scope.date });
      return 'blocked';
    }
    if (trigger !== 'manual' && attempted.includes(plan.signature)) return 'already_attempted';
    remember(plan.signature);
    setStatus({ kind: 'generating', trigger, signature: plan.signature });
    const outcome = await deps.generate({
      id: deps.newReadingId(),
      created_at: isoSecond(now),
      mirror_kind: 'rijing',
      mirror_scope: plan.scope,
      related_person_refs: [],
      concern_tag_refs: plan.active_tag_ids,
      cited_event_memory_refs: plan.reference_event_refs,
      space,
    });
    if (stopped) return 'stopped';
    if (!outcome.ok) {
      setStatus({ kind: 'failed', trigger, signature: plan.signature, failure: outcome.failure });
      return 'failed';
    }
    // Merge into the latest space so edits made while generating are kept.
    const latest = deps.space();
    const next: ShiJingSpace = {
      ...latest,
      readings: pruneReadings([...latest.readings, outcome.reading], latest.conversations),
    };
    const persistence = await deps.save(next);
    if (stopped) return 'stopped';
    if (!saveSucceeded(persistence)) {
      setStatus({ kind: 'save_failed', trigger, signature: plan.signature, persistence });
      return 'save_failed';
    }
    setStatus({ kind: 'saved', trigger, reading_id: outcome.reading.id, date: plan.scope.date });
    deps.saved(outcome.reading);
    return 'generated';
  }

  return {
    request(trigger) {
      if (stopped) return Promise.resolve('stopped');
      if (inFlight) return inFlight;
      const current = run(trigger).finally(() => {
        if (inFlight === current) inFlight = null;
      });
      inFlight = current;
      return current;
    },
    status: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    stop() {
      stopped = true;
      listeners.clear();
    },
  };
}
