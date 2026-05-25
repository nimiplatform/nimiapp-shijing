import { readFileSync } from 'node:fs';

const manifest = readFileSync(new URL('../nimi.app.yaml', import.meta.url), 'utf8');
const submission = readFileSync(new URL('../.nimi/admission/submission.yaml', import.meta.url), 'utf8');
if (!manifest.includes('manifest_role: submitted-input')) {
  throw new Error('submitted manifest role marker missing');
}
if (!submission.includes('submission_role: developer-submitted-input')) {
  throw new Error('developer submission role marker missing');
}
if (!submission.includes('dev_shell_command: pnpm dev:shell')) {
  throw new Error('dev shell command marker missing');
}
console.log('[nimi-app] validate pre-submission self-check passed');
