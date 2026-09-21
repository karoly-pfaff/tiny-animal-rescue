import { readFileSync } from 'node:fs';
import { generateSquashMessage, validateHistoryPolicy } from './lib/history-policy.mjs';

const inputIndex = process.argv.indexOf('--input');
const file = inputIndex === -1 ? undefined : process.argv[inputIndex + 1];
if (file === undefined) {
  console.error('Usage: generate-squash-message --input <pull-request-history-input.json>');
  process.exit(2);
}
const input = JSON.parse(readFileSync(file, 'utf8'));
const findings = validateHistoryPolicy({ ...input, mode: 'branch', requireComplete: true });
if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}
const message = generateSquashMessage(input);
console.log(`${message.title}\n\n${message.body}`);
