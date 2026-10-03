import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  formatMarkdownlintResults,
  selectMarkdownFiles,
} from '../../scripts/lib/markdown-lint.mjs';

const markdownlintEntryPoint = join(process.cwd(), 'scripts', 'lint-markdown.mjs');

function runMarkdownlintFixture(markdown: string) {
  const root = mkdtempSync(join(tmpdir(), 'tiny-rescue-markdownlint-'));

  try {
    writeFileSync(join(root, 'README.md'), markdown, 'utf8');
    return spawnSync(process.execPath, [markdownlintEntryPoint], {
      cwd: root,
      encoding: 'utf8',
    });
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

describe('Markdown lint adapter', () => {
  it('selects Markdown files case-insensitively without changing repository order', () => {
    expect(selectMarkdownFiles(['b.md', 'asset.png', 'A.MD', 'notes.txt'])).toEqual([
      'b.md',
      'A.MD',
    ]);
  });

  it('formats rule, location, and diagnostic detail for gate output', () => {
    const results = {
      'C:\\repo\\README.md': [
        {
          lineNumber: 7,
          ruleNames: ['MD009', 'no-trailing-spaces'],
          ruleDescription: 'Trailing spaces',
          errorDetail: 'Expected: 0 or 2; Actual: 1',
          errorContext: null,
          errorRange: [12, 1] as [number, number],
        },
      ],
    };

    expect(formatMarkdownlintResults(results, () => 'README.md')).toEqual([
      'README.md:7:12 MD009/no-trailing-spaces Trailing spaces [Expected: 0 or 2; Actual: 1]',
    ]);
  });

  it('fails the real entry point with the configured rule diagnostic for invalid Markdown', () => {
    const result = runMarkdownlintFixture('#Broken\n');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('README.md:1:1 MD018/no-missing-space-atx');
  });

  it('accepts valid Markdown through the real entry point', () => {
    const result = runMarkdownlintFixture('# Valid\n');

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Linted 1 Markdown document(s).');
  });
});
