import { describe, expect, it, vi } from 'vitest';

import type { MissionStep } from '../../sources/content/mission-contract';
import type { InteractionController } from '../../sources/engine/interaction-controller';
import {
  type MissionInteractionEvent,
  type MissionInteractionMounts,
} from '../../sources/engine/mission-interaction-mount';
import { createMissionStepOrchestrator } from '../../sources/engine/mission-step-orchestrator';
import {
  initialMissionStepState,
  reduceMissionStepState,
} from '../../sources/engine/mission-step-state';

const hint = { delayMs: 4_000, type: 'pulse-after-delay' } as const;
const steps = [
  {
    hint,
    id: 'remove-branch',
    promptKey: 'fixture.remove-branch',
    successCue: 'effects.interaction.tap-remove',
    targetIds: ['branch'],
    type: 'tap',
  },
  {
    fallbackTargetBounds: {
      center: { x: 0.7, y: 0.5 },
      height: 0.3,
      width: 0.3,
    },
    hint,
    id: 'move-basket',
    promptKey: 'fixture.move-basket',
    snapTolerance: 0.55,
    sourceId: 'basket',
    sourcePosition: { x: 0.2, y: 0.5 },
    successCue: 'effects.interaction.drag-snap',
    targetBounds: {
      center: { x: 0.7, y: 0.5 },
      height: 0.3,
      width: 0.3,
    },
    targetId: 'basket-target',
    type: 'drag',
  },
] as const satisfies readonly MissionStep[];

type MountedInteraction = Readonly<{
  controller: InteractionController;
  emit: (event: MissionInteractionEvent) => void;
  stepId: string;
}>;

function createHarness() {
  const mounted: MountedInteraction[] = [];
  const mount = (step: MissionStep, emit: (event: MissionInteractionEvent) => void) => {
    const controller = {
      dispose: vi.fn(),
      pause: vi.fn(),
      reset: vi.fn(),
      resume: vi.fn(),
      start: vi.fn(),
    };
    mounted.push({ controller, emit, stepId: step.id });
    return controller;
  };
  const mounts = {
    drag: mount,
    match: mount,
    tap: mount,
    trace: mount,
    wipe: mount,
  } satisfies MissionInteractionMounts;
  const onMissionComplete = vi.fn();
  const orchestrator = createMissionStepOrchestrator({ mounts, onMissionComplete, steps });
  return { mounted, onMissionComplete, orchestrator };
}

describe('mission step state', () => {
  it('accepts only lifecycle transitions valid for the current state', () => {
    const active = reduceMissionStepState(steps, initialMissionStepState, { type: 'start' });
    const paused = reduceMissionStepState(steps, active, { type: 'pause' });
    const resumed = reduceMissionStepState(steps, paused, { type: 'resume' });

    expect(reduceMissionStepState(steps, initialMissionStepState, { type: 'pause' })).toBe(
      initialMissionStepState,
    );
    expect(reduceMissionStepState(steps, active, { type: 'resume' })).toBe(active);
    expect(resumed).toEqual(active);
  });

  it('ignores stale completion and cannot reset a disposed runtime', () => {
    const active = reduceMissionStepState(steps, initialMissionStepState, { type: 'start' });
    const disposed = reduceMissionStepState(steps, active, { type: 'dispose' });

    expect(reduceMissionStepState(steps, active, { type: 'complete', stepId: 'stale' })).toBe(
      active,
    );
    expect(reduceMissionStepState(steps, disposed, { type: 'reset' })).toBe(disposed);
    expect(reduceMissionStepState(steps, disposed, { type: 'dispose' })).toBe(disposed);
  });
});

describe('mission step orchestrator', () => {
  it('mounts one step at a time and advances each completion exactly once', () => {
    const { mounted, onMissionComplete, orchestrator } = createHarness();
    orchestrator.start();

    expect(mounted).toHaveLength(1);
    expect(mounted[0]?.stepId).toBe('remove-branch');
    expect(mounted[0]?.controller.start).toHaveBeenCalledOnce();

    mounted[0]?.emit({ stepId: 'remove-branch', type: 'complete' });
    mounted[0]?.emit({ stepId: 'remove-branch', type: 'complete' });
    expect(mounted).toHaveLength(2);
    expect(mounted[0]?.controller.dispose).toHaveBeenCalledOnce();
    expect(mounted[1]?.stepId).toBe('move-basket');

    mounted[1]?.emit({ stepId: 'move-basket', type: 'complete' });
    mounted[1]?.emit({ stepId: 'move-basket', type: 'complete' });
    expect(onMissionComplete).toHaveBeenCalledOnce();
    expect(orchestrator.getState()).toMatchObject({ status: 'completed' });
  });

  it('delegates pause and resume only while their transitions are valid', () => {
    const { mounted, orchestrator } = createHarness();
    orchestrator.start();
    orchestrator.start();
    orchestrator.pause();
    orchestrator.pause();
    orchestrator.resume();
    orchestrator.resume();

    expect(mounted).toHaveLength(1);
    expect(mounted[0]?.controller.pause).toHaveBeenCalledOnce();
    expect(mounted[0]?.controller.resume).toHaveBeenCalledOnce();
  });

  it('resets to a fresh first interaction and disposes permanently', () => {
    const { mounted, orchestrator } = createHarness();
    orchestrator.start();
    const staleInteraction = mounted[0];
    orchestrator.reset();

    expect(mounted).toHaveLength(2);
    expect(mounted[0]?.controller.dispose).toHaveBeenCalledOnce();
    expect(mounted[1]?.stepId).toBe('remove-branch');
    staleInteraction?.emit({ stepId: 'remove-branch', type: 'complete' });
    expect(mounted).toHaveLength(2);
    expect(orchestrator.getState()).toMatchObject({ activeStepIndex: 0, status: 'active' });

    orchestrator.dispose();
    orchestrator.dispose();
    orchestrator.reset();
    orchestrator.start();
    expect(mounted).toHaveLength(2);
    expect(mounted[1]?.controller.dispose).toHaveBeenCalledOnce();
    expect(orchestrator.getState().status).toBe('disposed');
  });
});
