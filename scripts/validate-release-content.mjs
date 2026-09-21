import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { readJson } from './lib/repository-files.mjs';

async function jsonCount(directory) {
  return (await readdir(directory, { withFileTypes: true })).filter(
    (entry) => entry.isFile() && entry.name.endsWith('.json'),
  ).length;
}

let pack;
try {
  pack = await readJson('content/base/pack.json');
} catch {
  console.error('Release content is incomplete: content/base/pack.json is missing.');
  process.exit(1);
}

const animalCount = await jsonCount(path.join('content', 'base', pack.content.animals));
const missionCount = await jsonCount(path.join('content', 'base', pack.content.missions));
const findings = [];

if (animalCount !== 12) {
  findings.push(`Release requires exactly 12 residents; found ${animalCount}.`);
}
if (missionCount !== 16) {
  findings.push(`Release requires exactly 16 missions; found ${missionCount}.`);
}
if (pack.locales.length !== 2 || !pack.locales.includes('hu') || !pack.locales.includes('en')) {
  findings.push('Release base content must declare feature-equivalent hu and en locales.');
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log('Release content catalog has the required 16 missions and 12 residents.');
