import { spawn } from 'node:child_process';
import { npmProcess } from './lib/npm-process.mjs';

const invocation = npmProcess([
  'run',
  'commitlint:raw',
  '--',
  '--from',
  'main',
  '--to',
  'HEAD',
  '--verbose',
]);
const safeDirectory = process.cwd().replaceAll('\\', '/');
const child = spawn(invocation.command, invocation.arguments, {
  stdio: 'inherit',
  env: {
    ...process.env,
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'safe.directory',
    GIT_CONFIG_VALUE_0: safeDirectory,
  },
});
child.once('error', (error) => {
  throw error;
});
child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
