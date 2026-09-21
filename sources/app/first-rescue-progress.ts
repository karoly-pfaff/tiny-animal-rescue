import type { Locale } from '../i18n/localization';
import type { SaveGameRepository, SaveGameV1 } from '../persistence/save-game-repository';

export type FirstRescueProgress = Readonly<{
  completedMissionIds: readonly FirstRescueMissionId[];
  unlockedResidentIds: readonly FirstRescueResidentId[];
  worldFlags: readonly FirstRescueWorldFlag[];
}>;

export type FirstRescueProgressStore = Readonly<{
  commitReward: (locale: Locale) => Promise<FirstRescueProgress>;
  load: (locale: Locale) => Promise<FirstRescueProgressLoadStatus>;
  read: () => FirstRescueProgress;
}>;

export type FirstRescueProgressLoadStatus = 'ready' | 'recovered-corrupt' | 'unsupported-version';

type FirstRescueMissionId = 'garden-kitten-tree';
type FirstRescueResidentId = 'mimi-kitten';
type FirstRescueWorldFlag = 'mimi-rescued';

const missionId = 'garden-kitten-tree' satisfies FirstRescueMissionId;
const residentId = 'mimi-kitten' satisfies FirstRescueResidentId;
const worldFlag = 'mimi-rescued' satisfies FirstRescueWorldFlag;
const readyLoadStatus = 'ready' satisfies FirstRescueProgressLoadStatus;

export const emptyFirstRescueProgress: FirstRescueProgress = {
  completedMissionIds: [],
  unlockedResidentIds: [],
  worldFlags: [],
};

export function applyFirstRescueReward(progress: FirstRescueProgress): FirstRescueProgress {
  return {
    completedMissionIds: appendUnique(progress.completedMissionIds, missionId),
    unlockedResidentIds: appendUnique(progress.unlockedResidentIds, residentId),
    worldFlags: appendUnique(progress.worldFlags, worldFlag),
  };
}

export function hasFirstRescueReward(progress: FirstRescueProgress): boolean {
  return (
    progress.completedMissionIds.includes(missionId) &&
    progress.unlockedResidentIds.includes(residentId) &&
    progress.worldFlags.includes(worldFlag)
  );
}

export function hasMimiResident(progress: FirstRescueProgress): boolean {
  return progress.unlockedResidentIds.includes(residentId);
}

export function createSessionFirstRescueProgressStore(
  initialProgress: FirstRescueProgress = emptyFirstRescueProgress,
): FirstRescueProgressStore {
  let progress = initialProgress;
  return {
    commitReward: () => {
      progress = applyFirstRescueReward(progress);
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
    async commitReward(locale) {
      const save = await repository.update(locale, (currentSave) =>
        saveWithFirstRescueReward(currentSave),
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

function saveWithFirstRescueReward(save: SaveGameV1): SaveGameV1 {
  return {
    ...save,
    completedMissionIds: appendUnique(save.completedMissionIds, missionId),
    unlockedResidentIds: appendUnique(save.unlockedResidentIds, residentId),
    worldFlags: appendUnique(save.worldFlags, worldFlag),
  };
}

function progressFromSave(save: SaveGameV1): FirstRescueProgress {
  return {
    completedMissionIds: save.completedMissionIds.includes(missionId) ? [missionId] : [],
    unlockedResidentIds: save.unlockedResidentIds.includes(residentId) ? [residentId] : [],
    worldFlags: save.worldFlags.includes(worldFlag) ? [worldFlag] : [],
  };
}

function appendUnique<Value>(values: readonly Value[], value: Value): readonly Value[] {
  return values.includes(value) ? values : [...values, value];
}
