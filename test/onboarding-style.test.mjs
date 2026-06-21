import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const rijingStyles = readFileSync(new URL('../src/styles-rijing-rich.css', import.meta.url), 'utf8');

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

function cssBlock(selector) {
  return cssBlockFromSource(rijingStyles, selector);
}

function cssBlockInAtRule(atRule, selector) {
  const start = rijingStyles.indexOf(atRule);
  assert.notEqual(start, -1, `Missing CSS at-rule: ${atRule}`);
  const openBrace = rijingStyles.indexOf('{', start);
  assert.notEqual(openBrace, -1, `Missing opening brace for at-rule: ${atRule}`);

  let depth = 0;
  for (let index = openBrace; index < rijingStyles.length; index += 1) {
    const char = rijingStyles[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return cssBlockFromSource(rijingStyles.slice(openBrace + 1, index), selector);
      }
    }
  }

  throw new Error(`Unclosed CSS at-rule: ${atRule}`);
}

test('onboarding active step uses the Nimi primary green border token', () => {
  const activeStep = cssBlock('.shijing-onboarding__steps li[data-active="true"] button');

  assert.match(activeStep, /border-color:\s*var\(--nimi-action-primary-bg\)/);
});

test('onboarding entry button stays green and compact in the lower-left CTA dock', () => {
  const confirmButton = cssBlock('.shijing-onboarding__confirm');
  const disabledButton = cssBlock('.shijing-onboarding__confirm:disabled');
  const completeActionDock = cssBlock(
    '.shijing-onboarding__actions:has(.shijing-onboarding__confirm:not(:disabled))',
  );

  assert.match(confirmButton, /min-height:\s*44px/);
  assert.match(confirmButton, /min-width:\s*132px/);
  assert.match(confirmButton, /background:\s*var\(--rijing-accent\)/);
  assert.match(confirmButton, /box-shadow:\s*0 10px 24px/);
  assert.match(disabledButton, /background:\s*var\(--rijing-accent\)/);
  assert.match(disabledButton, /opacity:\s*0\.58/);
  assert.match(completeActionDock, /padding:\s*8px/);
  assert.match(completeActionDock, /background:\s*color-mix\(in srgb, var\(--rijing-accent\) 9%, rgba\(255, 255, 255, 0\.62\)\)/);
});

test('onboarding mobile hides the desktop CTA dock after the entry action moves into the workbench', () => {
  const mobileDock = cssBlockInAtRule(
    '@media (max-width: 640px)',
    '.shijing-onboarding__actions:has(.shijing-onboarding__confirm:not(:disabled))',
  );

  assert.match(mobileDock, /display:\s*none/);
});
