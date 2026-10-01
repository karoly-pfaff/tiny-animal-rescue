import type { RescueRewardDefinition } from '../content/first-rescue-content';
import type { Locale } from '../i18n/localization';
import type { PersistedCurrentMission } from '../persistence/persisted-mission-state';
import type { SaveGameRepository, SaveGameV1 } from '../persistence/save-game-repository';

export type FirstRescueProgress = Readonly<{
  completedMissionIds: readonly string[];
  currentMission?: PersistedCurrentMission;
  unlockedResidentIds: readonly string[];
  worldFlags: readonly string[];
}>;

export type FirstRescueProgressStore = Readonly<{
  commitReward: (locale: Locale, reward: RescueRewardDefinition) => Promise<FirstRescueProgress>;
  commitStep: (locale: Locale, missionId: string, stepId: string) => Promise<FirstRescueProgress>;
  load: (locale: Locale) => Promise<FirstRescueProgressLoadStatus>;
  read: () => FirstRescueProgress;
  recoverCorrupt: (locale: Locale) => Promise<FirstRescueProgress>;
}>;

export type FirstRescueProgressLoadStatus = 'corrupt' | 'ready' | 'unsupported-version';

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
    ...progress,
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

export function completedStepIdsForMission(
  progress: FirstRescueProgress,
  missionId: string,
): readonly string[] {
  return progress.currentMission?.missionId === missionId
    ? progress.currentMission.completedStepIds
    : [];
}

export function createSessionFirstRescueProgressStore(
  initialProgress: FirstRescueProgress = emptyFirstRescueProgress,
): FirstRescueProgressStore {
  let progress = initialProgress;
  return {
    commitReward: (_locale, reward) => {
      progress = clearCompletedCurrentMission(applyFirstRescueReward(progress, reward), reward);
      return Promise.resolve(progress);
    },
    commitStep: (_locale, missionId, stepId) => {
      progress = progressWithCompletedStep(progress, missionId, stepId);
      return Promise.resolve(progress);
    },
    load: () => Promise.resolve(readyLoadStatus),
    read: () => progress,
    recoverCorrupt: () => {
      progress = emptyFirstRescueProgress;
      return Promise.resolve(progress);
    },
  };
}

export function createPersistedFirstRescueProgressStore(
  repository: SaveGameRepository,
): FirstRescueProgressStore {
  let progress = emptyFirstRescueProgress;
  return {
    async commitReward(locale, reward) {
      const save = await repository.transaction(locale, (currentSave) =>
        saveWithFirstRescueReward(currentSave, reward),
      );
      progress = progressFromSave(save);
      return progress;
    },
    async commitStep(locale, missionId, stepId) {
      const save = await repository.transaction(locale, (currentSave) =>
        saveWithCompletedStep(currentSave, missionId, stepId),
      );
      progress = progressFromSave(save);
      return progress;
    },
    async load(locale) {
      const result = await repository.load(locale);
      progress = result.save === null ? emptyFirstRescueProgress : progressFromSave(result.save);
      return result.status;
    },
    read: () => progress,
    async recoverCorrupt(locale) {
      progress = progressFromSave(await repository.recover(locale));
      return progress;
    },
  };
}

function saveWithFirstRescueReward(save: SaveGameV1, reward: RescueRewardDefinition): SaveGameV1 {
  const rewarded: SaveGameV1 = {
    ...save,
    completedMissionIds: appendUnique(save.completedMissionIds, reward.missionId),
    unlockedResidentIds: appendUnique(save.unlockedResidentIds, reward.residentId),
    worldFlags: reward.worldFlags.reduce(appendUnique, save.worldFlags),
  };
  return save.currentMission?.missionId === reward.missionId
    ? saveWithoutCurrentMission(rewarded)
    : rewarded;
}

function saveWithCompletedStep(save: SaveGameV1, missionId: string, stepId: string): SaveGameV1 {
  const completedStepIds =
    save.currentMission?.missionId === missionId ? save.currentMission.completedStepIds : [];
  return {
    ...save,
    currentMission: {
      completedStepIds: appendUnique(completedStepIds, stepId),
      missionId,
    },
  };
}

function progressFromSave(save: SaveGameV1): FirstRescueProgress {
  return {
    completedMissionIds: [...save.completedMissionIds],
    ...(save.currentMission === undefined
      ? {}
      : {
          currentMission: {
            ...save.currentMission,
            completedStepIds: [...save.currentMission.completedStepIds],
          },
        }),
    unlockedResidentIds: [...save.unlockedResidentIds],
    worldFlags: [...save.worldFlags],
  };
}

function progressWithCompletedStep(
  progress: FirstRescueProgress,
  missionId: string,
  stepId: string,
): FirstRescueProgress {
  const completedStepIds =
    progress.currentMission?.missionId === missionId
      ? progress.currentMission.completedStepIds
      : [];
  return {
    ...progress,
    currentMission: {
      completedStepIds: appendUnique(completedStepIds, stepId),
      missionId,
    },
  };
}

function clearCompletedCurrentMission(
  progress: FirstRescueProgress,
  reward: RescueRewardDefinition,
): FirstRescueProgress {
  return progress.currentMission?.missionId === reward.missionId
    ? progressWithoutCurrentMission(progress)
    : progress;
}

function saveWithoutCurrentMission(save: SaveGameV1): SaveGameV1 {
  return {
    completedMissionIds: save.completedMissionIds,
    createdAt: save.createdAt,
    locale: save.locale,
    schemaVersion: save.schemaVersion,
    settings: save.settings,
    unlockedResidentIds: save.unlockedResidentIds,
    updatedAt: save.updatedAt,
    worldFlags: save.worldFlags,
  };
}

function progressWithoutCurrentMission(progress: FirstRescueProgress): FirstRescueProgress {
  return {
    completedMissionIds: progress.completedMissionIds,
    unlockedResidentIds: progress.unlockedResidentIds,
    worldFlags: progress.worldFlags,
  };
}

function appendUnique<Value>(values: readonly Value[], value: Value): readonly Value[] {
  return values.includes(value) ? values : [...values, value];
}
