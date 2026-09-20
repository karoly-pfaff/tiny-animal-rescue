import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { readJson } from './lib/repository-files.mjs';

const allowedLicenses = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC0-1.0',
  'ISC',
  'MIT',
  'OFL-1.1',
]);
const lock = await readJson('package-lock.json');
const findings = [];
let shippedPackageCount = 0;

for (const [packagePath, metadata] of Object.entries(lock.packages ?? {})) {
  if (packagePath === '' || metadata.dev === true || !packagePath.startsWith('node_modules/')) {
    continue;
  }

  shippedPackageCount += 1;
  const manifestPath = path.join(packagePath, 'package.json');
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    findings.push(`${packagePath}: installed package manifest is missing.`);
    continue;
  }

  const license = typeof manifest.license === 'string' ? manifest.license : '';
  if (!allowedLicenses.has(license)) {
    findings.push(`${manifest.name}@${manifest.version}: blocked or unknown license "${license}".`);
  }
}

if (shippedPackageCount === 0) {
  findings.push('License audit found no shipped dependency graph to inspect.');
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log(`Validated licenses for ${shippedPackageCount} shipped package(s).`);
