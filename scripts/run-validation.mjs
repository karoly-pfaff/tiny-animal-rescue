import { spawn } from 'node:child_process';
import { npmProcess } from './lib/npm-process.mjs';

const groups = {
  quick: [
    'format:check',
    'lint',
    'typecheck',
    'test',
    'test:content',
    'test:assets',
    'test:voice-prompts',
    'test:a11y',
    'scan:secrets',
    'scan:watermarks',
    'build',
  ],
  full: [
    'validate:quick',
    'lint:history',
    'validate:waivers',
    'audit:dependencies',
    'audit:licenses',
    'scan:static',
    'test:preview',
    'test:e2e',
    'test:visual',
    'test:artifact',
  ],
  release: [
    'validate:full',
    'test:content:release',
    'test:assets:materialized',
    'sbom',
    'test:artifact',
  ],
};

const groupName = process.argv[2];
const scripts = groups[groupName];

if (scripts === undefined) {
  console.error(`Unknown validation group: ${groupName ?? '(missing)'}.`);
  process.exit(2);
}

for (const script of scripts) {
  console.log(`\n> validation:${groupName} -> npm run ${script}`);
  const invocation = npmProcess(['run', script]);
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(invocation.command, invocation.arguments, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
