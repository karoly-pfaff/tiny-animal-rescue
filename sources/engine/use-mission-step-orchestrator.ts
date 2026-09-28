import { useCallback, useEffect, useRef, useState } from 'react';

import type { MissionStep } from '../content/mission-contract';
import type { InteractionController } from './interaction-controller';
import type {
  MissionInteractionEvent,
  MissionInteractionMounts,
} from './mission-interaction-mount';
import {
  createMissionStepOrchestrator,
  type MissionStepOrchestrator,
} from './mission-step-orchestrator';
import type { MissionStepActionType } from './mission-step-state';

export type ActiveMissionInteraction<Step extends MissionStep> = Readonly<{
  complete: () => void;
  paused: boolean;
  revision: number;
  step: Step;
}>;

export type MissionStepOrchestratorBinding<Step extends MissionStep> = Readonly<{
  active: ActiveMissionInteraction<Step> | null;
  pause: () => void;
  reset: () => void;
  resume: () => void;
}>;

type PauseReason = symbol;

const explicitPauseReason = Symbol();
const visibilityPauseReason = Symbol();
const completeAction = 'complete' satisfies MissionStepActionType;

export function useMissionStepOrchestrator<Step extends MissionStep>(
  steps: readonly Step[],
  onMissionComplete: () => void,
): MissionStepOrchestratorBinding<Step> {
  const [active, setActive] = useState<ActiveMissionInteraction<Step> | null>(null);
  const completionRef = useRef(onMissionComplete);
  const runtimeRef = useRef<MissionStepRuntime | null>(null);

  useEffect(() => {
    completionRef.current = onMissionComplete;
  }, [onMissionComplete]);

  useEffect(() => {
    const bridge = createReactInteractionBridge(steps, setActive);
    const orchestrator = createMissionStepOrchestrator({
      mounts: bridge.mounts,
      onMissionComplete: () => {
        completionRef.current();
      },
      steps,
    });
    const runtime = createMissionStepRuntime(orchestrator);
    runtimeRef.current = runtime;
    orchestrator.start();
    const handleVisibility = () => {
      if (document.hidden) {
        runtime.pause(visibilityPauseReason);
      } else {
        runtime.resume(visibilityPauseReason);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    handleVisibility();
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      bridge.disconnect();
      orchestrator.dispose();
      if (runtimeRef.current === runtime) {
        runtimeRef.current = null;
      }
    };
  }, [steps]);

  return {
    active,
    pause: useCallback(() => runtimeRef.current?.pause(explicitPauseReason), []),
    reset: useCallback(() => runtimeRef.current?.reset(), []),
    resume: useCallback(() => runtimeRef.current?.resume(explicitPauseReason), []),
  };
}

type MissionStepRuntime = Readonly<{
  pause: (reason: PauseReason) => void;
  reset: () => void;
  resume: (reason: PauseReason) => void;
}>;

function createMissionStepRuntime(orchestrator: MissionStepOrchestrator): MissionStepRuntime {
  const pauseReasons = new Set<PauseReason>();
  return {
    pause: (reason) => {
      const wasRunning = pauseReasons.size === 0;
      pauseReasons.add(reason);
      if (wasRunning) {
        orchestrator.pause();
      }
    },
    reset: () => {
      pauseReasons.clear();
      orchestrator.reset();
    },
    resume: (reason) => {
      pauseReasons.delete(reason);
      if (pauseReasons.size === 0) {
        orchestrator.resume();
      }
    },
  };
}

type ReactInteractionBridge = Readonly<{
  disconnect: () => void;
  mounts: MissionInteractionMounts;
}>;

function createReactInteractionBridge<Step extends MissionStep>(
  steps: readonly Step[],
  publish: (active: ActiveMissionInteraction<Step> | null) => void,
): ReactInteractionBridge {
  let connected = true;
  let activeIdentity: symbol | null = null;
  const mount = (step: MissionStep, emit: (event: MissionInteractionEvent) => void) => {
    const ownedStep = requiredOwnedStep(steps, step.id);
    const identity = Symbol(step.id);
    let paused = false;
    let revision = 0;
    let started = false;
    let disposed = false;
    const complete = () => {
      emit({ stepId: step.id, type: completeAction });
    };
    const update = () => {
      if (connected && activeIdentity === identity && !disposed) {
        publish({ complete, paused, revision, step: ownedStep });
      }
    };
    return {
      dispose: () => {
        disposed = true;
        if (activeIdentity === identity) {
          activeIdentity = null;
          if (connected) {
            publish(null);
          }
        }
      },
      pause: () => {
        paused = true;
        update();
      },
      reset: () => {
        revision += 1;
        paused = false;
        update();
      },
      resume: () => {
        paused = false;
        update();
      },
      start: () => {
        if (!started && !disposed) {
          started = true;
          activeIdentity = identity;
          update();
        }
      },
    } satisfies InteractionController;
  };
  return {
    disconnect: () => {
      connected = false;
      activeIdentity = null;
    },
    mounts: { drag: mount, match: mount, tap: mount, trace: mount, wipe: mount },
  };
}

function requiredOwnedStep<Step extends MissionStep>(steps: readonly Step[], stepId: string): Step {
  const step = steps.find((candidate) => candidate.id === stepId);
  if (step === undefined) {
    throw new Error(`Mounted mission step is not owned by the active lifecycle: ${stepId}`);
  }
  return step;
}
