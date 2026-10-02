import { spawn } from 'node:child_process';
import { npmProcess } from './lib/npm-process.mjs';
import { verifyLocalMediaCandidate } from './lib/media-qualification.mjs';

async function run(script) {
  const invocation = npmProcess(['run', script]);
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(invocation.command, invocation.arguments, {
      env: { ...process.env, VITE_MATERIALIZED_ASSETS: 'true' },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) process.exit(exitCode);
}

await run('test:visual');
await run('test:artifact');
const report = await verifyLocalMediaCandidate({
  source: '.',
  product: '.',
  materialized: '.',
});
console.log(
  `Locally prequalified the media-complete candidate: ${report.fileCount} artifact file(s), sha256 ${report.digest}.`,
);
