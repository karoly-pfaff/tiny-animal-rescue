import { describe, expect, it } from 'vitest';

import { createEmptySave, migrateSaveGame } from '../../sources/persistence/save-game-schema';
import { applySequentialSaveMigrations } from '../../sources/persistence/save-game-migrations';
import saveVersionZero from '../fixtures/persistence/save-v0.json';

const timestamp = '2026-09-21T12:00:00.000Z';

describe('save game schema', () => {
  it('creates and accepts a versioned empty save', () => {
    const save = createEmptySave('hu', timestamp);
    expect(migrateSaveGame(save, timestamp)).toEqual({ save, status: 'ready' });
  });

  it.each([
    { interaction: 'drag', placedItemIds: ['ladder'], stepId: 'place-ladder' },
    { interaction: 'match', matchedPairIds: ['blanket'], stepId: 'match-blanket' },
    { acknowledged: true, interaction: 'tap', stepId: 'greet-mimi' },
    { interaction: 'trace', progress: 0.5, stepId: 'trace-path' },
    { clearedCellIds: ['0-0'], interaction: 'wipe', stepId: 'wipe-mud' },
  ])('accepts bounded resumable $interaction state', (stepState) => {
    const save = {
      ...createEmptySave('hu', timestamp),
      currentMission: {
        completedStepIds: ['intro'],
        missionId: 'mission-id',
        stepState,
      },
    };

    expect(migrateSaveGame(save, timestamp)).toEqual({ save, status: 'ready' });
  });

  it.each([
    { interaction: 'trace', progress: 2, stepId: 'trace-path' },
    { interaction: 'wipe', stepId: 'wipe-mud' },
    { interaction: 'custom', payload: {}, stepId: 'run-code' },
    { acknowledged: true, interaction: 'tap', payload: {}, stepId: 'greet-mimi' },
    { interaction: '__proto__', stepId: 'unsafe' },
    { interaction: 'constructor', stepId: 'unsafe' },
    { interaction: 'toString', stepId: 'unsafe' },
  ])('rejects invalid or executable resumable state', (stepState) => {
    const save = {
      ...createEmptySave('hu', timestamp),
      currentMission: { completedStepIds: [], missionId: 'mission-id', stepState },
    };

    expect(migrateSaveGame(save, timestamp)).toBeNull();
  });

  it('rejects undeclared current-mission fields', () => {
    const save = {
      ...createEmptySave('hu', timestamp),
      currentMission: { completedStepIds: [], missionId: 'mission-id', payload: {} },
    };

    expect(migrateSaveGame(save, timestamp)).toBeNull();
  });

  it('migrates version zero deterministically', () => {
    const fixtureBeforeMigration = structuredClone(saveVersionZero);
    const result = migrateSaveGame(saveVersionZero, timestamp);

    expect(result?.save).toMatchObject({
      completedMissionIds: ['garden-kitten-tree'],
      createdAt: timestamp,
      locale: 'en',
      schemaVersion: 1,
      unlockedResidentIds: ['mimi-kitten'],
      updatedAt: timestamp,
      worldFlags: ['mimi-rescued'],
    });
    expect(saveVersionZero).toEqual(fixtureBeforeMigration);
  });

  it('stops a sequential migration when the next migration is unavailable', () => {
    expect(applySequentialSaveMigrations(saveVersionZero, timestamp, 2)).toBeNull();
  });

  it.each([
    null,
    'corrupt',
    { schemaVersion: 0 },
    { schemaVersion: 1 },
    { schemaVersion: -1 },
    { schemaVersion: 'one' },
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
