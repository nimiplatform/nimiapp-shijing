import assert from 'node:assert/strict';
import test from 'node:test';
import { generateShijingTextCandidate, createShijingRuntimeAiClient } from '../src/shell/ai/shijing-runtime-ai.ts';
import { ShijingRuntimeStoragePersistenceClient } from '../src/shell/persistence/shijing-runtime-storage.ts';
import { validShiJingSpace } from './_fixtures.mjs';

// Deterministic owner fixtures exercise App lifetime behavior, not source
// admission or real inference. Product acceptance is recorded separately.
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('a completed candidate from an ended connection cannot become a new reading', async () => {
  const reply = deferred(), controller = new AbortController();
  const client = { ai: { text: { generateCandidate: () => reply.promise } } };
  const ai = createShijingRuntimeAiClient({ client, signal: controller.signal });
  const operation = ai.generate('rijing', { system_prompt: 'fixture', user_prompt: 'fixture' });
  controller.abort(); reply.resolve({ text: 'Late private interpretation', finishReason: 'stop' });
  const result = await operation;
  assert.equal(result.ok, false); assert.equal('output' in result, false);
  let calls = 0;
  await assert.rejects(generateShijingTextCandidate({ client: { ai: { text: { generateCandidate() { calls++; } } } }, signal: controller.signal, system: '', user: '' }), { name: 'AbortError' });
  assert.equal(calls, 0);
});

test('an ended save remains on its captured client and queued saves never start', async () => {
  const write = deferred(), controller = new AbortController(); let writes = 0;
  const client = { storage: { assets: { write() { writes++; return write.promise; } } } };
  const adapter = new ShijingRuntimeStoragePersistenceClient({ client, signal: controller.signal });
  const operation = adapter.save(validShiJingSpace()); controller.abort(); write.resolve();
  assert.equal((await operation).ok, false);
  assert.equal((await adapter.save(validShiJingSpace())).ok, false);
  assert.equal(writes, 1);
});

test('remote missing storage is empty while an interrupted read never becomes an empty space', async () => {
  const controller = new AbortController();
  const adapter = new ShijingRuntimeStoragePersistenceClient({ signal: controller.signal, client: { storage: { assets: {
    async read() { throw { reasonCode: 'APP_STORAGE_ENTRY_NOT_FOUND' }; },
  } } } });
  assert.deepEqual(await adapter.load(), { ok: true, snapshot: null });
  controller.abort();
  assert.equal((await adapter.load()).ok, false);
});
