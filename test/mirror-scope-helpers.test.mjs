import assert from 'node:assert/strict';
import test from 'node:test';
import { dailyMirrorScopeForToday, rolling30DayMirrorScopeFromToday, longHorizonMirrorScopeNextTenYears, natalMirrorScopeForToday, relationshipNatalMirrorScopeForToday } from '../src/product/tabs/mirror-scope-helpers.ts';

test('daily and rolling scopes use their basis time zone across UTC midnight', () => {
  const now = new Date('2026-09-07T16:30:00Z');
  assert.equal(dailyMirrorScopeForToday(now, 'Asia/Shanghai').date, '2026-09-08');
  assert.equal(dailyMirrorScopeForToday(now, 'America/Los_Angeles').date, '2026-09-07');
  assert.deepEqual(rolling30DayMirrorScopeFromToday(now, 'Asia/Shanghai'), {
    kind: 'rolling_30_day', start_date: '2026-09-08', end_date: '2026-10-07', basis_time_zone: 'Asia/Shanghai',
  });
});

test('year anchors follow the same basis-zone civil date', () => {
  const now = new Date('2026-12-31T16:30:00Z');
  assert.equal(longHorizonMirrorScopeNextTenYears(now, 'Asia/Shanghai').start_date, '2027-01-01');
  assert.equal(natalMirrorScopeForToday(now, 'Asia/Shanghai').anchor_year, 2027);
  assert.equal(relationshipNatalMirrorScopeForToday({ kind: 'person', id: 'test-person' }, now, 'Asia/Shanghai').anchor_year, 2027);
  assert.equal(natalMirrorScopeForToday(now, 'America/Los_Angeles').anchor_year, 2026);
});
