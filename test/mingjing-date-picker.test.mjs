import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const eventDateSurfaces = [
  '../src/product/tabs/mingjing/mingjing-events.tsx',
  '../src/product/tabs/mingjing/mingjing-rectify.tsx',
];

test('MingJing event date entry uses the shared nimi-kit DatePicker', () => {
  for (const relativePath of eventDateSurfaces) {
    const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');

    assert.match(source, /import\s+\{\s*DatePicker\s*\}\s+from\s+['"]@nimiplatform\/kit\/ui['"]/u);
    assert.doesNotMatch(source, /<input\s+type=["']date["']/u);
  }
});
