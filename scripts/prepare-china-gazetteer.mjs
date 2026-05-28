// One-shot data prep: turn Sanotsu/regional-coordinates-of-China's flat
// 4-level coords JSON into a compact 3-level (省/市/区) gazetteer that the
// renderer can import directly. Run with `node scripts/prepare-china-gazetteer.mjs`.
//
// Input  : scripts/_tmp/pcas-coords.json (download from
//          https://raw.githubusercontent.com/Sanotsu/regional-coordinates-of-China/master/pcas-data/pcas-code-with-coordinates.json)
// Output : src/product/inputs/china-gazetteer.data.json
//
// Coordinate note: source uses Baidu BD-09. We pass through untouched.
// The diff from WGS-84 within China is < 0.012° ≈ 1 km, which translates
// to < 0.05 minutes of true-solar-time correction — far below any 时柱
// boundary risk.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const inputPath = resolve(repoRoot, 'scripts/_tmp/pcas-coords.json');
const outputPath = resolve(repoRoot, 'src/product/inputs/china-gazetteer.data.json');

const raw = JSON.parse(readFileSync(inputPath, 'utf8'));

const round4 = (n) => Math.round(n * 10000) / 10000;

const records = [];
for (const r of raw) {
  if (r.level < 1 || r.level > 3) continue;
  if (typeof r.lng !== 'number' || typeof r.lat !== 'number') continue;
  // mergeName for level-1 is "北京市,北京市" — collapse duplicate.
  let path = r.mergeName.split(',');
  while (path.length >= 2 && path[path.length - 1] === path[path.length - 2]) path.pop();
  // 市辖区 is a statistical placeholder, never a real place name. Drop both
  // standalone level-2 rows AND any 市辖区 segment in level-3 paths.
  if (r.level === 2 && r.name === '市辖区') continue;
  path = path.filter((segment) => segment !== '市辖区');
  if (path.length === 0) continue;
  records.push({
    n: r.name,
    p: path.join(','),
    l: r.level,
    lng: round4(r.lng),
    lat: round4(r.lat),
  });
}

records.sort((a, b) => (a.p < b.p ? -1 : a.p > b.p ? 1 : 0));

const out = {
  source: 'Sanotsu/regional-coordinates-of-China (BD-09)',
  generated_at: new Date().toISOString().slice(0, 10),
  record_count: records.length,
  schema: { n: 'leaf name', p: 'full path comma-separated', l: 'level 1-3', lng: 'BD-09 longitude', lat: 'BD-09 latitude' },
  records,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(out), 'utf8');

const byLevel = records.reduce((acc, r) => ((acc[r.l] = (acc[r.l] || 0) + 1), acc), {});
const sizeKB = (Buffer.byteLength(JSON.stringify(out), 'utf8') / 1024).toFixed(1);
console.log(`Wrote ${records.length} records (${sizeKB} KB) to ${outputPath}`);
console.log(`Breakdown by level:`, byLevel);
