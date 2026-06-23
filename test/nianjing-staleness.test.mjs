import assert from 'node:assert/strict';
import test from 'node:test';

import { nianjingFreshnessView } from '../src/product/tabs/nianjing/nianjing-staleness.ts';

test('NianJing stale feature snapshots fail closed instead of rendering old output', () => {
  const view = nianjingFreshnessView({
    stale: true,
    reason: 'feature_snapshot_hash_changed',
  });

  assert.equal(view.kind, 'stale');
  assert.equal(view.render_output, false);
  assert.equal(view.can_import_to_consultation, false);
  assert.match(view.message, /算法|输入|重新生成/);
});

test('NianJing fresh readings may render and be imported', () => {
  const view = nianjingFreshnessView({ stale: false });

  assert.deepEqual(view, {
    kind: 'fresh',
    render_output: true,
    can_import_to_consultation: true,
  });
});
