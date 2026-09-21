import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { npmProcess } from './lib/npm-process.mjs';

const output = [];
const invocation = npmProcess(['sbom', '--sbom-format', 'cyclonedx']);
const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(invocation.command, invocation.arguments, {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  child.stdout.on('data', (chunk) => output.push(chunk));
  child.once('error', reject);
  child.once('exit', (code) => resolve(code ?? 1));
});

if (exitCode !== 0 || output.length === 0) {
  console.error('npm did not produce a CycloneDX SBOM.');
  process.exit(exitCode || 1);
}

await mkdir('build/reports', { recursive: true });
await writeFile('build/reports/sbom.cdx.json', Buffer.concat(output));
console.log('Wrote build/reports/sbom.cdx.json.');
