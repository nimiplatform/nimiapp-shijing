import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mingjingCssFiles, readCssBundle, sharedPrimitiveCssFiles } from './css-bundles.mjs';
import { readI18nSource } from './i18n-source.mjs';

const mingjingStyles = readCssBundle(mingjingCssFiles).replace(/\/\*[\s\S]*?\*\//g, '');

const mirrorV1Styles = readFileSync(
  new URL('../src/styles-mirror-v1.css', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

const mirrorHeaderStyles = readFileSync(
  new URL('../src/styles-mirror-header.css', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

const sharedSurfaceStyles = readCssBundle(sharedPrimitiveCssFiles).replace(/\/\*[\s\S]*?\*\//g, '');

const mingjingTabSource = readFileSync(
  new URL('../src/product/tabs/mingjing-tab.tsx', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

const baziMingjingRouteSource = readFileSync(
  new URL('../src/product/tabs/mingjing/bazi-mingjing-route.tsx', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

const mingjingPaipanSource = readFileSync(
  new URL('../src/product/tabs/mingjing/mingjing-paipan.tsx', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

const mingjingDayunSource = readFileSync(
  new URL('../src/product/tabs/mingjing/mingjing-dayun.tsx', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

const i18nCopySource = readI18nSource();

function cssBlockFrom(source, selector) {
  const blocks = [];
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const selectorList = match[1].split(',').map((item) => item.trim());
    if (selectorList.includes(selector)) {
      blocks.push(match[2]);
    }
  }
  return blocks.join('\n');
}

function cssBlock(selector) {
  return cssBlockFrom(mingjingStyles, selector);
}

function sharedCssBlock(selector) {
  return cssBlockFrom(sharedSurfaceStyles, selector);
}

function mirrorHeaderCssBlock(selector) {
  return cssBlockFrom(mirrorHeaderStyles, selector);
}

test('MingJing root uses the full shell surface instead of a centered boxed frame', () => {
  const root = cssBlock('.shijing-mingjing');

  assert.match(root, /width:\s*100%/);
  assert.doesNotMatch(root, /max-width:\s*1080px/);
  assert.doesNotMatch(root, /margin-inline:\s*auto/);
});

test('MingJing content width matches the NianJing page width', () => {
  const nianjingBase = cssBlockFrom(mirrorV1Styles, '.shijing-tab');
  const root = cssBlock('.shijing-mingjing');
  const content = cssBlock('.shijing-mingjing > .shijing-mirror-header');

  assert.match(nianjingBase, /max-width:\s*920px/);
  assert.match(root, /--mingjing-page-max:\s*920px/);
  assert.match(content, /max-width:\s*var\(--mingjing-page-max\)/);
});

test('MingJing direct content blocks use border-box sizing to avoid mobile overflow', () => {
  const hero = cssBlock('.shijing-mingjing > .shijing-mj-hero');
  const panels = cssBlock('.shijing-mingjing > .shijing-mingjing__panels');

  assert.match(hero, /box-sizing:\s*border-box/);
  assert.match(panels, /box-sizing:\s*border-box/);
});

test('MingJing projection panels are stacked as full-width reading modules', () => {
  const panels = cssBlock('.shijing-mingjing__panels');

  assert.match(panels, /display:\s*flex/);
  assert.match(panels, /flex-direction:\s*column/);
  assert.match(panels, /gap:\s*24px/);
});

test('MingJing uses the reference-style pastel shell and transparent chrome', () => {
  const shell = cssBlock('.shijing-shell[data-active-tab="mingjing"]');
  const topbar = sharedCssBlock('.shijing-shell[data-active-tab="mingjing"] .shijing-topbar');

  assert.match(shell, /linear-gradient\(115deg,\s*#e8f7f2\s+0%,\s*#f7fbfd\s+48%,\s*#f4f0fb\s+100%\)/);
  assert.match(topbar, /background:\s*transparent/);
  assert.match(topbar, /backdrop-filter:\s*none/);
  assert.match(topbar, /border-bottom-color:\s*var\(--shijing-surface-topbar-border\)/);
});

test('MingJing root exposes RiJing-style glass card tokens', () => {
  const root = cssBlock('.shijing-mingjing');

  assert.match(root, /--mingjing-accent:\s*var\(--nimi-action-primary-bg,\s*#4ECCA3\)/);
  assert.match(root, /--mingjing-glass-thick-bg:\s*var\(--nimi-material-glass-thick-bg,\s*rgba\(255,\s*255,\s*255,\s*0\.70\)\)/);
  assert.match(root, /--mingjing-card-bg:\s*rgba\(255,\s*255,\s*255,\s*0\.62\)/);
  assert.match(root, /--mingjing-font-sans:\s*"PingFang SC"/);
});

test('MingJing hero typography stays compact while paipan typography changes below it', () => {
  const eyebrow = cssBlock('.shijing-mingjing .shijing-mj-hero__eyebrow');
  const title = cssBlock('.shijing-mingjing .shijing-mj-hero__title');
  const summary = cssBlock('.shijing-mingjing .shijing-mj-hero__summary');
  const persona = cssBlock('.shijing-mingjing .shijing-mj-hero__persona');
  const panelTitle = cssBlock('.shijing-mingjing .shijing-mj-hero__favor-title');
  const chip = cssBlock('.shijing-mingjing .shijing-mj-hero__chip');
  const stagePillar = cssBlock('.shijing-mingjing .shijing-mj-hero__stage-pillar');
  const cta = cssBlock('.shijing-mingjing .shijing-mj-hero__cta');

  assert.match(eyebrow, /font-size:\s*12px/);
  assert.match(eyebrow, /font-weight:\s*700/);
  assert.match(title, /font-size:\s*66px/);
  assert.match(title, /font-weight:\s*650/);
  assert.match(summary, /font-size:\s*15px/);
  assert.match(summary, /font-weight:\s*600/);
  assert.match(persona, /font-size:\s*14\.5px/);
  assert.doesNotMatch(persona, /font-weight:\s*650/);
  assert.match(panelTitle, /font-size:\s*12\.5px/);
  assert.match(panelTitle, /font-weight:\s*600/);
  assert.match(chip, /font-size:\s*16px/);
  assert.match(chip, /font-weight:\s*650/);
  assert.match(stagePillar, /font-size:\s*22px/);
  assert.match(stagePillar, /font-weight:\s*700/);
  assert.match(cta, /font-size:\s*13\.5px/);
  assert.match(cta, /font-weight:\s*600/);
});

test('MingJing panels use translucent glass cards instead of opaque product cards', () => {
  const panel = cssBlock('.shijing-mingjing-panel');

  assert.match(panel, /background:\s*var\(--mingjing-card-bg\)/);
  assert.match(panel, /border:\s*1px\s+solid\s+var\(--mingjing-card-border\)/);
  assert.match(panel, /box-shadow:\s*var\(--mingjing-card-shadow\)/);
  assert.match(panel, /backdrop-filter:\s*blur\(var\(--mingjing-blur\)\)\s+saturate\(120%\)/);
});

test('MingJing bazi chart keeps complete paipan collapsed until the toggle is clicked', () => {
  assert.match(mingjingPaipanSource, /useState\(false\)/u);
  assert.doesNotMatch(mingjingPaipanSource, /useState\(true\)/u);
  assert.match(mingjingPaipanSource, /MingJingFiveElements/u);
  assert.match(mingjingPaipanSource, /shijing-paipan__toggle/u);
  assert.match(mingjingPaipanSource, /aria-expanded=\{expanded\}/u);
  assert.match(mingjingPaipanSource, /expanded \? m\.collapse : m\.expand/u);
  assert.match(mingjingPaipanSource, /shijing-paipan__detail/u);
});

test('MingJing bazi chart keeps the visible four-pillar natal chart above five elements', () => {
  assert.match(mingjingPaipanSource, /shijing-paipan__head/u);
  assert.match(mingjingPaipanSource, /\{m\.sectionTitle\}/u);
  assert.match(mingjingPaipanSource, /\{m\.sectionIntro\}/u);
  assert.match(mingjingPaipanSource, /shijing-paipan__pillar-grid/u);
  assert.match(mingjingPaipanSource, /shijing-paipan__pillar-card/u);
  assert.match(mingjingPaipanSource, /shijing-paipan__day-badge/u);
  assert.match(mingjingPaipanSource, /shijing-paipan__glyphs/u);
  assert.match(mingjingPaipanSource, /shijing-paipan__ten-god/u);
  assert.match(
    mingjingPaipanSource,
    /<MingJingPillarCards columns=\{columns\} copy=\{m\} \/>[\s\S]*<MingJingFiveElements/u,
  );

  const grid = cssBlock('.shijing-paipan__pillar-grid');
  const card = cssBlock('.shijing-paipan__pillar-card');
  const dayCard = cssBlock('.shijing-paipan__pillar-card[data-daymaster]');

  assert.match(grid, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(card, /min-height:\s*224px/);
  assert.match(dayCard, /border-color:\s*rgba\(78,\s*204,\s*163,\s*0\.48\)/);
});

test('MingJing paipan keeps the compact product panel frame around the chart controls', () => {
  assert.match(
    mingjingPaipanSource,
    /<section className="shijing-mingjing-paipan"[\s\S]*<MingJingPillarCards[\s\S]*<MingJingFiveElements[\s\S]*className="shijing-paipan__toggle"[\s\S]*className="shijing-paipan__detail"/u,
  );

  const paipan = cssBlock('.shijing-mingjing-paipan');

  assert.match(paipan, /padding:\s*28px\s+clamp\(20px,\s*3vw,\s*32px\)\s+30px/);
  assert.match(paipan, /border-radius:\s*18px/);
  assert.match(paipan, /background:\s*var\(--mingjing-card-bg\)/);
  assert.match(paipan, /box-shadow:\s*var\(--mingjing-card-shadow\)/);
});

test('MingJing paipan typography stays in the compact product-panel hierarchy', () => {
  const title = cssBlock('.shijing-paipan__title');
  const intro = cssBlock('.shijing-paipan__intro');
  const role = cssBlock('.shijing-paipan__pillar-role');
  const glyphs = cssBlock('.shijing-paipan__glyphs');
  const tenGod = cssBlock('.shijing-paipan__ten-god');
  const fiveTitle = cssBlock('.shijing-mingjing-five__title');
  const fiveSummary = cssBlock('.shijing-mingjing-five__summary');
  const fiveCount = cssBlock('.shijing-mingjing-five__count');
  const fiveLabel = cssBlock('.shijing-mingjing-five__label');
  const detailTitle = cssBlock('.shijing-mingjing .shijing-paipan__detail-title');
  const tableCells = cssBlock('.shijing-paipan__table th');

  assert.match(title, /font-size:\s*18px/);
  assert.match(title, /font-weight:\s*700/);
  assert.match(intro, /font-size:\s*16px/);
  assert.match(intro, /font-weight:\s*650/);
  assert.match(role, /font-size:\s*15px/);
  assert.match(role, /font-weight:\s*750/);
  assert.match(glyphs, /font-size:\s*52px/);
  assert.match(glyphs, /font-weight:\s*650/);
  assert.match(tenGod, /font-size:\s*15px/);
  assert.match(tenGod, /font-weight:\s*700/);
  assert.match(fiveTitle, /font-size:\s*16px/);
  assert.match(fiveTitle, /font-weight:\s*750/);
  assert.match(fiveSummary, /font-size:\s*15px/);
  assert.match(fiveSummary, /font-weight:\s*650/);
  assert.match(fiveCount, /font-size:\s*14px/);
  assert.match(fiveCount, /font-weight:\s*700/);
  assert.match(fiveLabel, /font-size:\s*22px/);
  assert.match(detailTitle, /font-size:\s*13px/);
  assert.match(detailTitle, /font-weight:\s*700/);
  assert.match(tableCells, /font-size:\s*14px/);
  assert.match(tableCells, /font-weight:\s*600/);
});

test('MingJing ready state keeps the page title above the archetype card', () => {
  assert.match(
    mingjingTabSource,
    /\)\s*:\s*\(\s*<>\s*<MingJingSimpleHeader\s+copy=\{m\}\s*\/>\s*\{projection\.value\.kind === 'bazi_ziping_v1'/u,
  );
  assert.match(
    baziMingjingRouteSource,
    /return \(\s*<>\s*<MingJingHero/u,
  );
});

test('MingJing page title uses the same shared header position and scale as YueJing', () => {
  assert.match(mingjingTabSource, /import \{ MirrorPageHeader \} from '\.\/shared\/mirror-page-header\.tsx';/u);
  assert.doesNotMatch(mingjingTabSource, /shijing-mingjing__eyebrow/u);
  assert.doesNotMatch(mingjingTabSource, /shijing-mingjing__subtitle/u);
  assert.doesNotMatch(mingjingTabSource, /<header className="shijing-mingjing__hero">/u);
  assert.doesNotMatch(mingjingTabSource, /className="shijing-mingjing__title"/u);

  const header = cssBlock('.shijing-mingjing > .shijing-mirror-header');
  const title = mirrorHeaderCssBlock('.shijing-mirror-header__titles h1');

  assert.match(header, /max-width:\s*var\(--mingjing-page-max\)/);
  assert.match(header, /margin-inline:\s*auto/);
  assert.match(title, /font-size:\s*32px/);
  assert.match(title, /font-weight:\s*600/);
  assert.match(title, /letter-spacing:\s*0\.04em/);
  assert.doesNotMatch(title, /clamp\(34px,\s*4vw,\s*48px\)/);
});

test('MingJing title bar delegates method switching to the global topbar', () => {
  assert.doesNotMatch(mingjingTabSource, /MethodProfileSelect/u);
  assert.doesNotMatch(mingjingTabSource, /commitMethodProfile/u);
  assert.doesNotMatch(mingjingTabSource, /handleMethodProfileChange/u);
  assert.doesNotMatch(mingjingTabSource, /mingjing-method-profile/u);
  assert.match(mingjingTabSource, /<MirrorPageHeader[\s\S]*title=\{copy\.title\}/u);
  assert.doesNotMatch(mingjingTabSource, /actions=\{\(/u);
});

test('MingJing full paipan keeps the expert table behind the toggle', () => {
  assert.match(mingjingPaipanSource, /<table className="shijing-paipan__table"/u);
  assert.match(mingjingPaipanSource, /shijing-paipan__row-label/u);
  assert.match(mingjingPaipanSource, /shijing-paipan__summary-chip/u);
  assert.doesNotMatch(mingjingPaipanSource, /\{m\.title\}\s*·\s*\{m\.intro\}/u);

  const detail = cssBlock('.shijing-paipan__detail');
  const table = cssBlock('.shijing-paipan__table');
  const toggle = cssBlock('.shijing-mingjing .shijing-paipan__toggle');

  assert.match(detail, /border-top:\s*1px\s+dashed/);
  assert.match(table, /border-collapse:\s*collapse/);
  assert.match(toggle, /width:\s*fit-content/);
});

test('MingJing five-element balance stays compact inside the paipan module', () => {
  const five = cssBlock('.shijing-mingjing-five');
  const head = cssBlock('.shijing-mingjing-five__head');
  const summary = cssBlock('.shijing-mingjing-five__summary');
  const bars = cssBlock('.shijing-mingjing-five__bars');
  const value = cssBlock('.shijing-mingjing-five__value');
  const count = cssBlock('.shijing-mingjing-five__count');
  const label = cssBlock('.shijing-mingjing-five__label');

  assert.match(mingjingPaipanSource, /shijing-mingjing-five__summary/u);
  assert.match(five, /border-radius:\s*16px/);
  assert.match(five, /min-height:\s*198px/);
  assert.match(five, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.36\)/);
  assert.match(head, /grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)\s+auto/);
  assert.match(summary, /justify-self:\s*end/);
  assert.match(summary, /font-size:\s*15px/);
  assert.match(summary, /font-weight:\s*650/);
  assert.match(bars, /grid-template-columns:\s*repeat\(5,\s*minmax\(72px,\s*1fr\)\)/);
  assert.match(bars, /height:\s*118px/);
  assert.match(value, /width:\s*54px/);
  assert.match(value, /max-height:\s*82px/);
  assert.match(value, /border-radius:\s*9px/);
  assert.match(count, /font-size:\s*14px/);
  assert.match(count, /font-weight:\s*700/);
  assert.match(label, /font-size:\s*22px/);
});

test('MingJing dayun renders a complete professional matrix with only the current period expanded', () => {
  assert.match(mingjingDayunSource, /shijing-dayun__list/u);
  assert.match(mingjingDayunSource, /shijing-dayun__row/u);
  assert.match(mingjingDayunSource, /DISTANT_DAYUN_START_AGE\s*=\s*90/u);
  assert.match(mingjingDayunSource, /shijing-dayun__matrix-head/u);
  assert.match(mingjingDayunSource, /shijing-dayun__term-grid/u);
  assert.match(mingjingDayunSource, /data-distant=\{distant \? '' : undefined\}/u);
  assert.match(mingjingDayunSource, /period\.start_age >= DISTANT_DAYUN_START_AGE/u);
  assert.match(mingjingDayunSource, /d\.distantTitle/u);
  assert.match(mingjingDayunSource, /d\.distantDescription/u);
  assert.match(mingjingDayunSource, /const regularPeriods = distantStartIndex >= 0/u);
  assert.match(mingjingDayunSource, /const distantPeriods = distantStartIndex >= 0/u);
  assert.match(mingjingDayunSource, /<details className="shijing-dayun__distant-group">/u);
  assert.match(mingjingDayunSource, /<summary className="shijing-dayun__distant-toggle">/u);
  assert.match(mingjingDayunSource, /<ol className="shijing-dayun__distant-list">/u);
  assert.doesNotMatch(mingjingDayunSource, /<details className="shijing-dayun__distant-group" open/u);
  assert.doesNotMatch(mingjingDayunSource, /shijing-dayun__phase-band/u);
  assert.match(mingjingDayunSource, /useState<number \| null>\(currentStartYear\)/u);
  assert.match(mingjingDayunSource, /shijing-dayun__row-toggle/u);
  assert.match(mingjingDayunSource, /aria-expanded=\{expanded\}/u);
  assert.match(mingjingDayunSource, /shijing-dayun__stage-title/u);
  assert.match(mingjingDayunSource, /shijing-dayun__technical/u);
  assert.match(mingjingDayunSource, /shijing-dayun__explanation/u);
  assert.match(mingjingDayunSource, /d\.phaseTitle\(/u);
  assert.match(mingjingDayunSource, /d\.periodExplanation\(/u);

  const list = cssBlock('.shijing-dayun__list');
  const head = cssBlock('.shijing-dayun__matrix-head');
  const row = cssBlock('.shijing-dayun__row');
  const toggle = cssBlock('.shijing-dayun__row-toggle');
  const termGrid = cssBlock('.shijing-dayun__term-grid');
  const distantGroup = cssBlock('.shijing-dayun__distant-group');
  const distantToggle = cssBlock('.shijing-dayun__distant-toggle');
  const distantList = cssBlock('.shijing-dayun__distant-list');
  const explanation = cssBlock('.shijing-dayun__explanation');

  assert.match(list, /display:\s*flex/);
  assert.match(list, /flex-direction:\s*column/);
  assert.match(head, /display:\s*grid/);
  assert.match(head, /grid-template-columns:\s*minmax\(72px,\s*auto\)\s+minmax\(0,\s*1fr\)\s+minmax\(104px,\s*auto\)\s+auto/);
  assert.match(row, /border-left:\s*4px\s+solid\s+var\(--mj-nature/);
  assert.match(toggle, /grid-template-columns:\s*minmax\(72px,\s*auto\)\s+minmax\(0,\s*1fr\)\s+auto\s+auto/);
  assert.match(termGrid, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.doesNotMatch(mingjingStyles, /\.shijing-dayun__term-grid\s*\{\s*grid-template-columns:\s*1fr/s);
  assert.match(distantGroup, /border-top:\s*1px\s+dashed/);
  assert.match(distantToggle, /cursor:\s*pointer/);
  assert.match(distantToggle, /list-style:\s*none/);
  assert.match(distantList, /display:\s*flex/);
  assert.match(distantList, /flex-direction:\s*column/);
  assert.match(explanation, /border-top:\s*1px\s+solid\s+color-mix/);
});

test('MingJing dayun rows stay light by default and tint on hover', () => {
  const row = cssBlock('.shijing-dayun__row');
  const expanded = cssBlock('.shijing-dayun__row[data-expanded]');
  const hover = cssBlock('.shijing-dayun__row:hover');
  const toggle = cssBlock('.shijing-dayun__row-toggle');
  const toggleSkin = cssBlock('.shijing-dayun__row > .shijing-dayun__row-toggle');
  const hoverToggle = cssBlock('.shijing-dayun__row:hover .shijing-dayun__row-toggle');

  assert.match(row, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.78\)/);
  assert.match(row, /transition:\s*border-color\s+160ms\s+ease,\s*background\s+160ms\s+ease,\s*box-shadow\s+160ms\s+ease,\s*transform\s+160ms\s+ease/);
  assert.match(expanded, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.84\)/);
  assert.doesNotMatch(expanded, /linear-gradient\(180deg,\s*rgba\(236,\s*251,\s*245/u);
  assert.match(hover, /background:\s*color-mix\(in srgb,\s*var\(--mingjing-accent\)\s+10%,\s*rgba\(255,\s*255,\s*255,\s*0\.72\)\)/);
  assert.match(hover, /transform:\s*translateY\(-1px\)/);
  assert.match(toggle, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.88\)/);
  assert.match(toggleSkin, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.88\)/);
  assert.match(toggleSkin, /color:\s*inherit/);
  assert.match(hoverToggle, /background:\s*color-mix\(in srgb,\s*var\(--mingjing-accent\)\s+10%,\s*rgba\(255,\s*255,\s*255,\s*0\.72\)\)/);
  assert.doesNotMatch(hoverToggle, /var\(--mj-nature/u);
});

test('MingJing hover blocks use the same light green wash as RiJing concern frames', () => {
  const lightHover = /background:\s*color-mix\(in srgb,\s*var\(--mingjing-accent\)\s+10%,\s*rgba\(255,\s*255,\s*255,\s*0\.72\)\)/;

  for (const selector of [
    '.shijing-dayun__row:hover',
    '.shijing-dayun__row:hover .shijing-dayun__row-toggle',
    '.shijing-mingjing .shijing-ziwei-palace:hover',
    '.shijing-mingjing .shijing-paipan__toggle:hover',
    '.shijing-mingjing .shijing-mingjing-info__button:hover',
  ]) {
    assert.match(cssBlock(selector), lightHover, selector);
  }
});

test('MingJing liunian cards prioritize readable guidance before folded evidence', () => {
  const head = cssBlock('.shijing-liunian__card-head');
  const badge = cssBlock('.shijing-liunian__badge');
  const plain = cssBlock('.shijing-liunian__plain');
  const years = cssBlock('.shijing-liunian__years');
  const details = cssBlock('.shijing-liunian__details');
  const summary = cssBlock('.shijing-liunian__details > summary');
  const evidence = cssBlock('.shijing-liunian__evidence');

  assert.match(head, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
  assert.match(badge, /font-size:\s*13px/);
  assert.match(badge, /font-weight:\s*750/);
  assert.match(plain, /font-size:\s*15px/);
  assert.match(plain, /line-height:\s*1\.65/);
  assert.match(years, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(118px,\s*1fr\)\)/);
  assert.match(details, /border-top:\s*1px\s+dashed/);
  assert.match(summary, /cursor:\s*pointer/);
  assert.match(evidence, /margin-top:\s*10px/);
});

test('MingJing dayun copy puts product language before technical terms', () => {
  assert.match(i18nCopySource, /phaseTitle:\s*\(index,\s*current\)/u);
  assert.match(i18nCopySource, /sectionTitle:\s*'大运排布'/u);
  assert.match(i18nCopySource, /distantTitle:\s*'90岁以后 · 远期排盘'/u);
  assert.match(i18nCopySource, /不代表寿命判断/u);
  assert.match(i18nCopySource, /第\$\{index \+ 1\}步大运/u);
  assert.match(i18nCopySource, /currentPrefix:\s*'当前 · '/u);
  assert.doesNotMatch(i18nCopySource, /人生各阶段的起落/u);
  assert.doesNotMatch(i18nCopySource, /童年根基期/u);
});
