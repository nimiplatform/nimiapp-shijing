import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readCssBundle, settingsCssFiles } from './css-bundles.mjs';

const settingsPageSource = readFileSync(
  new URL('../src/product/settings/settings-page-view.tsx', import.meta.url),
  'utf8',
);
const settingsSurfacesSource = readFileSync(
  new URL('../src/product/settings/settings-surfaces.tsx', import.meta.url),
  'utf8',
);
const uiLanguageSource = readFileSync(
  new URL('../src/product/settings/ui-language-switch.tsx', import.meta.url),
  'utf8',
);
const methodProfileSource = readFileSync(
  new URL('../src/product/settings/method-profile-editor.tsx', import.meta.url),
  'utf8',
);
const responsePreferencesSource = readFileSync(
  new URL('../src/product/settings/response-preferences-editor.tsx', import.meta.url),
  'utf8',
);
const aiModelConfigSource = readFileSync(
  new URL('../src/shell/ai/shijing-ai-model-config-section.tsx', import.meta.url),
  'utf8',
);
const personalDataStyles = readCssBundle(settingsCssFiles).replace(/\/\*[\s\S]*?\*\//g, '');
const mirrorV1Styles = readFileSync(
  new URL('../src/styles-mirror-v1.css', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

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
  return cssBlockFromSource(personalDataStyles, selector);
}

function cssBlockInAtRule(atRule, selector) {
  const start = personalDataStyles.indexOf(atRule);
  assert.notEqual(start, -1, `Missing CSS at-rule: ${atRule}`);
  const openBrace = personalDataStyles.indexOf('{', start);
  assert.notEqual(openBrace, -1, `Missing opening brace for at-rule: ${atRule}`);

  let depth = 0;
  for (let index = openBrace; index < personalDataStyles.length; index += 1) {
    const char = personalDataStyles[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return cssBlockFromSource(personalDataStyles.slice(openBrace + 1, index), selector);
      }
    }
  }

  throw new Error(`Unclosed CSS at-rule: ${atRule}`);
}

test('settings detail page renders a module nav for the settings sub-page', () => {
  assert.match(settingsPageSource, /settingsModuleNavItems/);
  assert.match(settingsPageSource, /useState/);
  assert.match(settingsPageSource, /activeSettingsModuleId/);
  assert.match(settingsPageSource, /setActiveSettingsModuleId/);
  assert.match(settingsPageSource, /settingsScrollRef/);
  assert.match(settingsPageSource, /settingsNavRef/);
  assert.match(settingsPageSource, /touchScrollRef/);
  assert.match(settingsPageSource, /className="shijing-settings-page__body"/);
  assert.match(settingsPageSource, /className="shijing-settings-page__surface-nav"/);
  assert.match(settingsPageSource, /className="shijing-settings-page__surface-nav-list"/);
  assert.match(
    settingsPageSource,
    /ref=\{settingsScrollRef\}\s+className="shijing-settings shijing-settings-page__content-scroll"/,
  );
  assert.match(
    settingsPageSource,
    /ref=\{settingsNavRef\}\s+className="shijing-settings-page__surface-nav"/,
  );
  assert.match(settingsPageSource, /type="button"/);
  assert.match(settingsPageSource, /aria-controls=\{item\.targetId\}/);
  assert.match(settingsPageSource, /scrollToSettingsModule\(item\.targetId\)/);
  assert.match(settingsPageSource, /updateActiveSettingsModule/);
  assert.match(settingsPageSource, /onScroll=\{handleSettingsContentScroll\}/);
  assert.match(settingsPageSource, /setActiveSettingsModuleId\(targetId\)/);
  assert.match(settingsPageSource, /const active = item\.targetId === activeSettingsModuleId/);
  assert.match(settingsPageSource, /aria-current=\{active \? 'location' : undefined\}/);
  assert.match(settingsPageSource, /data-active=\{active \? 'true' : undefined\}/);
  assert.match(settingsPageSource, /const targetRect = target\.getBoundingClientRect\(\)/);
  assert.match(settingsPageSource, /const navRect = nav\.getBoundingClientRect\(\)/);
  assert.match(settingsPageSource, /scrollContainer\.scrollTop \+ targetRect\.top - navRect\.top/);
  assert.match(settingsPageSource, /scrollContainer\.scrollTo\(\{\s*top:\s*nextTop,\s*behavior:\s*'smooth'\s*\}\)/);
  assert.match(settingsPageSource, /onWheel=\{handleSettingsBodyWheel\}/);
  assert.match(settingsPageSource, /onTouchStart=\{handleSettingsBodyTouchStart\}/);
  assert.match(settingsPageSource, /onTouchMove=\{handleSettingsBodyTouchMove\}/);
  assert.match(settingsPageSource, /onTouchEnd=\{handleSettingsBodyTouchEnd\}/);
  assert.match(settingsPageSource, /event\.preventDefault\(\)/);
  assert.match(settingsPageSource, /scrollContainer\.scrollTop \+= event\.deltaY/);
  assert.doesNotMatch(settingsPageSource, /target\.scrollIntoView/);
  assert.doesNotMatch(settingsPageSource, /target\.focus\(/);
  assert.doesNotMatch(settingsPageSource, /href=\{`#\$\{item\.targetId\}`\}/);
});

test('profile settings page owns one shared sensitive-access gate for self and people', () => {
  assert.match(settingsPageSource, /profileSensitiveAccess/);
  assert.match(settingsPageSource, /presence_verification_client/);
  assert.match(settingsPageSource, /SHIJING_PROFILE_REVEAL_PRESENCE_REQUEST/);
  assert.match(settingsPageSource, /profileSensitiveAccess=\{profileSensitiveAccess\}/);
  assert.match(settingsSurfacesSource, /profileSensitiveAccess/);
  assert.match(settingsSurfacesSource, /<SelfEditor[^>]+profileSensitiveAccess=\{props\.profileSensitiveAccess\}/s);
  assert.match(settingsSurfacesSource, /<PersonEditor[^>]+profileSensitiveAccess=\{props\.profileSensitiveAccess\}/s);
});

test('settings cards expose stable module anchors for left navigation', () => {
  assert.match(uiLanguageSource, /id="settings-ui-language"/);
  assert.match(methodProfileSource, /id="settings-method-profile"/);
  assert.match(responsePreferencesSource, /id="settings-response-preferences"/);
  assert.match(aiModelConfigSource, /id="settings-ai-model-config"/);
  assert.match(settingsSurfacesSource, /id="settings-privacy-local-data"/);
  assert.match(settingsSurfacesSource, /id="settings-diagnostics"/);
});

test('response preferences save immediately without an explicit save action', () => {
  assert.match(responsePreferencesSource, /const currentPreferences = state\.snapshot\.settings\.response_preferences/);
  assert.match(responsePreferencesSource, /function commitDraft\(nextDraft: ResponsePreferences\)/);
  assert.match(responsePreferencesSource, /commitResponsePreferences\(state\.snapshot,\s*nextDraft\)/);
  assert.match(responsePreferencesSource, /value=\{currentPreferences\.tone\}/);
  assert.match(responsePreferencesSource, /value=\{currentPreferences\.length\}/);
  assert.match(responsePreferencesSource, /value=\{currentPreferences\.language\}/);
  assert.match(responsePreferencesSource, /value=\{currentPreferences\.extra_instructions \?\? ''\}/);
  assert.match(responsePreferencesSource, /commitDraft\(\{\s*\.\.\.currentPreferences,\s*tone:/);
  assert.match(responsePreferencesSource, /commitDraft\(\{\s*\.\.\.currentPreferences,\s*length:/);
  assert.match(responsePreferencesSource, /commitDraft\(\{\s*\.\.\.currentPreferences,\s*language:/);
  assert.match(responsePreferencesSource, /commitDraft\(\{\s*\.\.\.currentPreferences,\s*extra_instructions:/);
  assert.doesNotMatch(responsePreferencesSource, /const \[draft/);
  assert.doesNotMatch(responsePreferencesSource, /function save\(/);
  assert.doesNotMatch(responsePreferencesSource, /onSubmit=/);
  assert.doesNotMatch(responsePreferencesSource, /type="submit"/);
  assert.doesNotMatch(responsePreferencesSource, /copy\.responsePreferences\.saveButton/);
  assert.doesNotMatch(responsePreferencesSource, /className="sjp-actions"/);
});

test('settings sub-pages use the same content width as NianJing', () => {
  const nianjingBase = cssBlockFromSource(mirrorV1Styles, '.shijing-tab');
  const layout = cssBlock('.shijing-settings-page--styled .nimi-page-detail-layout');

  assert.match(nianjingBase, /max-width:\s*920px/);
  assert.match(layout, /max-width:\s*920px/);
  assert.doesNotMatch(layout, /max-width:\s*1160px/);
});

test('settings module nav pins the page chrome while only the module pane scrolls', () => {
  const page = cssBlock('.shijing-settings-page--styled.shijing-settings-page--settings');
  const layout = cssBlock(
    '.shijing-settings-page--styled.shijing-settings-page--settings .nimi-page-detail-layout',
  );
  const body = cssBlock('.shijing-settings-page--styled .shijing-settings-page__body');
  const nav = cssBlock('.shijing-settings-page--styled .shijing-settings-page__surface-nav');
  const content = cssBlock('.shijing-settings-page--styled .shijing-settings-page__content-scroll');
  const item = cssBlock('.shijing-settings-page--styled .shijing-settings-page__surface-nav-item');
  const activeItem = cssBlock(
    ".shijing-settings-page--styled .shijing-settings-page__surface-nav-item[aria-current='location']",
  );
  const activeFocusItem = cssBlock(
    ".shijing-settings-page--styled .shijing-settings-page__surface-nav-item[aria-current='location']:focus-visible",
  );
  const target = cssBlock(
    '.shijing-settings-page--styled .sjp-card[id^="settings-"]',
  );
  const mobileBody = cssBlockInAtRule(
    '@media (max-width: 960px)',
    '.shijing-settings-page--styled .shijing-settings-page__body',
  );
  const mobileNav = cssBlockInAtRule(
    '@media (max-width: 960px)',
    '.shijing-settings-page--styled .shijing-settings-page__surface-nav',
  );

  assert.match(body, /grid-template-columns:\s*minmax\(150px,\s*188px\) minmax\(0,\s*1fr\)/);
  assert.match(body, /align-items:\s*start/);
  assert.match(page, /overflow:\s*hidden/);
  assert.match(layout, /height:\s*100vh/);
  assert.match(layout, /overflow:\s*hidden/);
  assert.match(body, /height:\s*max\(420px,\s*calc\(100vh - 300px\)\)/);
  assert.doesNotMatch(body, /680px/);
  assert.match(body, /overflow:\s*hidden/);
  assert.match(nav, /position:\s*sticky/);
  assert.match(nav, /top:\s*0/);
  assert.match(nav, /align-self:\s*start/);
  assert.match(content, /max-height:\s*100%/);
  assert.match(content, /overflow-y:\s*auto/);
  assert.match(content, /overscroll-behavior:\s*contain/);
  assert.match(content, /padding-bottom:\s*max\(360px,\s*calc\(100vh - 480px\)\)/);
  assert.match(item, /appearance:\s*none/);
  assert.match(item, /border:\s*0/);
  assert.match(item, /background:\s*transparent/);
  assert.match(item, /cursor:\s*pointer/);
  assert.match(item, /text-align:\s*left/);
  assert.match(activeItem, /color:\s*var\(--sjp-accent-hover\)/);
  assert.match(activeItem, /background:\s*var\(--sjp-accent-soft\)/);
  assert.match(activeItem, /width:\s*calc\(100% \+ 12px\)/);
  assert.match(activeItem, /margin-left:\s*-6px/);
  assert.match(activeItem, /margin-right:\s*-6px/);
  assert.match(activeItem, /padding-left:\s*18px/);
  assert.match(activeItem, /padding-right:\s*18px/);
  assert.match(activeItem, /box-shadow:\s*none/);
  assert.doesNotMatch(activeItem, /inset 0 0 0 1px/);
  assert.match(activeFocusItem, /box-shadow:\s*none/);
  assert.match(target, /scroll-margin-top:\s*0/);
  assert.match(mobileBody, /grid-template-columns:\s*1fr/);
  assert.match(mobileNav, /position:\s*relative/);
  assert.match(mobileNav, /overflow-x:\s*auto/);
});
