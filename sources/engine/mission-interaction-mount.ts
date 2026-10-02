import type {
  DragStep,
  MatchStep,
  MissionStep,
  TapStep,
  TraceStep,
  WipeStep,
} from '../content/mission-contract';
import type { InteractionController } from './interaction-controller';

export type MissionInteractionEvent = Readonly<{
  type: 'complete';
  stepId: string;
}>;

type InteractionMount<Step extends MissionStep> = (
  step: Step,
  emit: (event: MissionInteractionEvent) => void,
) => InteractionController;

export type MissionInteractionMounts = Readonly<{
  tap: InteractionMount<TapStep>;
  drag: InteractionMount<DragStep>;
  wipe: InteractionMount<WipeStep>;
  match: InteractionMount<MatchStep>;
  trace: InteractionMount<TraceStep>;
}>;

type MissionStepType = MissionStep['type'];

const dragStepType = 'drag' satisfies MissionStepType;
const matchStepType = 'match' satisfies MissionStepType;
const tapStepType = 'tap' satisfies MissionStepType;
const traceStepType = 'trace' satisfies MissionStepType;
const wipeStepType = 'wipe' satisfies MissionStepType;

export function mountMissionInteraction(
  mounts: MissionInteractionMounts,
  step: MissionStep,
  emit: (event: MissionInteractionEvent) => void,
): InteractionController {
  if (step.type === traceStepType) {
    return mounts.trace(step, emit);
  }
  return mountDomInteraction(mounts, step, emit);
}

function mountDomInteraction(
  mounts: MissionInteractionMounts,
  step: Exclude<MissionStep, TraceStep>,
  emit: (event: MissionInteractionEvent) => void,
): InteractionController {
  switch (step.type) {
    case tapStepType:
      return mounts.tap(step, emit);
    case dragStepType:
      return mounts.drag(step, emit);
    case wipeStepType:
      return mounts.wipe(step, emit);
    case matchStepType:
      return mounts.match(step, emit);
  }
}
