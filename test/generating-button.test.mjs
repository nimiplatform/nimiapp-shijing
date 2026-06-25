import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function projectUrl(path) {
  return new URL(`../${path}`, import.meta.url);
}

function readProjectFile(path) {
  return readFileSync(projectUrl(path), 'utf8');
}

function stripComments(source) {
  return source
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
  const block = cssBlockFromSource(stripCssComments(source), selector);
  assert.notEqual(block, '', `Missing CSS selector: ${selector}`);
  return block;
}

function cssCustomProperty(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.notEqual(match, null, `Missing custom property: ${name}`);
  return match[1];
}

function hexLuminance(hex) {
  const channels = hex
    .slice(1)
    .match(/[0-9a-fA-F]{2}/g)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

const generatingButtonImport =
  /import \{ GeneratingButton \} from '(?:\.\/|\.\.\/)+shared\/generating-button\.tsx';/;

test('shared GeneratingButton component owns busy button anatomy', () => {
  const componentPath = 'src/product/tabs/shared/generating-button.tsx';
  assert.equal(existsSync(projectUrl(componentPath)), true, `${componentPath} exists`);

  const source = stripComments(readProjectFile(componentPath));
  assert.match(source, /export function GeneratingButton\b/);
  assert.match(source, /aria-busy=\{busy \|\| undefined\}/);
  assert.match(source, /data-busy=\{busy \? 'true' : 'false'\}/);
  assert.match(source, /className="shijing-generating-button__spinner"/);
  assert.match(source, /shijing-generating-button__label/);
});

test('all reading generation actions render the shared dynamic button', () => {
  for (const file of [
    'src/product/tabs/rijing-tab.tsx',
    'src/product/tabs/yuejing-tab.tsx',
    'src/product/tabs/nianjing-tab.tsx',
    'src/product/tabs/shijing/shijing-composer.tsx',
    'src/product/tabs/mingjing/mingjing-reading-view.tsx',
    'src/product/tabs/mingjing/mingjing-ziwei-reading-view.tsx',
  ]) {
    const source = stripComments(readProjectFile(file));
    assert.match(source, generatingButtonImport, `${file} imports GeneratingButton`);
    assert.match(source, /<GeneratingButton\b/, `${file} renders GeneratingButton`);
  }
});

test('shared generating button stylesheet owns busy motion and disabled chrome', () => {
  const stylesImport = readProjectFile('src/styles.css');
  assert.match(
    stylesImport,
    /@import '\.\/product\/tabs\/shared\/generating-button\.css';/,
    'styles.css imports the shared generating button stylesheet',
  );

  const source = readProjectFile('src/product/tabs/shared/generating-button.css');
  const button = cssBlock(source, '.shijing-tab .shijing-generating-button');
  const busy = cssBlock(source, '.shijing-tab .shijing-generating-button[data-busy="true"]');
  const disabled = cssBlock(source, '.shijing-tab .shijing-generating-button:disabled:not([data-busy="true"])');
  const spinner = cssBlock(source, '.shijing-generating-button__spinner');

  assert.match(button, /display:\s*inline-flex/);
  assert.match(button, /border-radius:\s*999px/);
  assert.match(button, /transition:/);
  assert.match(busy, /animation:\s*shijing-generating-pulse/);
  assert.match(disabled, /cursor:\s*not-allowed/);
  assert.match(spinner, /animation:\s*shijing-generating-spin/);
  assert.match(source, /@keyframes shijing-generating-spin/);
  assert.match(source, /@keyframes shijing-generating-pulse/);
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)/);
});

test('generating busy state uses a lighter green than the theme action green', () => {
  const source = readProjectFile('src/product/tabs/shared/generating-button.css');
  const button = cssBlock(source, '.shijing-tab .shijing-generating-button');
  const busy = cssBlock(source, '.shijing-tab .shijing-generating-button[data-busy="true"]');
  const themeGreen = cssCustomProperty(button, '--shijing-generating-theme-green');
  const busyGreen = cssCustomProperty(button, '--shijing-generating-busy-green');

  assert.ok(
    hexLuminance(busyGreen) > hexLuminance(themeGreen),
    `${busyGreen} must be lighter than ${themeGreen}`,
  );
  assert.match(busy, /var\(--shijing-generating-busy-green\)/);
});
