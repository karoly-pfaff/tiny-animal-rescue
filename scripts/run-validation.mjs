import { spawn } from 'node:child_process';
import { npmProcess } from './lib/npm-process.mjs';
import { validateValidationGroups, validationGroups } from './lib/validation-groups.mjs';

const groupName = process.argv[2];
const scripts = validationGroups[groupName];

const groupFindings = validateValidationGroups(validationGroups);
if (groupFindings.length > 0) {
  console.error(groupFindings.join('\n'));
  process.exit(1);
}

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
