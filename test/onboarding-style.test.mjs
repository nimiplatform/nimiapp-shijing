import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const rijingStyles = readFileSync(new URL('../src/styles-rijing-rich.css', import.meta.url), 'utf8');
const personalDataStyles = readFileSync(new URL('../src/styles-personal-data.css', import.meta.url), 'utf8');

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

function assertNoGenericOnboardingCardReset(source, sourceName) {
  const reset = cssBlockFromSource(
    source,
    '.shijing-onboarding .shijing-settings-page--styled .sjp-card',
  );

  assert.equal(reset.trim(), '', `${sourceName} must not clear every onboarding sjp-card`);
}

test('onboarding active step uses the Nimi primary green border token', () => {
  const activeStep = cssBlock('.shijing-onboarding__steps li[data-active="true"] button');

  assert.match(activeStep, /border-color:\s*var\(--nimi-action-primary-bg\)/);
});

test('onboarding entry button stays green and compact without an extra CTA oval', () => {
  const confirmButton = cssBlock('.shijing-onboarding__confirm');
  const tabConfirmButton = cssBlock('.shijing-tab .shijing-onboarding__confirm');
  const confirmButtonHover = cssBlock('.shijing-onboarding__confirm:hover:not(:disabled)');
  const disabledButton = cssBlock('.shijing-onboarding__confirm:disabled');
  const completeActionDock = cssBlock(
    '.shijing-onboarding__actions:has(.shijing-onboarding__confirm:not(:disabled))',
  );

  assert.match(confirmButton, /min-height:\s*40px/);
  assert.match(confirmButton, /min-width:\s*132px/);
  assert.match(confirmButton, /background:\s*var\(--shijing-brand-primary\)/);
  assert.match(confirmButton, /box-shadow:\s*none/);
  assert.match(tabConfirmButton, /border-radius:\s*999px/);
  assert.match(tabConfirmButton, /padding:\s*0 20px/);
  assert.match(confirmButtonHover, /background-color:\s*var\(--rijing-accent-hover\)/);
  assert.match(confirmButtonHover, /opacity:\s*1/);
  assert.match(disabledButton, /background:\s*var\(--shijing-brand-primary\)/);
  assert.match(disabledButton, /opacity:\s*1/);
  assert.match(disabledButton, /box-shadow:\s*none/);
  assert.match(completeActionDock, /padding:\s*0/);
  assert.match(completeActionDock, /border:\s*0/);
  assert.match(completeActionDock, /border-radius:\s*0/);
  assert.match(completeActionDock, /background:\s*transparent/);
  assert.match(completeActionDock, /box-shadow:\s*none/);
});

test('onboarding disabled entry buttons keep a high-contrast surface under the tab button cascade', () => {
  const desktopDisabled = cssBlock('.shijing-tab .shijing-onboarding__confirm:disabled');
  const mobileDisabled = cssBlock('.shijing-tab .shijing-onboarding__mobile-confirm:disabled');

  assert.match(desktopDisabled, /background:\s*var\(--shijing-brand-primary\)/);
  assert.match(desktopDisabled, /color:\s*#fff/);
  assert.match(mobileDisabled, /background:\s*var\(--shijing-brand-primary\)/);
  assert.match(mobileDisabled, /color:\s*#fff/);
});

test('onboarding complete entry button keeps an opaque fill inside the wide CTA dock on hover', () => {
  const dockedHover = cssBlock(
    '.shijing-tab .shijing-onboarding__actions:has(.shijing-onboarding__confirm:not(:disabled)) .shijing-onboarding__confirm:hover',
  );

  assert.match(dockedHover, /background-color:\s*var\(--rijing-accent-hover\)/);
  assert.match(dockedHover, /color:\s*#fff/);
  assert.match(dockedHover, /opacity:\s*1/);
});

test('onboarding mobile hides the desktop CTA dock after the entry action moves into the workbench', () => {
  const mobileDock = cssBlockInAtRule(
    '@media (max-width: 640px)',
    '.shijing-onboarding__actions:has(.shijing-onboarding__confirm:not(:disabled))',
  );

  assert.match(mobileDock, /display:\s*none/);
});

test('onboarding inline self-editor save actions sit on the right edge of the form', () => {
  const actions = cssBlock(
    '.shijing-onboarding .shijing-settings-page--styled .sjp-inline-self-form .sjp-actions--drawer',
  );

  assert.match(actions, /justify-content:\s*flex-end/);
});

test('onboarding inline self-editor cancel action stays ghost inside the tab button cascade', () => {
  const cancelButton = cssBlockFromSource(
    personalDataStyles,
    '.shijing-settings-page--styled .sjp-inline-self-form .nimi-action--ghost',
  );
  const cancelButtonHover = cssBlockFromSource(
    personalDataStyles,
    '.shijing-settings-page--styled .sjp-inline-self-form .nimi-action--ghost:hover:not(:disabled)',
  );
  const cancelButtonDisabled = cssBlockFromSource(
    personalDataStyles,
    '.shijing-settings-page--styled .sjp-inline-self-form .nimi-action--ghost:disabled',
  );

  assert.match(cancelButton, /background:\s*transparent/);
  assert.match(cancelButton, /border-color:\s*transparent/);
  assert.match(cancelButton, /color:\s*var\(--sjp-fg-2\)/);
  assert.match(cancelButtonHover, /background:\s*rgba\(148,\s*163,\s*184,\s*0\.12\)/);
  assert.match(cancelButtonHover, /color:\s*var\(--sjp-fg-1\)/);
  assert.match(cancelButtonDisabled, /background:\s*transparent/);
  assert.match(cancelButtonDisabled, /color:\s*var\(--sjp-fg-4\)/);
});

test('onboarding editor cards keep their card frames instead of clearing sjp-card surfaces', () => {
  assertNoGenericOnboardingCardReset(rijingStyles, 'styles-rijing-rich.css');
  assertNoGenericOnboardingCardReset(personalDataStyles, 'styles-personal-data.css');

  const selfEditorReset = cssBlockFromSource(
    rijingStyles,
    '.shijing-onboarding .shijing-settings-page--styled .sjp-card--inline-self-editor',
  );
  const personalDataSelfEditorReset = cssBlockFromSource(
    personalDataStyles,
    '.shijing-onboarding .shijing-settings-page--styled .sjp-card--inline-self-editor',
  );

  assert.match(
    personalDataStyles,
    /\.shijing-settings-page--styled \.sjp-card\s*\{[^}]*background-image:\s*var\(--sjp-surface-hero\)[^}]*border:\s*1px solid rgba\(255, 255, 255, 0\.6\)[^}]*border-radius:\s*var\(--sjp-radius-xl\)[^}]*box-shadow:\s*var\(--sjp-elevation-raised\)[^}]*padding:\s*34px 36px/s,
  );

  for (const [sourceName, reset] of [
    ['styles-rijing-rich.css', selfEditorReset],
    ['styles-personal-data.css', personalDataSelfEditorReset],
  ]) {
    assert.doesNotMatch(reset, /padding:\s*0/, `${sourceName} must not clear inline self-editor padding`);
    assert.doesNotMatch(reset, /border:\s*0/, `${sourceName} must not clear inline self-editor border`);
    assert.doesNotMatch(reset, /border-radius:\s*0/, `${sourceName} must not clear inline self-editor radius`);
    assert.doesNotMatch(reset, /box-shadow:\s*none/, `${sourceName} must not clear inline self-editor shadow`);
    assert.doesNotMatch(reset, /background:\s*transparent/, `${sourceName} must not clear inline self-editor background`);
    assert.doesNotMatch(reset, /background-image:\s*none/, `${sourceName} must not clear inline self-editor background image`);
  }
});
