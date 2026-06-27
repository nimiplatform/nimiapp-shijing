import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const VITE_CONFIG_SOURCE = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

const LINKED_KIT_ENTRYPOINTS = [
  ['@nimiplatform/kit/core/model-config', 'core/src/model-config/index.ts'],
  ['@nimiplatform/kit/core/sdk-contract', 'core/src/sdk-contract.ts'],
  ['@nimiplatform/kit/core/shell-mode', 'core/src/shell-mode.ts'],
  ['@nimiplatform/kit/features/model-picker', 'features/model-picker/src/index.ts'],
  ['@nimiplatform/kit/features/model-picker/ui', 'features/model-picker/src/ui.ts'],
  ['@nimiplatform/kit/shell/capabilities', 'shell/capabilities/src/index.ts'],
];

test('Vite aliases every linked kit public entrypoint used by linked kit source', () => {
  for (const [specifier, sourcePath] of LINKED_KIT_ENTRYPOINTS) {
    const viteRegexLiteral = specifier.replaceAll('/', '\\/');

    assert.ok(
      VITE_CONFIG_SOURCE.includes(
        `{ find: /^${viteRegexLiteral}$/, replacement: path.resolve(nimiKitSourceRoot, '${sourcePath}') }`,
      ),
      `${specifier} should resolve to linked kit source`,
    );
  }
});

test('Vite excludes linked kit public entrypoints from dependency optimization', () => {
  for (const [specifier] of LINKED_KIT_ENTRYPOINTS) {
    assert.ok(
      VITE_CONFIG_SOURCE.includes(`'${specifier}'`),
      `${specifier} should be listed in optimizeDeps.exclude`,
    );
  }
});
