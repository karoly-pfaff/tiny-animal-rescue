import { readFile } from 'node:fs/promises';
import { validateAssetRecord } from './lib/asset-policy.mjs';

const fixtures = JSON.parse(
  await readFile('tests/fixtures/assets/asset-policy-cases.json', 'utf8'),
);
const failures = fixtures.flatMap((fixture) => {
  const findings = validateAssetRecord(fixture.record, fixture.promptText, fixture.dimensions);
  return (findings.length === 0) === fixture.valid
    ? []
    : [`${fixture.name}: expected valid=${String(fixture.valid)}, got ${findings.join(' | ')}`];
});

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Validated ${String(fixtures.length)} asset-policy fixture(s).`);
