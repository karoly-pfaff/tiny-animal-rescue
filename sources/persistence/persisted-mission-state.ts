type PersistedMissionStepState =
  | Readonly<{ interaction: 'drag'; placedItemIds: readonly string[]; stepId: string }>
  | Readonly<{ interaction: 'match'; matchedPairIds: readonly string[]; stepId: string }>
  | Readonly<{ interaction: 'tap'; acknowledged: boolean; stepId: string }>
  | Readonly<{ interaction: 'trace'; progress: number; stepId: string }>
  | Readonly<{ clearedCellIds: readonly string[]; interaction: 'wipe'; stepId: string }>;

export type PersistedCurrentMission = Readonly<{
  completedStepIds: readonly string[];
  missionId: string;
  stepState?: PersistedMissionStepState;
}>;

type MissionStepType = PersistedMissionStepState['interaction'];
type PersistenceKey = string;

const acknowledgedKey = 'acknowledged' satisfies PersistenceKey;
const clearedCellIdsKey = 'clearedCellIds' satisfies PersistenceKey;
const completedStepIdsKey = 'completedStepIds' satisfies PersistenceKey;
const missionIdKey = 'missionId' satisfies PersistenceKey;
const currentMissionRequiredKeys = [completedStepIdsKey, missionIdKey];
const stepStateKey = 'stepState' satisfies PersistenceKey;
const currentMissionOptionalKeys = [stepStateKey];
const dragInteraction = 'drag' satisfies MissionStepType;
const interactionKey = 'interaction' satisfies PersistenceKey;
const matchInteraction = 'match' satisfies MissionStepType;
const matchedPairIdsKey = 'matchedPairIds' satisfies PersistenceKey;
const placedItemIdsKey = 'placedItemIds' satisfies PersistenceKey;
const progressKey = 'progress' satisfies PersistenceKey;
const stepIdKey = 'stepId' satisfies PersistenceKey;
const tapInteraction = 'tap' satisfies MissionStepType;
const traceInteraction = 'trace' satisfies MissionStepType;
const wipeInteraction = 'wipe' satisfies MissionStepType;

export function isPersistedCurrentMission(value: unknown): value is PersistedCurrentMission {
  if (!isCurrentMissionRecord(value)) {
    return false;
  }
  return hasValidCurrentMissionValues(value);
}

function isCurrentMissionRecord(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) && hasExactKeys(value, currentMissionRequiredKeys, currentMissionOptionalKeys)
  );
}

function hasValidCurrentMissionValues(value: Record<string, unknown>): boolean {
  const stepState = value['stepState'];
  return (
    typeof value['missionId'] === 'string' &&
    isStringArray(value['completedStepIds']) &&
    (stepState === undefined || isPersistedMissionStepState(stepState))
  );
}

function isPersistedMissionStepState(value: unknown): value is PersistedMissionStepState {
  if (!hasStepIdentity(value)) {
    return false;
  }
  const interaction = value['interaction'];
  return typeof interaction === 'string' && validators.get(interaction)?.(value) === true;
}

type StepStateValidator = (value: Record<string, unknown>) => boolean;

const validators = new Map<string, StepStateValidator>([
  [
    dragInteraction,
    (value) =>
      hasExactKeys(value, [interactionKey, placedItemIdsKey, stepIdKey]) &&
      isStringArray(value['placedItemIds']),
  ],
  [
    matchInteraction,
    (value) =>
      hasExactKeys(value, [interactionKey, matchedPairIdsKey, stepIdKey]) &&
      isStringArray(value['matchedPairIds']),
  ],
  [
    tapInteraction,
    (value) =>
      hasExactKeys(value, [acknowledgedKey, interactionKey, stepIdKey]) &&
      typeof value['acknowledged'] === 'boolean',
  ],
  [
    traceInteraction,
    (value) =>
      hasExactKeys(value, [interactionKey, progressKey, stepIdKey]) &&
      isProgress(value['progress']),
  ],
  [
    wipeInteraction,
    (value) =>
      hasExactKeys(value, [clearedCellIdsKey, interactionKey, stepIdKey]) &&
      isStringArray(value['clearedCellIds']),
  ],
]);

function hasExactKeys(
  value: Record<string, unknown>,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): boolean {
  const ownKeys = Object.keys(value);
  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
  return (
    requiredKeys.every((key) => Object.hasOwn(value, key)) &&
    ownKeys.every((key) => allowedKeys.has(key))
  );
}

function hasStepIdentity(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value['stepId'] === 'string';
}

function isProgress(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
