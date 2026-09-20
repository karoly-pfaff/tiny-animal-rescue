import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ignoredDirectories = new Set([
  '.git',
  'build',
  'coverage',
  'node_modules',
  'playwright-report',
  'test-results',
]);

export async function listRepositoryFiles(root = '.') {
  const files = [];
  const pending = [path.resolve(root)];

  while (pending.length > 0) {
    const directory = pending.pop();
    if (directory === undefined) {
      continue;
    }

    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolutePath);
      } else if (entry.isFile()) {
        files.push(absolutePath);
      }
    }
  }

  return files.sort();
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export function repositoryPath(filePath) {
  return path.relative(process.cwd(), filePath).replaceAll('\\', '/');
}
