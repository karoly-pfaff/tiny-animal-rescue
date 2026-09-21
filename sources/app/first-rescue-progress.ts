export type FirstRescueProgress = Readonly<{
  completedMissionIds: readonly FirstRescueMissionId[];
  unlockedResidentIds: readonly FirstRescueResidentId[];
  worldFlags: readonly FirstRescueWorldFlag[];
}>;

export type FirstRescueProgressStore = Readonly<{
  commitReward: () => Promise<FirstRescueProgress>;
  read: () => FirstRescueProgress;
}>;

type FirstRescueMissionId = 'garden-kitten-tree';
type FirstRescueResidentId = 'mimi-kitten';
type FirstRescueWorldFlag = 'mimi-rescued';

const missionId = 'garden-kitten-tree' satisfies FirstRescueMissionId;
const residentId = 'mimi-kitten' satisfies FirstRescueResidentId;
const worldFlag = 'mimi-rescued' satisfies FirstRescueWorldFlag;

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

export function createSessionFirstRescueProgressStore(
  initialProgress: FirstRescueProgress = emptyFirstRescueProgress,
): FirstRescueProgressStore {
  let progress = initialProgress;
  return {
    commitReward: () => {
      progress = applyFirstRescueReward(progress);
      return Promise.resolve(progress);
    },
    read: () => progress,
  };
}

function appendUnique<Value>(values: readonly Value[], value: Value): readonly Value[] {
  return values.includes(value) ? values : [...values, value];
}
