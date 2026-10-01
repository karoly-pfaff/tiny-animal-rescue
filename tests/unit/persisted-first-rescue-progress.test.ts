import { describe, expect, it, vi } from 'vitest';

import { createPersistedFirstRescueProgressStore } from '../../sources/app/first-rescue-progress';
import { defaultSaveSettings } from '../../sources/persistence/default-save-settings';
import { createMemorySaveGameRepository } from '../../sources/persistence/save-game-repository';
import { createEmptySave, type SaveGameV1 } from '../../sources/persistence/save-game-schema';
import { testFirstRescueReward } from '../support/first-rescue-content';

describe('persisted first rescue progress adapter', () => {
  it('commits a resumable step and clears it in the same reward transaction', async () => {
    let save: SaveGameV1 = createEmptySave('en', 'created');
    const snapshots: SaveGameV1[] = [];
    const transaction = vi.fn((_locale, transform: (current: SaveGameV1) => SaveGameV1) => {
      save = transform(save);
      snapshots.push(save);
      return Promise.resolve(save);
    });
    const store = createPersistedFirstRescueProgressStore({
      load: () => Promise.resolve({ save, status: 'ready' }),
      recover: vi.fn(),
      replace: vi.fn(),
      reset: vi.fn(),
      transaction,
    });
    await store.load('en');

    await store.commitStep('en', testFirstRescueReward.missionId, 'place-ladder');
    await store.commitStep('en', testFirstRescueReward.missionId, 'place-ladder');
    expect(save.currentMission).toEqual({
      completedStepIds: ['place-ladder'],
      missionId: 'garden-kitten-tree',
    });

    await store.commitReward('en', testFirstRescueReward);
    expect(save).not.toHaveProperty('currentMission');
    expect(save).toMatchObject({
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: ['mimi-kitten'],
      worldFlags: ['mimi-rescued'],
    });
    expect(snapshots).toHaveLength(3);
  });

  it('preserves an unrelated current mission while applying the reward', async () => {
    let save: SaveGameV1 = {
      ...createEmptySave('en', 'created'),
      currentMission: { completedStepIds: ['other-step'], missionId: 'other-mission' },
    };
    const transaction = vi.fn((_locale, transform: (current: SaveGameV1) => SaveGameV1) => {
      save = transform(save);
      return Promise.resolve(save);
    });
    const store = createPersistedFirstRescueProgressStore({
      load: () => Promise.resolve({ save, status: 'ready' }),
      recover: vi.fn(),
      replace: vi.fn(),
      reset: vi.fn(),
      transaction,
    });
    await store.load('en');

    await store.commitReward('en', testFirstRescueReward);

    expect(save.currentMission).toEqual({
      completedStepIds: ['other-step'],
      missionId: 'other-mission',
    });
  });

  it('loads saved Mimi progress and keeps replay rewards idempotent', async () => {
    let save: SaveGameV1 = {
      ...createEmptySave('en', 'created'),
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: ['mimi-kitten'],
      worldFlags: ['mimi-rescued'],
    };
    const transaction = vi.fn((_locale, transform: (current: SaveGameV1) => SaveGameV1) => {
      save = transform(save);
      return Promise.resolve(save);
    });
    const store = createPersistedFirstRescueProgressStore({
      load: () => Promise.resolve({ save, status: 'ready' }),
      recover: vi.fn(),
      replace: vi.fn(),
      reset: vi.fn(),
      transaction,
    });

    expect(await store.load('en')).toBe('ready');
    await store.commitReward('en', testFirstRescueReward);
    await store.commitReward('en', testFirstRescueReward);

    expect(save.completedMissionIds).toEqual(['garden-kitten-tree']);
    expect(save.unlockedResidentIds).toEqual(['mimi-kitten']);
    expect(save.worldFlags).toEqual(['mimi-rescued']);
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it('clears stale progress for corrupt and future saves, then installs explicit recovery', async () => {
    const completed = {
      ...createEmptySave('en', 'created'),
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: ['mimi-kitten'],
      worldFlags: ['mimi-rescued'],
    };
    const empty = createEmptySave('en', 'recovered');
    const load = vi
      .fn()
      .mockResolvedValueOnce({ save: completed, status: 'ready' })
      .mockResolvedValueOnce({ save: null, status: 'corrupt' })
      .mockResolvedValueOnce({ save: null, status: 'unsupported-version' });
    const recover = vi.fn(() => Promise.resolve(empty));
    const store = createPersistedFirstRescueProgressStore({
      load,
      recover,
      replace: vi.fn(),
      reset: vi.fn(),
      transaction: vi.fn(),
    });

    expect(await store.load('en')).toBe('ready');
    expect(store.read().unlockedResidentIds).toEqual(['mimi-kitten']);
    expect(await store.load('en')).toBe('corrupt');
    expect(store.read()).toEqual({
      completedMissionIds: [],
      unlockedResidentIds: [],
      worldFlags: [],
    });
    expect(await store.load('en')).toBe('unsupported-version');
    await expect(store.recoverCorrupt('en')).resolves.toEqual({
      completedMissionIds: [],
      unlockedResidentIds: [],
      worldFlags: [],
    });
    expect(recover).toHaveBeenCalledWith('en');
  });

  it('does not replace progress when explicit recovery fails', async () => {
    const store = createPersistedFirstRescueProgressStore({
      load: vi.fn(() => Promise.resolve({ save: null, status: 'corrupt' as const })),
      recover: vi.fn(() => Promise.reject(new Error('recovery failed'))),
      replace: vi.fn(),
      reset: vi.fn(),
      transaction: vi.fn(),
    });
    await store.load('hu');

    await expect(store.recoverCorrupt('hu')).rejects.toThrow('recovery failed');
    expect(store.read()).toEqual({
      completedMissionIds: [],
      unlockedResidentIds: [],
      worldFlags: [],
    });
  });

  it('resets only progress while preserving locale and audio settings', async () => {
    const settings = {
      effectsVolume: 0.2,
      musicVolume: 0.3,
      narrationVolume: 0.4,
      reducedMotion: true,
    };
    const repository = createMemorySaveGameRepository({
      ...createEmptySave('en', 'created'),
      completedMissionIds: ['garden-kitten-tree'],
      currentMission: { completedStepIds: ['place-ladder'], missionId: 'other-mission' },
      settings,
      unlockedResidentIds: ['mimi-kitten'],
      worldFlags: ['mimi-rescued'],
    });
    const store = createPersistedFirstRescueProgressStore(repository);
    await store.load('en');

    await expect(store.resetProgress('en')).resolves.toEqual({
      completedMissionIds: [],
      unlockedResidentIds: [],
      worldFlags: [],
    });

    await expect(repository.load('hu')).resolves.toMatchObject({
      save: {
        completedMissionIds: [],
        createdAt: 'created',
        locale: 'en',
        settings,
        unlockedResidentIds: [],
        worldFlags: [],
      },
    });
  });

  it('uses repository full reset defaults and changes in-memory state only after success', async () => {
    const completed = {
      ...createEmptySave('en', 'created'),
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: ['mimi-kitten'],
      worldFlags: ['mimi-rescued'],
    };
    const reset = vi.fn(() => Promise.resolve(createEmptySave('en', 'reset')));
    const store = createPersistedFirstRescueProgressStore({
      load: vi.fn(() => Promise.resolve({ save: completed, status: 'ready' as const })),
      recover: vi.fn(),
      replace: vi.fn(),
      reset,
      transaction: vi.fn(() => Promise.reject(new Error('write interrupted'))),
    });
    await store.load('en');

    await expect(store.resetProgress('en')).rejects.toThrow('write interrupted');
    expect(store.read().unlockedResidentIds).toEqual(['mimi-kitten']);
    await expect(store.resetAll('en')).resolves.toEqual({
      completedMissionIds: [],
      unlockedResidentIds: [],
      worldFlags: [],
    });
    expect(reset).toHaveBeenCalledWith('en');
    await expect(reset.mock.results[0]?.value).resolves.toMatchObject({
      settings: defaultSaveSettings,
    });
  });
});
