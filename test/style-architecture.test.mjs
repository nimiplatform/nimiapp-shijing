import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { settingsCssFiles } from './css-bundles.mjs';

function projectUrl(path) {
  return new URL(`../${path}`, import.meta.url);
}

function readProjectFile(path) {
  return readFileSync(projectUrl(path), 'utf8');
}

function lineCount(source) {
  return source.split(/\r?\n/u).length;
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
  const block = cssBlockFromSource(stripCssComments(source), selector);
  assert.notEqual(block, '', `Missing CSS selector: ${selector}`);
  return block;
}

const sharedPrimitiveFile = 'src/product/tabs/shared/mirror-primitives.css';

const featureCssFiles = [
  'src/product/tabs/rijing/rijing-shell.css',
  'src/product/tabs/rijing/rijing-onboarding.css',
  'src/product/tabs/rijing/rijing-hero.css',
  'src/product/tabs/rijing/rijing-day-rite.css',
  'src/product/tabs/rijing/rijing-projections.css',
  'src/product/tabs/rijing/rijing-event-input.css',
  'src/product/tabs/rijing/rijing-actions.css',
  'src/product/tabs/rijing/rijing-evidence.css',
  'src/product/tabs/rijing/rijing-responsive.css',
  'src/product/tabs/yuejing/yuejing-shell.css',
  'src/product/tabs/yuejing/yuejing-hero.css',
  'src/product/tabs/yuejing/yuejing-filters.css',
  'src/product/tabs/yuejing/yuejing-calendar.css',
  'src/product/tabs/yuejing/yuejing-panel-shell.css',
  'src/product/tabs/yuejing/yuejing-month-mainline.css',
  'src/product/tabs/yuejing/yuejing-month-windows.css',
  'src/product/tabs/yuejing/yuejing-month-timeline.css',
  'src/product/tabs/yuejing/yuejing-month-concerns.css',
  'src/product/tabs/yuejing/yuejing-month-closing.css',
  'src/product/tabs/yuejing/yuejing-day-panel.css',
  'src/product/tabs/yuejing/yuejing-concerns.css',
  'src/product/tabs/nianjing/nianjing-shell.css',
  'src/product/tabs/nianjing/nianjing-hero.css',
  'src/product/tabs/nianjing/nianjing-filters.css',
  'src/product/tabs/nianjing/nianjing-year-overview.css',
  'src/product/tabs/nianjing/nianjing-year-summary.css',
  'src/product/tabs/nianjing/nianjing-phase-list.css',
  'src/product/tabs/nianjing/nianjing-timeline-base.css',
  'src/product/tabs/nianjing/nianjing-timeline.css',
  'src/product/tabs/nianjing/nianjing-drawer.css',
  'src/product/tabs/nianjing/nianjing-recorder.css',
  'src/product/tabs/mingjing/mingjing-shell.css',
  'src/product/tabs/mingjing/mingjing-hero.css',
  'src/product/tabs/mingjing/mingjing-panels.css',
  'src/product/tabs/mingjing/mingjing-paipan.css',
  'src/product/tabs/mingjing/mingjing-geju.css',
  'src/product/tabs/mingjing/mingjing-dayun.css',
  'src/product/tabs/mingjing/mingjing-liunian.css',
  'src/product/tabs/mingjing/mingjing-events.css',
  'src/product/tabs/mingjing/mingjing-reading.css',
  'src/product/tabs/mingjing/mingjing-ziwei.css',
  'src/product/tabs/mingjing/mingjing-ziwei-reading.css',
  'src/product/tabs/mingjing/mingjing-rectify.css',
  'src/product/tabs/mingjing/mingjing-responsive.css',
  'src/product/tabs/hejing/hejing-shell.css',
  'src/product/tabs/hejing/hejing-hero.css',
  'src/product/tabs/hejing/hejing-index.css',
  'src/product/tabs/hejing/hejing-intersection.css',
  'src/product/tabs/hejing/hejing-future.css',
  'src/product/tabs/hejing/hejing-history.css',
  'src/product/tabs/hejing/hejing-responsive.css',
  'src/product/tabs/shijing/shijing-ask-shell.css',
  'src/product/tabs/shijing/shijing-ask-hero.css',
  'src/product/tabs/shijing/shijing-ask-rail.css',
  'src/product/tabs/shijing/shijing-ask-composer.css',
  'src/product/tabs/shijing/shijing-ask-context.css',
  'src/product/tabs/shijing/shijing-ask-recall.css',
  'src/product/tabs/shijing/shijing-ask-thread.css',
  'src/product/tabs/shijing/shijing-concern-bar.css',
];

const retiredRichCssFiles = [
  'src/styles-rijing-rich.css',
  'src/styles-yuejing-rich.css',
  'src/styles-nianjing-rich.css',
  'src/styles-mingjing-rich.css',
  'src/styles-shijing-rich.css',
];

const mirrorSpecificSelectorPattern =
  /\.shijing-(?:rijing|yuejing|nianjing|mingjing|ask|shijing)__/u;

const architectureCssFiles = [
  'src/styles.css',
  'src/styles-mirror-v1.css',
  'src/styles-mirror-header.css',
  'src/styles-personal-data.css',
  sharedPrimitiveFile,
  ...featureCssFiles,
  ...settingsCssFiles.map((file) => file.replace('../', '')),
];

test('styles.css imports shared and feature CSS without partial cascade layering', () => {
  assert.equal(existsSync(projectUrl(sharedPrimitiveFile)), true, `${sharedPrimitiveFile} exists`);

  const imports = readProjectFile('src/styles.css');
  assert.match(
    imports,
    /@layer\s+shijing\.tokens,\s*shijing\.shell,\s*shijing\.primitives,\s*shijing\.features,\s*shijing\.settings;/u,
    'styles.css declares explicit app layer order',
  );

  assert.doesNotMatch(
    imports,
    /@import\s+['"](?:\.\/styles-mirror-v1\.css|\.\/styles-mirror-header\.css|\.\/styles-personal-data\.css|\.\/product\/tabs\/[^'"]+\.css)['"]\s+layer\(/u,
    'product stylesheets must stay unlayered until Kit/Tailwind/global app rules are layer-scoped together',
  );

  const tailwindIndex = imports.indexOf("@import 'tailwindcss';");
  const mirrorShellIndex = imports.indexOf("@import './styles-mirror-v1.css';");
  const sharedIndex = imports.indexOf("@import './product/tabs/shared/mirror-primitives.css';");

  assert.notEqual(tailwindIndex, -1, 'styles.css imports Tailwind');
  assert.notEqual(mirrorShellIndex, -1, 'styles.css imports shared mirror shell stylesheet');
  assert.notEqual(sharedIndex, -1, 'styles.css imports shared primitive stylesheet');
  assert.ok(tailwindIndex < mirrorShellIndex, 'product CSS loads after Tailwind and can own app layout');
  assert.ok(mirrorShellIndex < sharedIndex, 'shared primitives load after shared shell');

  for (const file of retiredRichCssFiles) {
    const retiredImport = file.replace('src/', './');
    assert.equal(imports.includes(retiredImport), false, `${file} is retired`);
  }

  for (const file of featureCssFiles) {
    assert.equal(existsSync(projectUrl(file)), true, `${file} exists`);
    const importPath = `./${file.replace('src/', '')}`;
    const importIndex = imports.indexOf(`@import '${importPath}';`);

    assert.notEqual(importIndex, -1, `styles.css imports ${importPath}`);
    assert.ok(sharedIndex < importIndex, `${file} loads after shared primitives`);
  }
});

test('shared surface stylesheet owns repeated aurora shell and transparent chrome', () => {
  const shared = readProjectFile(sharedPrimitiveFile);
  const sharedRoot = cssBlock(shared, ':root');

  assert.match(sharedRoot, /--shijing-shared-aurora-bg:/);
  assert.match(sharedRoot, /--shijing-surface-topbar-border:/);

  for (const tab of ['rijing', 'yuejing', 'nianjing', 'shijing']) {
    const shell = cssBlock(shared, `.shijing-shell[data-active-tab="${tab}"]`);
    const topbar = cssBlock(shared, `.shijing-shell[data-active-tab="${tab}"] .shijing-topbar`);

    assert.match(shell, /background:\s*var\(--shijing-shared-aurora-bg\)/);
    assert.match(topbar, /background:\s*transparent/);
    assert.match(topbar, /backdrop-filter:\s*none/);
    assert.match(topbar, /-webkit-backdrop-filter:\s*none/);
    assert.match(topbar, /border-bottom-color:\s*var\(--shijing-surface-topbar-border\)/);
  }

  const mingjingTopbar = cssBlock(shared, '.shijing-shell[data-active-tab="mingjing"] .shijing-topbar');
  assert.match(mingjingTopbar, /border-bottom-color:\s*var\(--shijing-surface-topbar-border\)/);

  for (const file of featureCssFiles) {
    const source = stripCssComments(readProjectFile(file));
    assert.doesNotMatch(
      source,
      /radial-gradient\(42% 36% at 6% 4%, rgba\(167, 243, 208, 0\.55\), transparent 70%\)/,
      `${file} must not duplicate the shared aurora background`,
    );
    assert.doesNotMatch(
      source,
      /backdrop-filter:\s*none;\s*-webkit-backdrop-filter:\s*none;\s*border-bottom-color:\s*rgba\(255, 255, 255, 0\.45\)/,
      `${file} must not duplicate shared transparent topbar chrome`,
    );
  }
});

test('shared glass primitives feed the YueJing NianJing and Ask ShiJing glass systems', () => {
  const sharedRoot = cssBlock(readProjectFile(sharedPrimitiveFile), ':root');
  assert.match(sharedRoot, /--shijing-shared-glass-bg:\s*rgba\(255, 255, 255, 0\.55\)/);
  assert.match(sharedRoot, /--shijing-shared-glass-border:\s*rgba\(255, 255, 255, 0\.55\)/);
  assert.match(sharedRoot, /--shijing-shared-glass-blur:\s*blur\(16px\) saturate\(140%\)/);
  assert.match(sharedRoot, /--shijing-shared-glass-shadow:\s*0 8px 28px -16px rgba\(15, 23, 38, 0\.12\)/);

  const yuejingRoot = cssBlock(readProjectFile('src/product/tabs/yuejing/yuejing-shell.css'), '.shijing-yuejing');
  const nianjingRoot = cssBlock(readProjectFile('src/product/tabs/nianjing/nianjing-shell.css'), '.shijing-nianjing');
  const askRoot = cssBlock(readProjectFile('src/product/tabs/shijing/shijing-ask-shell.css'), '.shijing-tab.shijing-ask');

  for (const [label, root, prefix] of [
    ['YueJing', yuejingRoot, 'yuejing'],
    ['NianJing', nianjingRoot, 'nianjing'],
    ['Ask ShiJing', askRoot, 'shijing-ask'],
  ]) {
    assert.match(root, new RegExp(`--${prefix}-glass-bg:\\s*var\\(--shijing-shared-glass-bg\\)`), label);
    assert.match(root, new RegExp(`--${prefix}-glass-border:\\s*var\\(--shijing-shared-glass-border\\)`), label);
    assert.match(root, new RegExp(`--${prefix}-glass-blur:\\s*var\\(--shijing-shared-glass-blur\\)`), label);
    assert.match(root, new RegExp(`--${prefix}-glass-shadow:\\s*var\\(--shijing-shared-glass-shadow\\)`), label);
  }
});

test('shared concern editor primitives own repeated row controls across mirrors', () => {
  const shared = readProjectFile(sharedPrimitiveFile);

  for (const selector of [
    '.shijing-yuejing .shijing-yuejing__editor-remove',
    '.shijing-nianjing .shijing-nianjing__editor-remove',
    '.shijing-rijing .shijing-rijing-concern-editor__remove',
    '.shijing-ask .shijing-ctx-editor__remove',
  ]) {
    const block = cssBlock(shared, selector);
    assert.match(block, /appearance:\s*none/);
    assert.match(block, /border:\s*1px solid var\(--shijing-border-default\)/);
    assert.match(block, /border-radius:\s*999px/);
    assert.match(block, /flex:\s*0 0 auto/);
  }

  for (const selector of [
    '.shijing-yuejing .shijing-yuejing__editor-custom input',
    '.shijing-nianjing .shijing-nianjing__editor-custom input',
    '.shijing-rijing .shijing-rijing-concern-editor__custom input',
    '.shijing-ask .shijing-ctx-editor__custom input',
  ]) {
    const block = cssBlock(shared, selector);
    assert.match(block, /flex:\s*1/);
    assert.match(block, /background:\s*transparent/);
    assert.match(block, /min-width:\s*0/);
  }
});

test('styles-mirror-v1 is a shared mirror shell and does not own concrete rich mirror selectors', () => {
  const mirrorV1 = stripCssComments(readProjectFile('src/styles-mirror-v1.css'));
  const forbiddenSelectors = mirrorV1
    .split(/\r?\n/u)
    .filter((line) => mirrorSpecificSelectorPattern.test(line))
    .filter((line) => !line.includes('e.g.'))
    .filter((line) => !line.includes('.shijing-tab.shijing-'));

  assert.deepEqual(forbiddenSelectors, [], 'styles-mirror-v1.css must not contain concrete rich mirror selectors');
});

test('feature CSS files stay bounded enough for AI context', () => {
  const maxFeatureCssLines = 430;

  for (const file of featureCssFiles) {
    const source = readProjectFile(file);
    assert.ok(
      lineCount(source) <= maxFeatureCssLines,
      `${file} has ${lineCount(source)} lines, expected <= ${maxFeatureCssLines}`,
    );
  }
});

test('styles-personal-data.css is a settings stylesheet entrypoint only', () => {
  const entrypoint = readProjectFile('src/styles-personal-data.css');
  const expectedImports = settingsCssFiles.map((file) => `@import './${file.replace('../src/', '')}';`);

  let previousIndex = -1;
  for (const importLine of expectedImports) {
    const importIndex = entrypoint.indexOf(importLine);
    assert.notEqual(importIndex, -1, `styles-personal-data.css imports ${importLine}`);
    assert.ok(previousIndex < importIndex, `${importLine} preserves settings cascade order`);
    previousIndex = importIndex;
  }

  assert.doesNotMatch(
    stripCssComments(entrypoint),
    /\.(?:shijing-settings-page|sjp-)[^{]+\{/u,
    'styles-personal-data.css should not keep concrete settings selectors',
  );
  assert.ok(lineCount(entrypoint) <= 40, 'styles-personal-data.css stays small enough to read as an entrypoint');
});

test('settings CSS files are feature-owned and bounded for AI context', () => {
  const maxSettingsCssLines = 430;

  for (const file of settingsCssFiles) {
    const projectFile = file.replace('../', '');
    assert.equal(existsSync(projectUrl(projectFile)), true, `${projectFile} exists`);
    const source = readProjectFile(projectFile);
    assert.ok(
      lineCount(source) <= maxSettingsCssLines,
      `${projectFile} has ${lineCount(source)} lines, expected <= ${maxSettingsCssLines}`,
    );
  }

  const shell = readProjectFile('src/product/settings/settings-shell.css');
  const primitives = readProjectFile('src/product/settings/settings-primitives.css');
  const forms = readProjectFile('src/product/settings/settings-forms.css');
  const checks = readProjectFile('src/product/settings/settings-checks.css');
  const self = readProjectFile('src/product/self/self-editor.css');
  const natal = readProjectFile('src/product/natal/natal-fields.css');
  const drawer = readProjectFile('src/product/settings/settings-drawer.css');

  assert.match(shell, /\.shijing-settings-page--styled\s*\{/u);
  assert.match(primitives, /\.shijing-settings-page--styled \.sjp-card\s*\{/u);
  assert.match(forms, /\.shijing-settings-page--styled \.sjp-field\s*\{/u);
  assert.match(checks, /\.shijing-settings-page--styled \.sjp-check\s*,/u);
  assert.match(self, /\.shijing-settings-page--styled \.sjp-profile\s*\{/u);
  assert.match(natal, /\.shijing-settings-page--styled \.sjp-place\s*\{/u);
  assert.match(drawer, /\.sjp-drawer\s*\{/u);
  assert.doesNotMatch(shell, /\.sjp-profile__/u);
  assert.doesNotMatch(primitives, /\.sjp-concern-/u);
  assert.doesNotMatch(forms, /\.sjp-method-/u);
  assert.doesNotMatch(drawer, /\.shijing-settings-page--styled \.sjp-card\s*\{/u);
});

test('architecture CSS files have balanced block braces after mechanical splitting', () => {
  for (const file of architectureCssFiles) {
    const source = stripCssComments(readProjectFile(file));
    let depth = 0;

    for (const char of source) {
      if (char === '{') depth += 1;
      if (char === '}') depth -= 1;
      assert.ok(depth >= 0, `${file} closes a CSS block before opening it`);
    }

    assert.equal(depth, 0, `${file} has balanced CSS block braces`);
  }
});
