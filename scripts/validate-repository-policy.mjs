import { readFile } from 'node:fs/promises';
import { validateRepositoryPolicy } from './lib/repository-policy.mjs';

const [settings, ruleset, workflow] = await Promise.all([
  readFile('deploy/github/repository-settings.json', 'utf8').then(JSON.parse),
  readFile('deploy/github/main-ruleset.json', 'utf8').then(JSON.parse),
  readFile('.github/workflows/ci.yml', 'utf8'),
]);
const findings = validateRepositoryPolicy({ settings, ruleset, workflow });
if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}
console.log('Validated repository settings, main ruleset, and required CI workflow.');
