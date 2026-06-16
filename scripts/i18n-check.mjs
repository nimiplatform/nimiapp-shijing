#!/usr/bin/env node
/* global console, process */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_PATH = join(ROOT, 'scripts', 'i18n.config.json');

function flattenKeys(obj, prefix = '') {
  const result = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result.push(...flattenKeys(value, fullKey));
    } else {
      result.push(fullKey);
    }
  }
  return result;
}

function loadJson(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`i18n:check failed to parse ${filePath}: ${message}`);
    return null;
  }
}

function loadConfig() {
  const config = loadJson(CONFIG_PATH);
  if (!config) {
    console.error(`Missing or invalid i18n config: ${CONFIG_PATH}`);
    process.exit(1);
  }
  const supportedLocales = Array.isArray(config.supportedLocales)
    ? config.supportedLocales.filter((item) => typeof item === 'string' && item.trim().length > 0)
    : [];
  if (!supportedLocales.includes('en') || !supportedLocales.includes('zh')) {
    console.error('i18n config must include both "en" and "zh".');
    process.exit(1);
  }
  return { supportedLocales };
}

const { supportedLocales } = loadConfig();
const localesDir = join(ROOT, 'src', 'shell', 'locales');
const enBundle = loadJson(join(localesDir, 'en.json'));

if (!enBundle) {
  console.error('English shell locale bundle is missing.');
  process.exit(1);
}

const enKeys = new Set(flattenKeys(enBundle));
let missingTotal = 0;
let extraTotal = 0;

for (const locale of supportedLocales) {
  const bundle = loadJson(join(localesDir, `${locale}.json`));
  if (!bundle) {
    console.error(`Locale bundle is missing: ${locale}`);
    missingTotal += enKeys.size;
    continue;
  }
  const keys = new Set(flattenKeys(bundle));
  const missing = [...enKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !enKeys.has(key));
  missingTotal += missing.length;
  extraTotal += extra.length;

  if (missing.length > 0 || extra.length > 0) {
    console.error(`i18n:check ${locale}: missing=${missing.length} extra=${extra.length}`);
    for (const key of missing.slice(0, 40)) {
      console.error(`  missing ${key}`);
    }
    for (const key of extra.slice(0, 20)) {
      console.error(`  extra ${key}`);
    }
  } else {
    console.log(`i18n:check ${locale}: ${keys.size} keys`);
  }
}

if (missingTotal > 0 || extraTotal > 0) {
  console.error(`i18n:check failed: missing=${missingTotal} extra=${extraTotal}`);
  process.exit(1);
}

console.log('i18n:check passed');
