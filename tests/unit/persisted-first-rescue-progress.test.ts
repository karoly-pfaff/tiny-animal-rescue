import { describe, expect, it, vi } from 'vitest';

import { createPersistedFirstRescueProgressStore } from '../../sources/app/first-rescue-progress';
import { createEmptySave, type SaveGameV1 } from '../../sources/persistence/save-game-schema';
import { testFirstRescueReward } from '../support/first-rescue-content';

describe('persisted first rescue progress adapter', () => {
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
});
