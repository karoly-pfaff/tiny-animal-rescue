import { readFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { npmProcess } from './lib/npm-process.mjs';

const reportPath = new URL('../build/reports/jscpd/jscpd-report.json', import.meta.url);
try {
  await unlink(reportPath);
} catch (error) {
  if (error?.code !== 'ENOENT') {
    throw error;
  }
}

const invocation = npmProcess(['run', 'lint:duplicates:raw']);
const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(invocation.command, invocation.arguments, { stdio: 'inherit' });
  child.once('error', reject);
  child.once('exit', (code) => resolve(code ?? 1));
});

if (exitCode !== 0) {
  process.exit(exitCode);
}

let report;

try {
  report = JSON.parse(await readFile(reportPath, 'utf8'));
} catch (error) {
  console.error(`jscpd did not produce a readable JSON report: ${String(error)}`);
  process.exit(1);
}

const total = report.statistics?.total;
if (
  total === undefined ||
  !Number.isInteger(total.sources) ||
  total.sources < 1 ||
  !Number.isInteger(total.tokens) ||
  total.tokens < 1
) {
  console.error('jscpd report proves no eligible authored source was scanned.');
  process.exit(1);
}

if (total.clones !== 0 || total.percentage !== 0) {
  console.error(`jscpd found ${total.clones} clone(s), ${total.percentage}% duplication.`);
  process.exit(1);
}

console.log(
  `jscpd scanned ${total.sources} source(s) and ${total.tokens} token(s) with no clones.`,
);
