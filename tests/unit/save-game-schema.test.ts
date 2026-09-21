import { describe, expect, it } from 'vitest';

import { createEmptySave, migrateSaveGame } from '../../sources/persistence/save-game-schema';

const timestamp = '2026-09-21T12:00:00.000Z';

describe('save game schema', () => {
  it('creates and accepts a versioned empty save', () => {
    const save = createEmptySave('hu', timestamp);
    expect(migrateSaveGame(save, timestamp)).toEqual({ save, status: 'ready' });
  });

  it('migrates version zero deterministically', () => {
    const result = migrateSaveGame(
      {
        completedMissionIds: ['garden-kitten-tree'],
        locale: 'en',
        schemaVersion: 0,
        unlockedResidentIds: ['mimi-kitten'],
        worldFlags: ['mimi-rescued'],
      },
      timestamp,
    );

    expect(result?.save).toMatchObject({
      completedMissionIds: ['garden-kitten-tree'],
      createdAt: timestamp,
      locale: 'en',
      schemaVersion: 1,
      unlockedResidentIds: ['mimi-kitten'],
      updatedAt: timestamp,
      worldFlags: ['mimi-rescued'],
    });
  });

  it.each([
    null,
    'corrupt',
    { schemaVersion: 0 },
    { schemaVersion: 1 },
    { schemaVersion: -1 },
    {
      completedMissionIds: [],
      createdAt: timestamp,
      locale: 'hu',
      schemaVersion: 1,
      settings: null,
      unlockedResidentIds: [],
      updatedAt: timestamp,
      worldFlags: [],
    },
  ])('rejects corrupt data without treating it as a valid save', (value) => {
    expect(migrateSaveGame(value, timestamp)).toBeNull();
  });

  it('recognizes a future version without exposing it for overwrite', () => {
    expect(migrateSaveGame({ schemaVersion: 2 }, timestamp)).toEqual({
      save: null,
      status: 'unsupported-version',
    });
  });
});
