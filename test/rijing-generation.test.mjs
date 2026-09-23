// rule.shijing.product.r017 — the one in-app RiJing generation entry and the
// App activity projection of saved RiJing Readings.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRiJingActivityPublisher,
  rijingActivityPublication,
  RIJING_ACTIVITY_TYPE,
} from '../src/product/daily-rijing/rijing-activity.ts';
import { createRiJingGeneration } from '../src/product/daily-rijing/rijing-generation.ts';
import { getProductCopy } from '../src/product/i18n/copy.ts';
import { generateReadingForStorage } from '../src/product/reading/generate-and-store.ts';
import {
  rolling30DayMirrorScope,
  validConcernTag,
  validReading,
  validRijingOutput,
  validShiJingSpace,
  validYuejingOutput,
} from './_fixtures.mjs';
import { MockRuntimeAiClient } from './_mock-runtime-ai-client.mjs';

// 08:30 in Beijing on 2026-09-23.
const NOW = new Date('2026-09-23T00:30:00.000Z');

function spaceWithFocus() {
  return validShiJingSpace({ concern_tags: [validConcernTag('tag_love', { sort_order: 0 })] });
}

function harness(options = {}) {
  const ai = new MockRuntimeAiClient({ canned_output_by_kind: { rijing: validRijingOutput() } });
  const state = {
    space: options.space ?? spaceWithFocus(),
    persistenceReady: true,
    generateCalls: 0,
    saves: [],
    saved: [],
    gate: null,
  };
  const generation = createRiJingGeneration({
    now: () => NOW,
    space: () => state.space,
    persistenceReady: (trigger) => options.persistenceReady?.(trigger) ?? state.persistenceReady,
    generate: async (input) => {
      state.generateCalls += 1;
      if (state.gate) await state.gate;
      return generateReadingForStorage({ ...input, deps: { runtime_ai_client: ai } });
    },
    save: options.save ?? (async (next) => {
      state.saves.push(next);
      state.space = next;
      return { kind: 'saved', adapter: 'in_memory', saved_at: NOW.toISOString() };
    }),
    saved: (reading) => state.saved.push({ reading, afterSaves: state.saves.length }),
    newReadingId: () => `r_rijing_${state.generateCalls}`,
  });
  return { ai, state, generation };
}

test('the page and the daily run share one generation; a current Reading skips automatic runs', async () => {
  const { state, generation } = harness();
  const [page, daily] = await Promise.all([generation.request('page'), generation.request('daily')]);
  assert.deepEqual([page, daily], ['generated', 'generated']);
  assert.equal(state.generateCalls, 1);
  assert.equal(state.saves.length, 1);
  assert.equal(state.saved.length, 1);
  assert.equal(state.saved[0].afterSaves, 1, 'published only after the save');
  assert.equal(generation.status().kind, 'saved');
  assert.equal(generation.status().date, '2026-09-23');

  assert.equal(await generation.request('daily'), 'current');
  assert.equal(await generation.request('page'), 'current');
  assert.equal(state.generateCalls, 1);

  // Explicit manual generation stays available.
  assert.equal(await generation.request('manual'), 'generated');
  assert.equal(state.generateCalls, 2);
});

test('with daily RiJing on, starting after a missed time produces no Reading until the run or an explicit request', async () => {
  // 08:30 Beijing, daily time 08:00, ShiJing was closed at 08:00 and today has no Reading.
  const base = spaceWithFocus();
  const space = { ...base, settings: { ...base.settings, daily_rijing: { enabled: true, time: '08:00' } } };
  const { state, generation } = harness({ space });
  assert.equal(await generation.request('page'), 'left_to_daily_run');
  assert.equal(state.generateCalls, 0);
  assert.equal(state.saved.length, 0);
  assert.equal(generation.status().kind, 'idle');

  // An explicit request still generates, and the page then leaves the current Reading alone.
  assert.equal(await generation.request('manual'), 'generated');
  assert.equal(state.generateCalls, 1);
  assert.equal(await generation.request('page'), 'current');

  // The daily run at its time generates when today has no Reading.
  const daily = harness({ space });
  assert.equal(await daily.generation.request('daily'), 'generated');
  assert.equal(daily.state.saved.length, 1);
});

test('with daily RiJing on, the page refreshes a Reading of today whose inputs changed', async () => {
  const base = spaceWithFocus();
  const space = { ...base, settings: { ...base.settings, daily_rijing: { enabled: true, time: '08:00' } } };
  const { state, generation } = harness({ space });
  assert.equal(await generation.request('daily'), 'generated');
  state.space = {
    ...state.space,
    concern_tags: [...state.space.concern_tags, validConcernTag('tag_career', { label: '#事业', parsed_topics: ['career'], sort_order: 1 })],
  };
  assert.equal(await generation.request('page'), 'generated');
  assert.equal(state.generateCalls, 2);
});

test('a failed automatic run is shown and not repeated for the same inputs; manual retry recovers', async () => {
  const { ai, state, generation } = harness();
  ai.options.canned_failure = { kind: 'runtime_unavailable', detail: 'runtime down' };
  assert.equal(await generation.request('daily'), 'failed');
  const failed = generation.status();
  assert.equal(failed.kind, 'failed');
  assert.equal(failed.trigger, 'daily');
  assert.equal(failed.failure.kind, 'runtime_ai_failed');
  assert.equal(state.saves.length, 0);

  assert.equal(await generation.request('page'), 'already_attempted');
  assert.equal(await generation.request('daily'), 'already_attempted');
  assert.equal(state.generateCalls, 1);

  delete ai.options.canned_failure;
  assert.equal(await generation.request('manual'), 'generated');
  assert.equal(generation.status().kind, 'saved');
  assert.equal(state.saved.length, 1);
});

test('a daily run that cannot start reports why; page requests leave the status alone', async () => {
  const noFocus = harness({ space: validShiJingSpace() });
  assert.equal(await noFocus.generation.request('page'), 'blocked');
  assert.equal(noFocus.generation.status().kind, 'idle');
  assert.equal(await noFocus.generation.request('daily'), 'blocked');
  assert.deepEqual(noFocus.generation.status(), {
    kind: 'blocked',
    trigger: 'daily',
    reason: 'missing_focus',
    date: '2026-09-23',
  });

  const unavailable = harness();
  unavailable.state.persistenceReady = false;
  assert.equal(await unavailable.generation.request('daily'), 'blocked');
  assert.equal(unavailable.generation.status().reason, 'persistence_unavailable');
  assert.equal(unavailable.state.generateCalls, 0);
});

test('a Reading that fails to save is reported and never published', async () => {
  const error = { kind: 'error', adapter: 'nimi_storage', error: { kind: 'save_write_failed', adapter: 'nimi_storage', cause: 'disk full' } };
  const { state, generation } = harness({ save: async () => error });
  assert.equal(await generation.request('daily'), 'save_failed');
  assert.equal(generation.status().kind, 'save_failed');
  assert.deepEqual(generation.status().persistence, error);
  assert.equal(state.saved.length, 0);
});

test('manual recovery can retry a failed save while automatic generation stays blocked', async () => {
  let writeFailed = false;
  let saveCalls = 0;
  const { state, generation } = harness({
    persistenceReady: (trigger) => !writeFailed || trigger === 'manual',
    save: async () => {
      saveCalls += 1;
      if (saveCalls === 1) {
        writeFailed = true;
        return { kind: 'error', adapter: 'in_memory', error: { kind: 'save_write_failed', adapter: 'in_memory', cause: 'temporary I/O failure' } };
      }
      return { kind: 'saved', adapter: 'in_memory', saved_at: NOW.toISOString() };
    },
  });
  assert.equal(await generation.request('daily'), 'save_failed');
  assert.equal(state.saved.length, 0);
  assert.equal(await generation.request('page'), 'blocked');
  assert.equal(saveCalls, 1);
  assert.equal(await generation.request('manual'), 'generated');
  assert.equal(saveCalls, 2);
  assert.equal(state.saved.length, 1);
  assert.equal(generation.status().kind, 'saved');
});

test('the Reading is merged into the latest space so edits made while generating are kept', async () => {
  const { state, generation } = harness();
  let release;
  state.gate = new Promise((resolve) => { release = resolve; });
  const running = generation.request('daily');
  assert.equal(generation.status().kind, 'generating');
  state.space = { ...state.space, settings: { ...state.space.settings, ui_language: 'en' } };
  release();
  assert.equal(await running, 'generated');
  assert.equal(state.saves[0].settings.ui_language, 'en');
  assert.equal(state.saves[0].readings.length, 1);
});

test('after stop an in-flight generation neither saves nor publishes, and no new work starts', async () => {
  const { state, generation } = harness();
  let release;
  state.gate = new Promise((resolve) => { release = resolve; });
  const running = generation.request('daily');
  generation.stop();
  release();
  assert.equal(await running, 'stopped');
  assert.equal(state.saves.length, 0);
  assert.equal(state.saved.length, 0);
  assert.equal(await generation.request('manual'), 'stopped');
});

function dailyReading(overrides = {}) {
  return validReading({
    id: 'r_daily',
    created_at: '2026-09-23T00:00:07Z',
    mirror_kind: 'rijing',
    mirror_scope: { kind: 'daily', date: '2026-09-23', basis_time_zone: 'Asia/Shanghai' },
    output: validRijingOutput({ summary: 'AI wording that stays inside ShiJing.' }),
    ...overrides,
  });
}

test('a saved RiJing Reading projects to one summary-only activity per date and method', () => {
  const zh = getProductCopy('zh');
  const publication = rijingActivityPublication(dailyReading(), zh);
  assert.deepEqual(
    {
      key: publication.key,
      revision: publication.revision,
      kind: publication.kind,
      attention: publication.attention,
      type: publication.type,
      data: publication.data,
      occurredAt: publication.occurredAt,
      objectRef: publication.objectRef,
      todoState: publication.todoState,
    },
    {
      key: 'rijing:2026-09-23:bazi_ziping_v1',
      revision: Math.floor(Date.parse('2026-09-23T00:00:07Z') / 1000),
      kind: 'activity',
      attention: false,
      type: RIJING_ACTIVITY_TYPE,
      data: { date: '2026-09-23', methodProfileId: 'bazi_ziping_v1' },
      occurredAt: '2026-09-23T00:00:07Z',
      objectRef: undefined,
      todoState: undefined,
    },
  );
  assert.equal(publication.title, '9月23日的日镜已生成');
  assert.match(publication.summary, /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]日 · 八字子平法$/u);
  const text = JSON.stringify(publication);
  assert.doesNotMatch(text, /AI wording|Steady|Listen|#姻缘|tag_love/u);
  assert.match(rijingActivityPublication(dailyReading(), getProductCopy('en')).title, /^Daily Mirror for Sep 23 is ready$/u);

  // A regeneration updates the same activity with a newer revision.
  const later = rijingActivityPublication(dailyReading({ id: 'r_daily_2', created_at: '2026-09-23T02:00:00Z' }), zh);
  assert.equal(later.key, publication.key);
  assert.ok(later.revision > publication.revision);
  const monthly = validReading({
    mirror_kind: 'yuejing',
    mirror_scope: rolling30DayMirrorScope(),
    output: validYuejingOutput(rolling30DayMirrorScope()),
  });
  assert.equal(rijingActivityPublication(monthly, zh), null);
});

test('failed publications stay visible until an explicit retry; a held revision is settled; stop drops everything', async () => {
  const puts = [];
  let mode = 'down';
  const port = {
    async put(input) {
      puts.push(input);
      if (mode === 'down') throw Object.assign(new Error('down'), { reasonCode: 'runtime-service-unavailable' });
      if (mode === 'conflict') throw Object.assign(new Error('conflict'), { reasonCode: 'content-conflict' });
      return { changed: true };
    },
  };
  const reports = [];
  const publisher = createRiJingActivityPublisher({ activity: port, copy: () => getProductCopy('zh'), report: () => undefined });
  publisher.subscribe((unsynced) => reports.push(unsynced));

  assert.equal(await publisher.publish(dailyReading()), 1);
  assert.deepEqual(reports, [1]);
  // A newer Reading of the same date replaces the unsynced older one.
  assert.equal(await publisher.publish(dailyReading({ id: 'r_daily_2', created_at: '2026-09-23T02:00:00Z' })), 1);
  mode = 'up';
  assert.equal(await publisher.retry(), 0);
  assert.deepEqual(reports, [1, 1, 0]);
  assert.equal(puts.at(-1).revision, Math.floor(Date.parse('2026-09-23T02:00:00Z') / 1000));

  mode = 'conflict';
  assert.equal(await publisher.publish(dailyReading()), 0);

  mode = 'down';
  publisher.stop();
  const before = puts.length;
  assert.equal(await publisher.publish(dailyReading({ id: 'r_daily_3', created_at: '2026-09-23T03:00:00Z' })), 0);
  assert.equal(await publisher.retry(), 0);
  assert.equal(puts.length, before);
});

test('a new activity leaves older failed publications pending until explicit retry', async () => {
  const puts = [];
  let down = true;
  const publisher = createRiJingActivityPublisher({
    activity: { async put(input) {
      puts.push(input.key);
      if (down) throw new Error('temporary service failure');
    } },
    copy: () => getProductCopy('zh'),
  });
  const oldKey = 'rijing:2026-09-23:bazi_ziping_v1';
  const newKey = 'rijing:2026-09-24:bazi_ziping_v1';
  assert.equal(await publisher.publish(dailyReading()), 1);
  down = false;
  assert.equal(await publisher.publish(dailyReading({
    id: 'r_tomorrow',
    created_at: '2026-09-24T00:00:07Z',
    mirror_scope: { kind: 'daily', date: '2026-09-24', basis_time_zone: 'Asia/Shanghai' },
  })), 1);
  assert.deepEqual(puts, [oldKey, newKey]);
  assert.equal(publisher.unsynced(), 1);
  assert.equal(await publisher.retry(), 0);
  assert.deepEqual(puts, [oldKey, newKey, oldKey]);
});

test('queued revisions publish only the latest Reading once and never implicitly retry it', async () => {
  const puts = [];
  const publisher = createRiJingActivityPublisher({
    activity: { async put(input) {
      puts.push(input.revision);
      throw new Error('temporary service failure');
    } },
    copy: () => getProductCopy('zh'),
  });
  const older = dailyReading();
  const newer = dailyReading({ id: 'r_newer', created_at: '2026-09-23T02:00:00Z' });
  await Promise.all([publisher.publish(older), publisher.publish(newer)]);
  assert.deepEqual(puts, [Math.floor(Date.parse(newer.created_at) / 1000)]);
  await publisher.publish(older);
  await publisher.publish(newer);
  assert.equal(puts.length, 1, 'older or identical pending revisions do not trigger retries');
  await publisher.retry();
  assert.equal(puts.length, 2);
});
