import type { MissionStep } from '../content/mission-contract';
import type { InteractionController } from './interaction-controller';
import {
  mountMissionInteraction,
  type MissionInteractionEvent,
  type MissionInteractionMounts,
} from './mission-interaction-mount';
import {
  initialMissionStepState,
  reduceMissionStepState,
  type MissionStepAction,
  type MissionStepActionType,
  type MissionStepState,
} from './mission-step-state';

const disposeAction = 'dispose' satisfies MissionStepActionType;
const pauseAction = 'pause' satisfies MissionStepActionType;
const resetAction = 'reset' satisfies MissionStepActionType;
const resumeAction = 'resume' satisfies MissionStepActionType;
const startAction = 'start' satisfies MissionStepActionType;

type MissionStepOrchestratorOptions = Readonly<{
  mounts: MissionInteractionMounts;
  onMissionComplete: () => void;
  steps: readonly MissionStep[];
}>;

export type MissionStepOrchestrator = Readonly<{
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  dispose: () => void;
  getState: () => MissionStepState;
}>;

export function createMissionStepOrchestrator(
  options: MissionStepOrchestratorOptions,
): MissionStepOrchestrator {
  let state = initialMissionStepState,
    interaction: InteractionController | null = null,
    interactionGeneration = 0;

  const transition = (action: MissionStepAction) => {
    const nextState = reduceMissionStepState(options.steps, state, action);
    const changed = nextState !== state;
    state = nextState;
    return changed;
  };
  const mountActive = () => {
    const step = options.steps[state.activeStepIndex];
    if (step === undefined || state.status !== 'active') {
      return;
    }
    const generation = interactionGeneration + 1;
    interactionGeneration = generation;
    interaction = mountMissionInteraction(options.mounts, step, (event) => {
      receive(event, generation);
    });
    interaction.start();
  };
  const receive = (event: MissionInteractionEvent, generation: number) => {
    if (generation !== interactionGeneration || !transition(event)) {
      return;
    }
    interactionGeneration += 1;
    disposeInteraction(interaction);
    interaction = null;
    if (state.status === 'completed') {
      options.onMissionComplete();
    } else {
      mountActive();
    }
  };
  const start = () => {
    if (transition({ type: startAction })) {
      mountActive();
    }
  };
  const pause = () => {
    if (transition({ type: pauseAction })) {
      interaction?.pause();
    }
  };
  const resume = () => {
    if (transition({ type: resumeAction })) {
      interaction?.resume();
    }
  };
  const reset = () => {
    if (!transition({ type: resetAction })) {
      return;
    }
    interactionGeneration += 1;
    disposeInteraction(interaction);
    interaction = null;
    start();
  };
  const dispose = () => {
    if (!transition({ type: disposeAction })) {
      return;
    }
    interactionGeneration += 1;
    disposeInteraction(interaction);
    interaction = null;
  };

  return { dispose, getState: () => state, pause, reset, resume, start };
}

function disposeInteraction(interaction: InteractionController | null): void {
  interaction?.dispose();
}
