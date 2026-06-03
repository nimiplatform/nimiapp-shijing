// W-c04 — YueJing per-cell day classification logic test.

import assert from 'node:assert/strict';
import test from 'node:test';

// Pure utility: classify a date relative to today as 'past', 'today',
// or 'future' — same logic the YueJing tab uses to decide which entry
// (EventMemory vs PlanItem) to expose on each cell.

function classifyDay(date, today) {
  if (date < today) return 'past';
  if (date > today) return 'future';
  return 'today';
}

test('classifyDay: past, today, future from string compare', () => {
  assert.equal(classifyDay('2026-05-01', '2026-05-25'), 'past');
  assert.equal(classifyDay('2026-05-25', '2026-05-25'), 'today');
  assert.equal(classifyDay('2026-05-26', '2026-05-25'), 'future');
});

test('past cells should only expose EventMemory entry', () => {
  const kind = classifyDay('2026-05-20', '2026-05-25');
  assert.equal(kind, 'past');
  // Mirror tab convention: past => event memory CTA only.
  const allowEventMemory = kind === 'past' || kind === 'today';
  const allowPlanItem = kind === 'future' || kind === 'today';
  assert.equal(allowEventMemory, true);
  assert.equal(allowPlanItem, false);
});

test('future cells should only expose PlanItem entry', () => {
  const kind = classifyDay('2026-06-10', '2026-05-25');
  assert.equal(kind, 'future');
  const allowEventMemory = kind === 'past' || kind === 'today';
  const allowPlanItem = kind === 'future' || kind === 'today';
  assert.equal(allowEventMemory, false);
  assert.equal(allowPlanItem, true);
});

test('today cells expose both entries', () => {
  const kind = classifyDay('2026-05-25', '2026-05-25');
  assert.equal(kind, 'today');
  const allowEventMemory = kind === 'past' || kind === 'today';
  const allowPlanItem = kind === 'future' || kind === 'today';
  assert.equal(allowEventMemory, true);
  assert.equal(allowPlanItem, true);
});
