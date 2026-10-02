import type { MissionStep } from '../content/mission-contract';

export type MissionStepState = Readonly<{
  activeStepIndex: number;
  completedStepIds: readonly string[];
  status: 'ready' | 'active' | 'paused' | 'completed' | 'disposed';
}>;

type MissionStepStatus = MissionStepState['status'];

export type MissionStepAction =
  | Readonly<{ type: 'start' }>
  | Readonly<{ type: 'pause' }>
  | Readonly<{ type: 'resume' }>
  | Readonly<{ type: 'reset' }>
  | Readonly<{ type: 'complete'; stepId: string }>
  | Readonly<{ type: 'dispose' }>;

export type MissionStepActionType = MissionStepAction['type'];

const activeStatus = 'active' satisfies MissionStepStatus;
const completeAction = 'complete' satisfies MissionStepActionType;
const completedStatus = 'completed' satisfies MissionStepStatus;
const disposeAction = 'dispose' satisfies MissionStepActionType;
const disposedStatus = 'disposed' satisfies MissionStepStatus;
const pauseAction = 'pause' satisfies MissionStepActionType;
const pausedStatus = 'paused' satisfies MissionStepStatus;
const readyStatus = 'ready' satisfies MissionStepStatus;
const resetAction = 'reset' satisfies MissionStepActionType;
const resumeAction = 'resume' satisfies MissionStepActionType;
const startAction = 'start' satisfies MissionStepActionType;

export const initialMissionStepState: MissionStepState = {
  activeStepIndex: 0,
  completedStepIds: [],
  status: readyStatus,
};

export function reduceMissionStepState(
  steps: readonly MissionStep[],
  state: MissionStepState,
  action: MissionStepAction,
): MissionStepState {
  if (action.type === completeAction) {
    return completeActiveStep(steps, state, action.stepId);
  }
  if (action.type === disposeAction) {
    return state.status === disposedStatus ? state : { ...state, status: disposedStatus };
  }
  return reduceMissionLifecycle(state, action);
}

function reduceMissionLifecycle(
  state: MissionStepState,
  action: Exclude<MissionStepAction, { type: 'complete' } | { type: 'dispose' }>,
): MissionStepState {
  if (action.type === resetAction) {
    return resetMissionState(state);
  }
  switch (action.type) {
    case startAction:
      return transitionStatus(state, readyStatus, activeStatus);
    case pauseAction:
      return transitionStatus(state, activeStatus, pausedStatus);
    case resumeAction:
      return transitionStatus(state, pausedStatus, activeStatus);
  }
}

function resetMissionState(state: MissionStepState): MissionStepState {
  return state.status === disposedStatus ? state : initialMissionStepState;
}

function transitionStatus(
  state: MissionStepState,
  from: MissionStepState['status'],
  to: MissionStepState['status'],
): MissionStepState {
  return state.status === from ? { ...state, status: to } : state;
}

function completeActiveStep(
  steps: readonly MissionStep[],
  state: MissionStepState,
  stepId: string,
): MissionStepState {
  const activeStep = steps[state.activeStepIndex];
  if (state.status !== activeStatus || activeStep?.id !== stepId) {
    return state;
  }
  const completedStepIds = [...state.completedStepIds, stepId];
  const activeStepIndex = state.activeStepIndex + 1;
  return activeStepIndex === steps.length
    ? { activeStepIndex, completedStepIds, status: completedStatus }
    : { activeStepIndex, completedStepIds, status: activeStatus };
}
