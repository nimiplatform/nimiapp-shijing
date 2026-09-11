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
const settingsRowSource = readFileSync(
  new URL('../src/product/settings/settings-row.tsx', import.meta.url),
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
const localDataSource = readFileSync(
  new URL('../src/product/settings/local-data-diagnostics-section.tsx', import.meta.url),
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

test('settings sub-page stacks every module in one card without a left module rail', () => {
  // All modules render at once inside the stacked card — no rail navigation,
  // no per-module pane switching state.
  assert.match(settingsPageSource, /className="shijing-settings-stack"/);
  assert.match(settingsPageSource, /className="sjp-stack"/);
  assert.match(settingsPageSource, /<UiLanguageSwitch \/>/);
  assert.match(settingsPageSource, /<MethodProfileEditor \/>/);
  assert.match(settingsPageSource, /<ResponsePreferencesEditor \/>/);
  assert.match(settingsPageSource, /<LocalDataDiagnosticsSection[^>]*surfaces=\{localDataSurfaces\}/);
  assert.match(settingsPageSource, /page\.surfaces\.map/);

  // The host-injected extra module (时镜 AI 配置) renders as the last row.
  assert.match(settingsPageSource, /extras\.targetId/);
  assert.match(settingsPageSource, /extras\.navLabel/);
  assert.match(settingsPageSource, /extras\.content/);

  // The left module rail and one-pane-at-a-time switching are gone entirely.
  assert.doesNotMatch(settingsPageSource, /surface-nav/);
  assert.doesNotMatch(settingsPageSource, /settingsModuleNavItems/);
  assert.doesNotMatch(settingsPageSource, /activeSettingsModuleId/);
  assert.doesNotMatch(settingsPageSource, /setActiveSettingsModuleId/);
  assert.doesNotMatch(settingsPageSource, /SettingsModulePane/);
  assert.doesNotMatch(settingsPageSource, /aria-current=\{active \? 'location' : undefined\}/);
  assert.doesNotMatch(settingsSurfacesSource, /SettingsModulePane/);

  // Deep links (e.g. a mirror readiness blocker pointing at 推演方法) scroll
  // the owning row into view now that every module stays on the page.
  assert.match(settingsPageSource, /SETTINGS_FOCUS_TARGET_IDS\[focusTarget\]/);
  assert.match(settingsPageSource, /document\.getElementById\(id\)/);
  assert.match(settingsPageSource, /target\.scrollIntoView\(/);
});

test('settings rows share one row layout primitive', () => {
  assert.match(settingsRowSource, /export function SettingsRow/);
  assert.match(settingsRowSource, /className=\{`sjp-row\$\{align === 'center' \? ' sjp-row--center' : ''\}`\}/);
  assert.match(settingsRowSource, /sjp-row__meta/);
  assert.match(settingsRowSource, /sjp-row__title/);
  assert.doesNotMatch(settingsRowSource, /sjp-row__desc/);
  assert.match(settingsRowSource, /sjp-row__control/);

  assert.match(uiLanguageSource, /<SettingsRow/);
  assert.match(methodProfileSource, /<SettingsRow/);
  assert.match(responsePreferencesSource, /<SettingsRow/);
  assert.match(localDataSource, /<SettingsRow/);
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

test('settings rows expose stable module anchors for deep links', () => {
  assert.match(uiLanguageSource, /id="settings-ui-language"/);
  assert.match(methodProfileSource, /id="settings-method-profile"/);
  assert.match(responsePreferencesSource, /id="settings-response-preferences"/);
  assert.match(localDataSource, /id=\{showPersistence \? 'settings-privacy-local-data' : 'settings-diagnostics'\}/);
});

test('response preferences commit automatically; extra instructions draft debounces', () => {
  assert.match(responsePreferencesSource, /const currentPreferences = state\.snapshot\.settings\.response_preferences/);
  assert.match(responsePreferencesSource, /function commitDraft\(nextDraft: ResponsePreferences, announce = true\)/);
  assert.match(responsePreferencesSource, /commitResponsePreferences\(state\.snapshot,\s*\{ \.\.\.nextDraft, extra_instructions: value \}\)/);
  assert.match(responsePreferencesSource, /value=\{currentPreferences\.tone\}/);
  assert.match(responsePreferencesSource, /value=\{currentPreferences\.length\}/);
  assert.match(responsePreferencesSource, /value=\{currentPreferences\.language\}/);
  assert.match(responsePreferencesSource, /commitDraft\(\{\s*\.\.\.currentPreferences,\s*tone:/);
  assert.match(responsePreferencesSource, /commitDraft\(\{\s*\.\.\.currentPreferences,\s*length:/);
  assert.match(responsePreferencesSource, /commitDraft\(\{\s*\.\.\.currentPreferences,\s*language:/);

  // The textarea keeps a local draft that commits on blur, on a debounce, and
  // on unmount instead of persisting the snapshot on every keystroke.
  assert.match(responsePreferencesSource, /const \[extraDraft, setExtraDraft\] = useState/);
  assert.match(responsePreferencesSource, /EXTRA_INSTRUCTIONS_COMMIT_DELAY_MS/);
  assert.match(responsePreferencesSource, /extraCommitTimerRef/);
  assert.match(responsePreferencesSource, /window\.setTimeout\(/);
  assert.match(responsePreferencesSource, /window\.clearTimeout\(/);
  assert.match(responsePreferencesSource, /function handleExtraChange\(event: ChangeEvent<HTMLTextAreaElement>\)/);
  assert.match(responsePreferencesSource, /value=\{extraDraft\}/);
  assert.match(responsePreferencesSource, /onChange=\{handleExtraChange\}/);
  assert.match(responsePreferencesSource, /onBlur=\{flushExtraDraft\}/);
  assert.match(responsePreferencesSource, /extra_instructions: value/);
  assert.doesNotMatch(
    responsePreferencesSource,
    /commitDraft\(\{ \.\.\.currentPreferences, extra_instructions: e\.currentTarget\.value \}/,
  );

  // The textarea carries the mock's character budget and live counter.
  assert.match(responsePreferencesSource, /EXTRA_INSTRUCTIONS_MAX_LENGTH = 500/);
  assert.match(responsePreferencesSource, /maxLength=\{EXTRA_INSTRUCTIONS_MAX_LENGTH\}/);
  assert.match(responsePreferencesSource, /sjp-textarea-count/);

  assert.doesNotMatch(responsePreferencesSource, /function save\(/);
  assert.doesNotMatch(responsePreferencesSource, /onSubmit=/);
  assert.doesNotMatch(responsePreferencesSource, /type="submit"/);
  assert.match(responsePreferencesSource, /copy\.responsePreferences\.saveButton/);
  assert.doesNotMatch(responsePreferencesSource, /className="sjp-actions"/);
});

test('local data & diagnostics merges persistence status, snapshot validation, and the clear action', () => {
  assert.match(localDataSource, /copy\.localData\.title/);
  assert.match(localDataSource, /copy\.privacy\.status/);
  assert.match(localDataSource, /persistence_status\.kind/);
  assert.match(localDataSource, /copy\.diagnostics\.snapshotStatus/);
  assert.match(localDataSource, /state\.snapshot_status\.kind/);
  assert.match(localDataSource, /copy\.privacy\.error\(persistenceErrorKind\)/);
  assert.match(localDataSource, /copy\.diagnostics\.validationCode/);
  assert.match(localDataSource, /state\.snapshot_status\.error\.code/);
  assert.match(localDataSource, /persistence_client\.clear\(\)/);
  assert.match(localDataSource, /copy\.privacy\.clearButton/);
  assert.match(localDataSource, /sjp-btn--danger/);
  assert.match(localDataSource, /sjp-statuscard/);
});

test('settings sub-pages use the same content width as NianJing', () => {
  const nianjingBase = cssBlockFromSource(mirrorV1Styles, '.shijing-tab');
  const layout = cssBlock('.shijing-settings-page--styled .nimi-page-detail-layout');

  assert.match(nianjingBase, /max-width:\s*920px/);
  assert.match(layout, /max-width:\s*920px/);
  assert.doesNotMatch(layout, /max-width:\s*1160px/);
});

test('settings page scrolls natively with all module rows in one stacked card', () => {
  const stack = cssBlock('.shijing-settings-page--styled .sjp-stack');
  const row = cssBlock('.shijing-settings-page--styled .sjp-row');
  const rowDivider = cssBlock('.shijing-settings-page--styled .sjp-row + .sjp-row');
  const rowFocus = cssBlock('.shijing-settings-page--styled .sjp-row:focus-visible');
  const rowCenter = cssBlock('.shijing-settings-page--styled .sjp-row--center');
  const control = cssBlock('.shijing-settings-page--styled .sjp-row__control');
  const statusCards = cssBlock('.shijing-settings-page--styled .sjp-statuscards');
  const statusCardOk = cssBlock(
    ".shijing-settings-page--styled .sjp-statuscard[data-tone='ok'] .sjp-statuscard__dot",
  );
  const statusCardError = cssBlock(
    ".shijing-settings-page--styled .sjp-statuscard[data-tone='error'] .sjp-statuscard__dot",
  );
  const dangerButton = cssBlock('.shijing-settings-page--styled .sjp-btn--danger');
  const textareaCount = cssBlock('.shijing-settings-page--styled .sjp-textarea-count');
  const languageControl = cssBlock(
    '.shijing-settings-page--styled .shijing-ui-language-switch__control--card',
  );
  const languageOption = cssBlock(
    '.shijing-settings-page--styled .shijing-ui-language-switch__control--card .nimi-segmented-control__item',
  );
  const languageOptionSelected = cssBlock(
    '.shijing-settings-page--styled .shijing-ui-language-switch__control--card .nimi-segmented-control__item--selected',
  );
  const mobileRow = cssBlockInAtRule(
    '@media (max-width: 860px)',
    '.shijing-settings-page--styled .sjp-row',
  );

  // One white stacked card holding every module row.
  assert.match(stack, /background:\s*rgba\(255, 255, 255, 0\.88\)/);
  assert.match(stack, /border-radius:\s*var\(--sjp-radius-xl\)/);
  assert.match(stack, /box-shadow:/);
  assert.match(stack, /overflow:\s*hidden/);

  // Rows are a meta + control grid separated by hairline dividers.
  assert.match(row, /display:\s*grid/);
  assert.match(row, /grid-template-columns:\s*minmax\(200px,\s*264px\) minmax\(0,\s*1fr\)/);
  assert.match(row, /align-items:\s*start/);
  assert.match(row, /outline:\s*none/);
  assert.match(rowDivider, /border-top:\s*1px solid var\(--sjp-border-subtle\)/);
  assert.match(rowFocus, /box-shadow:\s*inset 0 0 0 3px var\(--sjp-accent-soft\)/);
  assert.match(rowCenter, /align-items:\s*center/);
  assert.match(control, /display:\s*flex/);
  assert.match(control, /flex-direction:\s*column/);

  // Status stat cards carry an explicit ok/error dot tone.
  assert.match(statusCards, /grid-template-columns:\s*1fr 1fr/);
  assert.match(statusCardOk, /background:\s*#22c55e/);
  assert.match(statusCardError, /background:\s*#ef4444/);

  // The destructive clear action reads as danger, never as a plain button.
  assert.match(dangerButton, /color:\s*#dc2626/);
  assert.match(dangerButton, /border-color:\s*rgba\(220, 38, 38, 0\.28\)/);

  // Textarea counter floats at the field's bottom-right.
  assert.match(textareaCount, /position:\s*absolute/);
  assert.match(textareaCount, /right:\s*12px/);
  assert.match(textareaCount, /bottom:\s*10px/);

  // The language switch keeps the macOS-style segmented control: a hairline
  // pill track with two equal-width options and a crisp white thumb.
  assert.match(languageControl, /width:\s*min\(100%,\s*280px\)/);
  assert.match(languageControl, /border-radius:\s*var\(--sjp-radius-full\)/);
  assert.match(languageControl, /background:\s*rgba\(15, 23, 42, 0\.04\)/);
  assert.match(languageOption, /flex:\s*1/);
  assert.match(languageOption, /min-height:\s*38px/);
  assert.match(languageOptionSelected, /background:\s*#fff/);
  assert.match(languageOptionSelected, /box-shadow:/);
  assert.match(languageOptionSelected, /color:\s*var\(--sjp-accent-hover\)/);
  assert.match(languageOptionSelected, /font-weight:\s*600/);

  // Rows stack to one column on narrow screens.
  assert.match(mobileRow, /grid-template-columns:\s*1fr/);

  // The left module rail, its pane scroll container, and the pinned page
  // chrome are gone: the whole settings page scrolls natively.
  assert.doesNotMatch(personalDataStyles, /shijing-settings-page__surface-nav/);
  assert.doesNotMatch(personalDataStyles, /shijing-settings-page__content-scroll/);
  assert.doesNotMatch(personalDataStyles, /shijing-settings-page__pane/);
  assert.doesNotMatch(personalDataStyles, /shijing-settings-page__body/);
  assert.doesNotMatch(personalDataStyles, /shijing-settings-pane-in/);
  assert.equal(
    cssBlock('.shijing-settings-page--styled.shijing-settings-page--settings'),
    '',
  );
  assert.equal(
    cssBlock('.shijing-settings-page--styled.shijing-settings-page--settings .nimi-page-detail-layout'),
    '',
  );
});
