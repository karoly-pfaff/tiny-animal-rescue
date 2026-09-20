import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const expectedNode = packageJson.devEngines.runtime.version;
const expectedNpm = packageJson.devEngines.packageManager.version;
const npmUserAgent = process.env.npm_config_user_agent ?? '';
const actualNpm = /^npm\/(?<version>[^\s]+)/u.exec(npmUserAgent)?.groups?.version ?? 'unknown';
const mismatches = [
  process.versions.node === expectedNode
    ? undefined
    : `Node ${expectedNode} required; found ${process.versions.node}.`,
  actualNpm === expectedNpm ? undefined : `npm ${expectedNpm} required; found ${actualNpm}.`,
].filter(Boolean);

if (mismatches.length > 0) {
  console.error(mismatches.join('\n'));
  process.exit(1);
}

console.log(`Toolchain verified: Node ${expectedNode}, npm ${expectedNpm}.`);
