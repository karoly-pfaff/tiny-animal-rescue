import type { RescueRewardDefinition } from '../content/first-rescue-content';
import type { Locale } from '../i18n/localization';
import type { SaveGameRepository, SaveGameV1 } from '../persistence/save-game-repository';

export type FirstRescueProgress = Readonly<{
  completedMissionIds: readonly string[];
  unlockedResidentIds: readonly string[];
  worldFlags: readonly string[];
}>;

export type FirstRescueProgressStore = Readonly<{
  commitReward: (locale: Locale, reward: RescueRewardDefinition) => Promise<FirstRescueProgress>;
  load: (locale: Locale) => Promise<FirstRescueProgressLoadStatus>;
  read: () => FirstRescueProgress;
}>;

export type FirstRescueProgressLoadStatus = 'ready' | 'recovered-corrupt' | 'unsupported-version';

const readyLoadStatus = 'ready' satisfies FirstRescueProgressLoadStatus;

export const emptyFirstRescueProgress: FirstRescueProgress = {
  completedMissionIds: [],
  unlockedResidentIds: [],
  worldFlags: [],
};

export function applyFirstRescueReward(
  progress: FirstRescueProgress,
  reward: RescueRewardDefinition,
): FirstRescueProgress {
  return {
    completedMissionIds: appendUnique(progress.completedMissionIds, reward.missionId),
    unlockedResidentIds: appendUnique(progress.unlockedResidentIds, reward.residentId),
    worldFlags: reward.worldFlags.reduce(appendUnique, progress.worldFlags),
  };
}

export function hasFirstRescueReward(
  progress: FirstRescueProgress,
  reward: RescueRewardDefinition,
): boolean {
  return (
    progress.completedMissionIds.includes(reward.missionId) &&
    progress.unlockedResidentIds.includes(reward.residentId) &&
    reward.worldFlags.every((flag) => progress.worldFlags.includes(flag))
  );
}

export function hasResident(progress: FirstRescueProgress, residentId: string): boolean {
  return progress.unlockedResidentIds.includes(residentId);
}

export function createSessionFirstRescueProgressStore(
  initialProgress: FirstRescueProgress = emptyFirstRescueProgress,
): FirstRescueProgressStore {
  let progress = initialProgress;
  return {
    commitReward: (_locale, reward) => {
      progress = applyFirstRescueReward(progress, reward);
      return Promise.resolve(progress);
    },
    load: () => Promise.resolve(readyLoadStatus),
    read: () => progress,
  };
}

export function createPersistedFirstRescueProgressStore(
  repository: SaveGameRepository,
): FirstRescueProgressStore {
  let progress = emptyFirstRescueProgress;
  return {
    async commitReward(locale, reward) {
      const save = await repository.update(locale, (currentSave) =>
        saveWithFirstRescueReward(currentSave, reward),
      );
      progress = progressFromSave(save);
      return progress;
    },
    async load(locale) {
      const result = await repository.load(locale);
      if (result.save !== null) {
        progress = progressFromSave(result.save);
      }
      return result.status;
    },
    read: () => progress,
  };
}

function saveWithFirstRescueReward(save: SaveGameV1, reward: RescueRewardDefinition): SaveGameV1 {
  return {
    ...save,
    completedMissionIds: appendUnique(save.completedMissionIds, reward.missionId),
    unlockedResidentIds: appendUnique(save.unlockedResidentIds, reward.residentId),
    worldFlags: reward.worldFlags.reduce(appendUnique, save.worldFlags),
  };
}

function progressFromSave(save: SaveGameV1): FirstRescueProgress {
  return {
    completedMissionIds: [...save.completedMissionIds],
    unlockedResidentIds: [...save.unlockedResidentIds],
    worldFlags: [...save.worldFlags],
  };
}

function appendUnique<Value>(values: readonly Value[], value: Value): readonly Value[] {
  return values.includes(value) ? values : [...values, value];
}
