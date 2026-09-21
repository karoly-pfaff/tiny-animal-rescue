import { describe, expect, it } from 'vitest';

import {
  applyFirstRescueReward,
  createSessionFirstRescueProgressStore,
  emptyFirstRescueProgress,
  hasFirstRescueReward,
} from '../../sources/app/first-rescue-progress';

describe('first rescue reward', () => {
  it('adds the mission, Mimi, and world flag exactly once', async () => {
    const store = createSessionFirstRescueProgressStore();

    expect(hasFirstRescueReward(store.read())).toBe(false);
    await store.commitReward();
    await store.commitReward();

    expect(store.read()).toEqual({
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: ['mimi-kitten'],
      worldFlags: ['mimi-rescued'],
    });
    expect(hasFirstRescueReward(store.read())).toBe(true);
  });

  it('does not mutate the previous progress snapshot', () => {
    const rewarded = applyFirstRescueReward(emptyFirstRescueProgress);

    expect(emptyFirstRescueProgress).toEqual({
      completedMissionIds: [],
      unlockedResidentIds: [],
      worldFlags: [],
    });
    expect(rewarded).not.toBe(emptyFirstRescueProgress);
  });
});
