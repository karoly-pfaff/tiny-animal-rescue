import { describe, expect, it, vi } from 'vitest';

import { createPersistedFirstRescueProgressStore } from '../../sources/app/first-rescue-progress';
import { createEmptySave, type SaveGameV1 } from '../../sources/persistence/save-game-schema';

describe('persisted first rescue progress adapter', () => {
  it('loads saved Mimi progress and keeps replay rewards idempotent', async () => {
    let save: SaveGameV1 = {
      ...createEmptySave('en', 'created'),
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: ['mimi-kitten'],
      worldFlags: ['mimi-rescued'],
    };
    const update = vi.fn((_locale, transform: (current: SaveGameV1) => SaveGameV1) => {
      save = transform(save);
      return Promise.resolve(save);
    });
    const store = createPersistedFirstRescueProgressStore({
      load: () => Promise.resolve({ save, status: 'ready' }),
      update,
    });

    expect(await store.load('en')).toBe('ready');
    await store.commitReward('en');
    await store.commitReward('en');

    expect(save.completedMissionIds).toEqual(['garden-kitten-tree']);
    expect(save.unlockedResidentIds).toEqual(['mimi-kitten']);
    expect(save.worldFlags).toEqual(['mimi-rescued']);
    expect(update).toHaveBeenCalledTimes(2);
  });
});
