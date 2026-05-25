import { readFileSync } from 'node:fs';

const boundary = readFileSync(new URL('../.nimi/contracts/scaffold-boundary.yaml', import.meta.url), 'utf8');
if (!boundary.includes('local_audit_role: pre-submission-self-check')) {
  throw new Error('local audit role marker missing');
}
console.log('[nimi-app] local-audit pre-submission self-check passed');
