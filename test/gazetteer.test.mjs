// Tests for the bundled place gazetteer search (county-level CN + overseas).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { searchGazetteer, fullPlaceName } from '../src/product/natal/gazetteer.ts';

test('searchGazetteer matches a provincial capital with coordinates + tz', () => {
  const hits = searchGazetteer('广州');
  assert.ok(hits.length >= 1);
  const top = hits[0].entry;
  assert.ok(top.name.startsWith('广州'));
  assert.equal(top.tz, 'Asia/Shanghai');
  assert.ok(Math.abs(top.lat - 23.13) < 0.5);
  assert.ok(Math.abs(top.lng - 113.26) < 0.5);
});

test('searchGazetteer covers county-level localities with correct province + coordinates', () => {
  // 昆山市 — county-level city under 苏州, 江苏省 (~31.39°N, 120.98°E).
  const ks = searchGazetteer('昆山').find((c) => c.entry.name === '昆山市');
  assert.ok(ks, '昆山市 should be present');
  assert.equal(ks.entry.region, '江苏省');
  assert.equal(ks.entry.tz, 'Asia/Shanghai');
  assert.ok(Math.abs(ks.entry.lat - 31.39) < 0.3, 'latitude should be plausible');
  assert.ok(Math.abs(ks.entry.lng - 120.98) < 0.3, 'longitude should be plausible');

  // 钟祥市 — county-level city in 湖北省 (~31.17°N, 112.59°E).
  const zx = searchGazetteer('钟祥').find((c) => c.entry.name === '钟祥市');
  assert.ok(zx, '钟祥市 should be present');
  assert.equal(zx.entry.region, '湖北省');
  assert.ok(Math.abs(zx.entry.lat - 31.17) < 0.3);
  assert.ok(Math.abs(zx.entry.lng - 112.59) < 0.3);
});

test('province-prefixed query matches a county', () => {
  assert.ok(searchGazetteer('江苏昆山').some((c) => c.entry.name === '昆山市'));
});

test('higher administrative levels rank ahead of districts', () => {
  // 北京市 (province-level municipality) should outrank any 北京 sub-district.
  assert.equal(searchGazetteer('北京')[0].entry.name, '北京市');
});

test('overseas cities match pinyin / english aliases (case-insensitive)', () => {
  assert.ok(searchGazetteer('new york').some((c) => c.entry.id === 'newyork'));
  assert.equal(searchGazetteer('纽约')[0].entry.tz, 'America/New_York');
});

test('HK / Macau / Taiwan carry their own IANA zone', () => {
  assert.ok(searchGazetteer('香港').some((c) => c.entry.tz === 'Asia/Hong_Kong'));
  assert.ok(searchGazetteer('台北').some((c) => c.entry.tz === 'Asia/Taipei'));
});

test('searchGazetteer returns nothing for blank or unknown input', () => {
  assert.equal(searchGazetteer('   ').length, 0);
  assert.equal(searchGazetteer('zzzznowhere').length, 0);
});

test('fullPlaceName combines region and locality without duplication', () => {
  assert.equal(
    fullPlaceName({ id: 'x', name: '钟祥市', region: '湖北省', lat: 0, lng: 0, tz: 'Asia/Shanghai' }),
    '湖北省钟祥市',
  );
  assert.equal(
    fullPlaceName({ id: 'x', name: '北京市', region: '', lat: 0, lng: 0, tz: 'Asia/Shanghai' }),
    '北京市',
  );
});
