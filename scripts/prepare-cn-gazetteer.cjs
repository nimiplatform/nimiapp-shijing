// Reproducible build of the bundled county-level CN gazetteer.
//
// Source: the committed snapshot of Sanotsu/regional-coordinates-of-China
// (BD-09; <1 km from WGS-84 — negligible for 时柱 true-solar-time). Run:
//
//   git show 7887c04:src/product/inputs/china-gazetteer.data.json > scripts/_cn-raw.json
//   node scripts/prepare-cn-gazetteer.cjs
//
// Output: src/product/natal/cn-gazetteer.data.json
//   shape { n: leaf, r: province ("" for municipalities), lat, lng, l: 1|2|3 }
//
// Cleaning:
//   • drop administrative placeholder names (市辖区 / 县 / 省直辖… )
//   • drop rows without finite coordinates
//   • dedupe by name+coordinates, KEEPING the highest admin level — this
//     collapses the municipality double-listing (北京市 appears as both 省级
//     and 市级) so a search for 北京 yields one 北京市 (level 1).

const fs = require('node:fs');
const path = require('node:path');

const RAW = path.resolve(__dirname, '_cn-raw.json');
const OUT = path.resolve(__dirname, '../src/product/natal/cn-gazetteer.data.json');
const NOISE = new Set(['市辖区', '县', '省直辖县级行政区划', '自治区直辖县级行政区划']);
const round = (n) => Math.round(n * 10000) / 10000;

const records = JSON.parse(fs.readFileSync(RAW, 'utf8')).records;

// name|lat|lng → best record (lowest l number = highest admin level)
const best = new Map();
for (const r of records) {
  if (r.l < 1 || r.l > 3) continue;
  if (NOISE.has(r.n)) continue;
  if (typeof r.lat !== 'number' || typeof r.lng !== 'number') continue;
  if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
  const lat = round(r.lat);
  const lng = round(r.lng);
  const province = r.l === 1 ? '' : r.p.split(',')[0];
  const key = `${r.n}|${lat}|${lng}`;
  const prev = best.get(key);
  if (!prev || r.l < prev.l) best.set(key, { n: r.n, r: province, lat, lng, l: r.l });
}

const out = [...best.values()];
// Higher admin level first (北京市 > a 北京 district), then by name.
out.sort((a, b) => a.l - b.l || a.n.localeCompare(b.n, 'zh'));

fs.writeFileSync(OUT, JSON.stringify(out));

const byL = {};
for (const r of out) byL[r.l] = (byL[r.l] || 0) + 1;
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
process.stdout.write(`Wrote ${out.length} records (${kb} KB). By level: ${JSON.stringify(byL)}\n`);
