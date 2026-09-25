import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { cwd, execPath } from 'node:process';
import { describe, expect, it } from 'vitest';

const validator = resolve(cwd(), 'scripts/validate-localization.mjs');

function runValidator(path: string) {
  return spawnSync(execPath, [validator, '--file', path], {
    cwd: cwd(),
    encoding: 'utf8',
  });
}

describe('localization boundary', () => {
  it('accepts production sources whose player text comes from i18n', () => {
    const result = runValidator(resolve(cwd(), 'sources'));

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('accepts standard ARIA attributes without treating their values as copy', () => {
    const fixture = resolve(cwd(), 'sources', 'app', 'language-gate.tsx');
    const result = runValidator(fixture);

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('accepts build-time content glob paths as technical literals', () => {
    const fixture = resolve(
      cwd(),
      'tests',
      'fixtures',
      'localization',
      'import-meta-glob.fixture.txt',
    );
    const result = runValidator(fixture);

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('accepts explicitly typed content data and developer diagnostics', () => {
    const fixture = resolve(
      cwd(),
      'tests',
      'fixtures',
      'localization',
      'technical-content-data.fixture.txt',
    );
    const result = runValidator(fixture);

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it.each([
    'indirect-jsx',
    'conditional-jsx',
    'browser-sink',
    'aria-label',
    'style-copy',
    'technical-content-leak',
  ])('rejects the %s negative fixture', (fixtureName) => {
    const fixture = resolve(
      cwd(),
      'tests',
      'fixtures',
      'localization',
      `${fixtureName}.fixture.txt`,
    );
    const result = runValidator(fixture);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Player-facing text must come from sources/i18n');
  });
});
