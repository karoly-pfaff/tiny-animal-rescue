import type { DragStep, MissionRecord, TapStep } from './mission-contract';

type InitialDragStep = DragStep & Readonly<{ sourceAsset: string }>;

export type InitialRescueMission = Omit<
  MissionRecord,
  'prerequisites' | 'steps' | 'subjectAnimalId' | 'type'
> &
  Readonly<{
    prerequisites: readonly [];
    steps: readonly [InitialDragStep, TapStep];
    subjectAnimalId: string;
    type: 'rescue';
  }>;

export function isSupportedInitialRescueMission(
  mission: MissionRecord,
): mission is InitialRescueMission {
  return hasInitialRescueMetadata(mission) && hasSupportedInitialSteps(mission.steps);
}

function hasInitialRescueMetadata(mission: MissionRecord): mission is MissionRecord &
  Readonly<{
    prerequisites: readonly [];
    subjectAnimalId: string;
    type: 'rescue';
  }> {
  return (
    mission.type === 'rescue' &&
    mission.subjectAnimalId !== undefined &&
    mission.prerequisites.length === 0
  );
}

function hasSupportedInitialSteps(
  steps: MissionRecord['steps'],
): steps is InitialRescueMission['steps'] {
  if (steps.length !== 2) {
    return false;
  }
  const [dragStep, tapStep] = steps;
  return isAuthoredDragStep(dragStep) && tapStep?.type === 'tap';
}

function isAuthoredDragStep(
  step: MissionRecord['steps'][number] | undefined,
): step is InitialDragStep {
  return step?.type === 'drag' && step.sourceAsset !== undefined;
}
