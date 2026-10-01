import { describe, expect, it } from 'vitest';

import {
  applyFirstRescueReward,
  completedStepIdsForMission,
  createSessionFirstRescueProgressStore,
  emptyFirstRescueProgress,
  hasFirstRescueReward,
  hasResident,
} from '../../sources/app/first-rescue-progress';
import { testFirstRescueReward } from '../support/first-rescue-content';

describe('first rescue reward', () => {
  it('checkpoints a completed step idempotently and clears it with the atomic reward', async () => {
    const store = createSessionFirstRescueProgressStore();

    await store.commitStep('en', testFirstRescueReward.missionId, 'place-ladder');
    await store.commitStep('en', testFirstRescueReward.missionId, 'place-ladder');
    expect(store.read().currentMission).toEqual({
      completedStepIds: ['place-ladder'],
      missionId: 'garden-kitten-tree',
    });

    await store.commitReward('en', testFirstRescueReward);
    expect(store.read()).not.toHaveProperty('currentMission');
    expect(hasFirstRescueReward(store.read(), testFirstRescueReward)).toBe(true);
  });

  it('keeps an unrelated mission checkpoint and replaces it when a new step starts', async () => {
    const store = createSessionFirstRescueProgressStore({
      ...emptyFirstRescueProgress,
      currentMission: { completedStepIds: ['other-step'], missionId: 'other-mission' },
    });

    await store.commitReward('en', testFirstRescueReward);
    expect(store.read().currentMission).toEqual({
      completedStepIds: ['other-step'],
      missionId: 'other-mission',
    });
    expect(completedStepIdsForMission(store.read(), 'garden-kitten-tree')).toEqual([]);
    expect(completedStepIdsForMission(store.read(), 'other-mission')).toEqual(['other-step']);
    expect(hasResident(store.read(), 'mimi-kitten')).toBe(true);
    expect(hasResident(store.read(), 'unknown')).toBe(false);

    await store.commitStep('en', 'garden-kitten-tree', 'place-ladder');
    expect(store.read().currentMission).toEqual({
      completedStepIds: ['place-ladder'],
      missionId: 'garden-kitten-tree',
    });
    await expect(store.load('en')).resolves.toBe('ready');
    await expect(store.recoverCorrupt('en')).resolves.toEqual(emptyFirstRescueProgress);
  });

  it('adds the mission, Mimi, and world flag exactly once', async () => {
    const store = createSessionFirstRescueProgressStore();

    expect(hasFirstRescueReward(store.read(), testFirstRescueReward)).toBe(false);
    await store.commitReward('en', testFirstRescueReward);
    await store.commitReward('en', testFirstRescueReward);

    expect(store.read()).toEqual({
      completedMissionIds: ['garden-kitten-tree'],
      unlockedResidentIds: ['mimi-kitten'],
      worldFlags: ['mimi-rescued'],
    });
    expect(hasFirstRescueReward(store.read(), testFirstRescueReward)).toBe(true);
  });

  it('does not mutate the previous progress snapshot', () => {
    const rewarded = applyFirstRescueReward(emptyFirstRescueProgress, testFirstRescueReward);

    expect(emptyFirstRescueProgress).toEqual({
      completedMissionIds: [],
      unlockedResidentIds: [],
      worldFlags: [],
    });
    expect(rewarded).not.toBe(emptyFirstRescueProgress);
  });
});
