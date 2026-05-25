// SJG-DATA-10 (data-model-contract.md lines 328-354) — ShiJingCatalog
// loader integrity + yaml cross-check.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { loadShijingCatalog } from '../src/product/catalog/catalog-loader.ts';
import {
  VIEW_TEMPLATE_CATEGORIES,
  VIEW_TEMPLATE_ID_PATTERN,
} from '../src/domain/shijing-catalog.ts';
import { TIME_SCOPES } from '../src/domain/view.ts';

test('SJG-DATA-10: loadShijingCatalog returns at least one view template', () => {
  const catalog = loadShijingCatalog();
  assert.ok(catalog.view_templates.length > 0);
});

test('SJG-DATA-10: every template id matches VIEW_TEMPLATE_ID_PATTERN and is unique', () => {
  const catalog = loadShijingCatalog();
  const seen = new Set();
  for (const template of catalog.view_templates) {
    assert.match(template.id, VIEW_TEMPLATE_ID_PATTERN);
    assert.equal(seen.has(template.id), false, `duplicate id ${template.id}`);
    seen.add(template.id);
  }
});

test('SJG-DATA-10: every template carries a default_time_scope in TIME_SCOPES', () => {
  const catalog = loadShijingCatalog();
  for (const template of catalog.view_templates) {
    assert.equal(TIME_SCOPES.includes(template.default_time_scope), true);
  }
});

test('SJG-DATA-10: every template category is in VIEW_TEMPLATE_CATEGORIES', () => {
  const catalog = loadShijingCatalog();
  for (const template of catalog.view_templates) {
    assert.equal(VIEW_TEMPLATE_CATEGORIES.includes(template.category), true);
  }
});

test('SJG-DATA-10: every template recommended_subjects entry is "self" or "person"', () => {
  const catalog = loadShijingCatalog();
  for (const template of catalog.view_templates) {
    for (const pattern of template.recommended_subjects) {
      assert.ok(pattern === 'self' || pattern === 'person');
    }
  }
});

test('SJG-DATA-10: loadShijingCatalog returns a frozen catalog (shared product authority)', () => {
  const catalog = loadShijingCatalog();
  assert.equal(Object.isFrozen(catalog), true);
  assert.equal(Object.isFrozen(catalog.view_templates), true);
});

test('SJG-DATA-10: in-memory catalog matches the kernel yaml seed_templates exactly', () => {
  // Cross-check: the bundled JSON must list the same ids in the same
  // order as kernel/tables/view-template-catalog.yaml seed_templates.
  const yaml = readFileSync(
    new URL('../spec/kernel/tables/view-template-catalog.yaml', import.meta.url),
    'utf8',
  );
  const yamlIds = [];
  for (const line of yaml.split('\n')) {
    const match = line.match(/^\s+-\s+id:\s+(\S+)/);
    if (match) yamlIds.push(match[1]);
  }
  const catalog = loadShijingCatalog();
  const memIds = catalog.view_templates.map((template) => template.id);
  assert.deepEqual(memIds, yamlIds, `catalog drift: in-memory=${memIds.join(',')} yaml=${yamlIds.join(',')}`);
});
