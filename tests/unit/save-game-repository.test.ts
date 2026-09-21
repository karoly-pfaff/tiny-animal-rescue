import { describe, expect, it } from 'vitest';

import { createIndexedDbSaveGameRepository } from '../../sources/persistence/save-game-repository';
import { createEmptySave } from '../../sources/persistence/save-game-schema';
import { createIndexedDbHarness } from './support/indexed-db-harness';

const primaryStoreName = 'save-games';
const recoveryStoreName = 'save-recovery';
const firstTimestamp = '2026-09-21T10:00:00.000Z';
const secondTimestamp = '2026-09-21T10:01:00.000Z';

describe('IndexedDB save game repository', () => {
  it('creates an empty save and persists an idempotent reward update', async () => {
    const harness = createIndexedDbHarness();
    const repository = createIndexedDbSaveGameRepository(harness.factory, () => firstTimestamp);

    await expect(repository.load('en')).resolves.toMatchObject({
      save: { locale: 'en', schemaVersion: 1 },
      status: 'ready',
    });
    const saved = await repository.update('en', (current) => ({
      ...current,
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: ['mimi-kitten'],
      worldFlags: ['mimi-rescued'],
    }));

    expect(saved.updatedAt).toBe(firstTimestamp);
    expect(harness.getValue(primaryStoreName, 'primary')).toEqual(saved);
    expect(harness.getStoreValues(recoveryStoreName)).toEqual([]);
    expect(harness.getCloseCount()).toBe(2);
  });

  it('loads a valid save and preserves its creation timestamp on update', async () => {
    const initial = createEmptySave('hu', firstTimestamp);
    const harness = createIndexedDbHarness({
      records: {
        [primaryStoreName]: { primary: initial },
        [recoveryStoreName]: {},
      },
    });
    const repository = createIndexedDbSaveGameRepository(harness.factory, () => secondTimestamp);

    await expect(repository.load('hu')).resolves.toEqual({ save: initial, status: 'ready' });
    const saved = await repository.update('en', (current) => current);

    expect(saved.createdAt).toBe(firstTimestamp);
    expect(saved.updatedAt).toBe(secondTimestamp);
    expect(saved.locale).toBe('en');
  });

  it('quarantines corrupt data atomically on the next successful write', async () => {
    const corrupt = { damaged: true, schemaVersion: 1 };
    const harness = createIndexedDbHarness({
      records: {
        [primaryStoreName]: { primary: corrupt },
        [recoveryStoreName]: {},
      },
    });
    const repository = createIndexedDbSaveGameRepository(harness.factory, () => firstTimestamp);

    await expect(repository.load('hu')).resolves.toMatchObject({
      save: { completedMissionIds: [] },
      status: 'recovered-corrupt',
    });
    const saved = await repository.update('hu', (current) => current);

    expect(harness.getStoreValues(recoveryStoreName)).toEqual([corrupt]);
    expect(harness.getValue(primaryStoreName, 'primary')).toEqual(saved);
  });

  it('migrates version zero and refuses to overwrite a future version', async () => {
    const versionZero = {
      completedMissionIds: ['garden-kitten-tree'],
      locale: 'en',
      schemaVersion: 0,
      unlockedResidentIds: ['mimi-kitten'],
      worldFlags: ['mimi-rescued'],
    };
    const migratedHarness = createIndexedDbHarness({
      records: {
        [primaryStoreName]: { primary: versionZero },
        [recoveryStoreName]: {},
      },
    });
    const migratedRepository = createIndexedDbSaveGameRepository(
      migratedHarness.factory,
      () => firstTimestamp,
    );
    await expect(migratedRepository.load('en')).resolves.toMatchObject({
      save: { schemaVersion: 1, unlockedResidentIds: ['mimi-kitten'] },
      status: 'ready',
    });

    const future = { schemaVersion: 2 };
    const futureHarness = createIndexedDbHarness({
      records: {
        [primaryStoreName]: { primary: future },
        [recoveryStoreName]: {},
      },
    });
    const futureRepository = createIndexedDbSaveGameRepository(futureHarness.factory);
    await expect(futureRepository.load('hu')).resolves.toEqual({
      save: null,
      status: 'unsupported-version',
    });
    await expect(futureRepository.update('hu', (current) => current)).rejects.toThrow(
      'A newer save version cannot be overwritten.',
    );
    expect(futureHarness.getValue(primaryStoreName, 'primary')).toEqual(future);
  });

  it('reports unavailable IndexedDB and rejects writes', async () => {
    const repository = createIndexedDbSaveGameRepository(undefined, () => firstTimestamp);

    await expect(repository.load('hu')).rejects.toThrow('IndexedDB is unavailable.');
    await expect(repository.update('hu', (current) => current)).rejects.toThrow(
      'IndexedDB is unavailable.',
    );
  });

  it('cannot overwrite an existing save after a transient read failure', async () => {
    const initial = createEmptySave('hu', firstTimestamp);
    const harness = createIndexedDbHarness({
      failureMode: 'get',
      records: {
        [primaryStoreName]: { primary: initial },
        [recoveryStoreName]: {},
      },
    });
    const repository = createIndexedDbSaveGameRepository(harness.factory, () => secondTimestamp);

    await expect(repository.load('hu')).rejects.toBeTruthy();
    await expect(repository.update('hu', (current) => current)).rejects.toThrow(
      'Save data must load successfully before it can be updated.',
    );
    expect(harness.getValue(primaryStoreName, 'primary')).toEqual(initial);
  });

  it.each(['open', 'get', 'transaction', 'abort'] as const)(
    'rejects safely for an IndexedDB %s failure',
    async (failureMode) => {
      const harness = createIndexedDbHarness({ failureMode });
      const repository = createIndexedDbSaveGameRepository(harness.factory, () => firstTimestamp);
      const operation =
        failureMode === 'open' || failureMode === 'get'
          ? repository.load('hu')
          : repository.load('hu').then(() => repository.update('hu', (current) => current));

      await expect(operation).rejects.toBeTruthy();
      const expectedCloseCount = failureMode === 'open' ? 0 : failureMode === 'get' ? 1 : 2;
      expect(harness.getCloseCount()).toBe(expectedCloseCount);
    },
  );
});
