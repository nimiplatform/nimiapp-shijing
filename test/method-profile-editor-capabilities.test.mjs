import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readCssBundle, settingsCssFiles } from './css-bundles.mjs';

const editorSource = readFileSync(
  new URL('../src/product/settings/method-profile-editor.tsx', import.meta.url),
  'utf8',
);
const personalDataStyles = readCssBundle(settingsCssFiles).replace(/\/\*[\s\S]*?\*\//g, '');

test('method profile editor renders the feature capability declaration next to the switcher', () => {
  assert.match(editorSource, /deriveMethodProfileCapabilityRows/u);
  assert.match(editorSource, /const capabilityRows = deriveMethodProfileCapabilityRows\(\)/u);
  assert.match(editorSource, /copy\.methodProfile\.capabilities\.title/u);
  assert.match(editorSource, /data-method-profile-id=\{row\.method_profile_id\}/u);
  assert.match(editorSource, /data-mingjing-route-status=\{row\.mingjing_route\.status\}/u);
  assert.match(editorSource, /row\.algorithm_neutral_features\.map/u);
  assert.match(editorSource, /row\.mingjing_route\.supported_features\.map/u);
  assert.match(editorSource, /row\.mingjing_route\.fail_close_detail/u);
  assert.match(personalDataStyles, /\.shijing-settings-page--styled \.sjp-method-capabilities/u);
  assert.match(personalDataStyles, /\.shijing-settings-page--styled \.sjp-method-capability\[data-current='true'\]/u);
  assert.match(personalDataStyles, /\.shijing-settings-page--styled \.sjp-method-capability__route\[data-mingjing-route-status='not_implemented'\]/u);
});
