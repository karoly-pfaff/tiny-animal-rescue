import { describe, expect, it } from 'vitest';

import {
  createIndexedDbLocaleBootstrapRepository,
  createMemoryLocaleBootstrapRepository,
  parseLocaleBootstrapRecord,
} from '../../sources/persistence/locale-bootstrap-repository';
import { createIndexedDbHarness } from './support/indexed-db-harness';

describe('locale bootstrap repository', () => {
  it.each([
    [{ locale: 'hu', schemaVersion: 1 }, 'hu'],
    [{ locale: 'en', schemaVersion: 1 }, 'en'],
    [{ locale: 'hu', schemaVersion: 2 }, null],
    [{ locale: 'de', schemaVersion: 1 }, null],
    ['corrupt', null],
    [null, null],
  ] as const)('parses versioned bootstrap data safely', (record, expected) => {
    expect(parseLocaleBootstrapRecord(record)).toBe(expected);
  });

  it('stores a selected locale behind the memory repository contract', async () => {
    const repository = createMemoryLocaleBootstrapRepository();
    expect(await repository.readLocale()).toBeNull();
    await repository.writeLocale('en');
    expect(await repository.readLocale()).toBe('en');
    await repository.clearLocale();
    expect(await repository.readLocale()).toBeNull();
  });

  it('reads and writes a versioned IndexedDB record', async () => {
    const harness = createIndexedDbHarness({
      records: { 'settings-hints': { locale: { locale: 'hu', schemaVersion: 1 } } },
    });
    const repository = createIndexedDbLocaleBootstrapRepository(harness.factory);

    expect(await repository.readLocale()).toBe('hu');
    await repository.writeLocale('en');

    expect(harness.getValue('settings-hints', 'locale')).toEqual({
      locale: 'en',
      schemaVersion: 1,
    });
    await repository.clearLocale();
    expect(harness.getValue('settings-hints', 'locale')).toBeUndefined();
    expect(harness.getCloseCount()).toBe(3);
  });

  it('degrades safely when IndexedDB is unavailable', async () => {
    const repository = createIndexedDbLocaleBootstrapRepository(undefined);
    expect(await repository.readLocale()).toBeNull();
    await expect(repository.writeLocale('hu')).rejects.toThrow('IndexedDB is unavailable.');
    await expect(repository.clearLocale()).rejects.toThrow('IndexedDB is unavailable.');
  });

  it.each(['open', 'get', 'transaction', 'abort'] as const)(
    'closes or rejects safely for an IndexedDB %s failure',
    async (failureMode) => {
      const harness = createIndexedDbHarness({ failureMode });
      const repository = createIndexedDbLocaleBootstrapRepository(harness.factory);
      const operation =
        failureMode === 'open' || failureMode === 'get'
          ? repository.readLocale()
          : repository.writeLocale('hu');

      await expect(operation).rejects.toBeTruthy();
      expect(harness.getCloseCount()).toBe(failureMode === 'open' ? 0 : 1);
    },
  );

  it.each(['transaction', 'abort'] as const)(
    'keeps the prior locale when clearing is interrupted by an IndexedDB %s',
    async (failureMode) => {
      const stored = { locale: 'en', schemaVersion: 1 };
      const harness = createIndexedDbHarness({
        failureMode,
        records: { 'settings-hints': { locale: stored } },
      });
      const repository = createIndexedDbLocaleBootstrapRepository(harness.factory);

      await expect(repository.clearLocale()).rejects.toBeTruthy();
      expect(harness.getValue('settings-hints', 'locale')).toEqual(stored);
      expect(harness.getCloseCount()).toBe(1);
    },
  );
});
