import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function readProjectFile(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function stripJsComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

function stripCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function cssBlockFromSource(source, selector) {
  const blocks = [];
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const selectorList = match[1].split(',').map((item) => item.trim());
    if (selectorList.includes(selector)) {
      blocks.push(match[2]);
    }
  }
  return blocks.join('\n');
}

function cssBlock(source, selector) {
  const block = cssBlockFromSource(source, selector);
  assert.notEqual(block, '', `Missing CSS selector: ${selector}`);
  return block;
}

const tabSources = {
  rijing: stripJsComments(readProjectFile('src/product/tabs/rijing-tab.tsx')),
  yuejing: stripJsComments(readProjectFile('src/product/tabs/yuejing-tab.tsx')),
  nianjing: stripJsComments(readProjectFile('src/product/tabs/nianjing-tab.tsx')),
  mingjing: stripJsComments(readProjectFile('src/product/tabs/mingjing-tab.tsx')),
  shijing: stripJsComments(readProjectFile('src/product/tabs/shijing-tab.tsx')),
};

function mirrorHeaderCall(source) {
  const start = source.indexOf('<MirrorPageHeader');
  assert.notEqual(start, -1, 'MirrorPageHeader call exists');
  const endings = ['\n      />', '\n    />'];
  const match = endings
    .map((closing) => ({ closing, index: source.indexOf(closing, start) }))
    .filter((candidate) => candidate.index !== -1)
    .sort((a, b) => a.index - b.index)[0];
  assert.ok(match, 'MirrorPageHeader call closes on its own line');
  return source.slice(start, match.index + match.closing.length);
}

test('RiJing, YueJing, NianJing, and MingJing render the shared month-style page header', () => {
  for (const mirror of ['rijing', 'yuejing', 'nianjing', 'mingjing']) {
    const source = tabSources[mirror];
    assert.match(
      source,
      /import \{ MirrorPageHeader \} from '\.\/shared\/mirror-page-header\.tsx';/,
      `${mirror} imports the shared mirror page header`,
    );
    assert.match(source, /<MirrorPageHeader\b/, `${mirror} renders MirrorPageHeader`);
  }

  assert.doesNotMatch(tabSources.yuejing, /function YueJingHeaderStrip\b/);
  assert.doesNotMatch(tabSources.nianjing, /function NianJingHeaderStrip\b/);
  assert.doesNotMatch(tabSources.rijing, /<header className="shijing-rijing__header">/);
});

test('RiJing, YueJing, and NianJing use the shared header action slot', () => {
  for (const mirror of ['rijing', 'yuejing', 'nianjing']) {
    assert.match(
      mirrorHeaderCall(tabSources[mirror]),
      /actions=\{\(/,
      `${mirror} routes primary controls through MirrorPageHeader actions`,
    );
  }
  assert.doesNotMatch(
    mirrorHeaderCall(tabSources.mingjing),
    /actions=\{\(/,
    'mingjing delegates method switching to the global topbar',
  );

  const rijingHero = stripJsComments(
    readProjectFile('src/product/tabs/rijing/rijing-hero.tsx'),
  );
  assert.match(mirrorHeaderCall(tabSources.rijing), /className="shijing-rijing__generate"/);
  assert.doesNotMatch(rijingHero, /shijing-rijing__hero-refresh/);
});

test('ShiJing keeps its distinct consultation header logic', () => {
  assert.doesNotMatch(tabSources.shijing, /MirrorPageHeader/);
});

test('shared MirrorPageHeader component owns the reusable title anatomy', () => {
  const componentUrl = new URL(
    '../src/product/tabs/shared/mirror-page-header.tsx',
    import.meta.url,
  );
  assert.equal(existsSync(componentUrl), true, 'shared MirrorPageHeader component exists');

  const source = stripJsComments(readFileSync(componentUrl, 'utf8'));
  assert.match(source, /export function MirrorPageHeader\b/);
  assert.match(source, /className="shijing-mirror-header"/);
  assert.match(source, /className="shijing-mirror-header__titles"/);
  assert.match(source, /className="shijing-mirror-header__meta"/);
  assert.match(source, /className="shijing-mirror-header__actions"/);
});

test('shared header stylesheet owns the title typography and responsive layout', () => {
  const stylesheetUrl = new URL('../src/styles-mirror-header.css', import.meta.url);
  assert.equal(existsSync(stylesheetUrl), true, 'shared mirror header stylesheet exists');

  const imports = readProjectFile('src/styles.css');
  assert.match(imports, /@import '\.\/styles-mirror-header\.css';/);

  const styles = stripCssComments(readFileSync(stylesheetUrl, 'utf8'));
  const root = cssBlock(styles, '.shijing-mirror-header');
  const titles = cssBlock(styles, '.shijing-mirror-header__titles');
  const title = cssBlock(styles, '.shijing-mirror-header__titles h1');
  const meta = cssBlock(styles, '.shijing-mirror-header__meta');
  const actions = cssBlock(styles, '.shijing-mirror-header__actions');

  assert.match(root, /grid-template-columns:\s*1fr auto/);
  assert.match(titles, /align-items:\s*baseline/);
  assert.match(title, /font-size:\s*32px/);
  assert.match(title, /letter-spacing:\s*0\.04em/);
  assert.match(title, /margin:\s*0/);
  assert.match(meta, /white-space:\s*nowrap/);
  assert.match(actions, /align-items:\s*flex-end/);
});
