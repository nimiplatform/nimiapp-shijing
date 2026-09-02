import { readFileSync } from 'node:fs';

const manifest = readFileSync(new URL('../nimi.app.yaml', import.meta.url), 'utf8');
const submission = readFileSync(new URL('../.nimi/admission/submission.yaml', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (!manifest.includes('manifest_role: submitted-input')) {
  throw new Error('submitted manifest role marker missing');
}
if (!submission.includes('submission_role: developer-submitted-input')) {
  throw new Error('developer submission role marker missing');
}
if (packageJson.scripts?.dev !== 'nimi-app dev --shell electron') {
  throw new Error('official dev command marker missing');
}
if (packageJson.scripts?.['dev:shell'] !== 'nimi-app dev') {
  throw new Error('official shell selection marker missing');
}
console.log('[nimi-app] validate pre-submission self-check passed');
