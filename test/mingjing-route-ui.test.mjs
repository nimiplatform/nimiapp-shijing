import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const mingjingTabSource = readFileSync(
  new URL('../src/product/tabs/mingjing-tab.tsx', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

test('MingJingTab is a route shell instead of owning BaZi route modules directly', () => {
  assert.match(
    mingjingTabSource,
    /import \{ BaziMingJingRoute \} from '\.\/mingjing\/bazi-mingjing-route\.tsx';/u,
  );
  assert.match(
    mingjingTabSource,
    /import \{ MingJingRouteUnavailable \} from '\.\/mingjing\/mingjing-route-unavailable\.tsx';/u,
  );

  assert.doesNotMatch(mingjingTabSource, /from '\.\/mingjing\/mingjing-hero\.tsx'/u);
  assert.doesNotMatch(mingjingTabSource, /from '\.\/mingjing\/mingjing-paipan\.tsx'/u);
  assert.doesNotMatch(mingjingTabSource, /from '\.\/mingjing\/mingjing-dayun\.tsx'/u);
  assert.doesNotMatch(mingjingTabSource, /from '\.\/mingjing\/mingjing-liunian\.tsx'/u);
  assert.doesNotMatch(mingjingTabSource, /from '\.\/mingjing\/mingjing-events\.tsx'/u);
});

test('MingJing route components exist as separate implementation units', () => {
  assert.equal(
    existsSync(new URL('../src/product/tabs/mingjing/bazi-mingjing-route.tsx', import.meta.url)),
    true,
  );
  assert.equal(
    existsSync(new URL('../src/product/tabs/mingjing/ziwei-mingjing-route.tsx', import.meta.url)),
    true,
  );
  assert.equal(
    existsSync(new URL('../src/product/tabs/mingjing/mingjing-route-unavailable.tsx', import.meta.url)),
    true,
  );
});
