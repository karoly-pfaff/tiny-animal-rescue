import type { ReactElement } from 'react';

import type {
  DragStep,
  MatchStep,
  MissionStep,
  TapStep,
  TraceStep,
  WipeStep,
} from '../content/mission-contract';
import { contentDragStart, contentDragTarget } from '../interactions/content-drag-layout';
import { DragToTarget } from '../interactions/drag-to-target';
import { Match } from '../interactions/match';
import { TapRemove } from '../interactions/tap-remove';
import { Trace } from '../interactions/trace';
import { WipeClean } from '../interactions/wipe-clean';
import type { GuidancePresentation } from './guidance-ladder-state';
import type {
  MissionStepPresentation,
  MissionStepPresentationBindings,
} from './mission-step-presentation';
import type { ActiveMissionInteraction } from './use-mission-step-orchestrator';

type MissionStepType = MissionStep['type'];
const dragStepType = 'drag' satisfies MissionStepType;
const matchStepType = 'match' satisfies MissionStepType;
const tapStepType = 'tap' satisfies MissionStepType;
const traceStepType = 'trace' satisfies MissionStepType;
const wipeStepType = 'wipe' satisfies MissionStepType;

export type {
  MissionStepPresentation,
  MissionStepPresentationBindings,
} from './mission-step-presentation';

type MissionStepRendererProps<Step extends MissionStep> = Readonly<{
  active: ActiveMissionInteraction<Step>;
  guidance: GuidancePresentation;
  onComplete: () => void;
  onGuidanceActivity: () => void;
  onGuidanceWrongAction: () => void;
  presentations: MissionStepPresentationBindings;
}>;

export function MissionStepRenderer<Step extends MissionStep>({
  active,
  guidance,
  onComplete,
  onGuidanceActivity,
  onGuidanceWrongAction,
  presentations,
}: MissionStepRendererProps<Step>): ReactElement {
  const context = {
    common: { guidance, onComplete, onGuidanceActivity, paused: active.paused },
    onGuidanceWrongAction,
    presentations,
  } as const satisfies RenderContext;
  return active.step.type === dragStepType
    ? renderDragStep(active.step, context)
    : renderNonDragStep(active.step, context);
}

function renderNonDragStep(
  step: Exclude<MissionStep, DragStep>,
  context: RenderContext,
): ReactElement {
  switch (step.type) {
    case tapStepType:
      return renderTapStep(step, context);
    case wipeStepType:
      return renderWipeStep(step, context);
    case matchStepType:
      return renderMatchStep(step, context);
    case traceStepType:
      return renderTraceStep(step, context);
    default:
      return assertNever(step);
  }
}

type CommonInteractionProps = Readonly<{
  guidance: GuidancePresentation;
  onComplete: () => void;
  onGuidanceActivity: () => void;
  paused: boolean;
}>;

type RenderContext = Readonly<{
  common: CommonInteractionProps;
  onGuidanceWrongAction: () => void;
  presentations: MissionStepPresentationBindings;
}>;

function renderDragStep(step: DragStep, context: RenderContext): ReactElement {
  const presentation = requiredPresentation(context.presentations, step.id, dragStepType);
  return (
    <DragToTarget
      {...context.common}
      accessibleLabel={presentation.accessibleLabel}
      completionAnnouncement={presentation.completionAnnouncement}
      onGuidanceWrongAction={context.onGuidanceWrongAction}
      sourceId={step.sourceId}
      sourceVisual={presentation.sourceVisual}
      start={contentDragStart(step)}
      successCue={step.successCue}
      target={contentDragTarget(step, presentation.sourceAssetUrl)}
      targetId={step.targetId}
      {...(presentation.hideTargetWhenPlaced === undefined
        ? {}
        : { hideTargetWhenPlaced: presentation.hideTargetWhenPlaced })}
      {...(presentation.pointerOffsetPx === undefined
        ? {}
        : { pointerOffsetPx: presentation.pointerOffsetPx })}
      {...(presentation.sourceClassName === undefined
        ? {}
        : { sourceClassName: presentation.sourceClassName })}
    />
  );
}

function renderTapStep(step: TapStep, context: RenderContext): ReactElement {
  const presentation = requiredPresentation(context.presentations, step.id, tapStepType);
  assertOrderedIds({
    declared: step.targetIds,
    error: new Error(
      `Mission step ${step.id} tap target bindings do not match its content contract.`,
    ),
    presented: presentation.targets.map(({ id }) => id),
  });
  return (
    <TapRemove
      {...context.common}
      onGuidanceWrongAction={context.onGuidanceWrongAction}
      targets={presentation.targets}
    />
  );
}

function renderWipeStep(step: WipeStep, context: RenderContext): ReactElement {
  const presentation = requiredPresentation(context.presentations, step.id, wipeStepType);
  return (
    <WipeClean
      {...context.common}
      accessibleLabel={presentation.accessibleLabel}
      completionThreshold={step.completionRatio}
      maskColor={presentation.maskColor}
      underlay={presentation.underlay}
      {...(presentation.brushRadius === undefined ? {} : { brushRadius: presentation.brushRadius })}
      {...(presentation.columns === undefined ? {} : { columns: presentation.columns })}
      {...(presentation.rows === undefined ? {} : { rows: presentation.rows })}
    />
  );
}

function renderMatchStep(step: MatchStep, context: RenderContext): ReactElement {
  const presentation = requiredPresentation(context.presentations, step.id, matchStepType);
  assertOrderedIds({
    declared: step.pairs.map(({ sourceId }) => sourceId),
    error: new Error(
      `Mission step ${step.id} match source bindings do not match its content contract.`,
    ),
    presented: presentation.pairs.map(({ source }) => source.id),
  });
  assertOrderedIds({
    declared: step.pairs.map(({ targetId }) => targetId),
    error: new Error(
      `Mission step ${step.id} match target bindings do not match its content contract.`,
    ),
    presented: presentation.pairs.map(({ target }) => target.id),
  });
  return (
    <Match
      {...context.common}
      onGuidanceWrongAction={context.onGuidanceWrongAction}
      pairs={presentation.pairs}
    />
  );
}

function renderTraceStep(step: TraceStep, context: RenderContext): ReactElement {
  const presentation = requiredPresentation(context.presentations, step.id, traceStepType);
  return (
    <Trace
      {...context.common}
      accessibleLabel={presentation.accessibleLabel}
      corridorColor={presentation.corridorColor}
      corridorWidth={step.corridorWidth}
      endAffordance={presentation.endAffordance}
      onGuidanceWrongAction={context.onGuidanceWrongAction}
      path={presentation.path}
      progressColor={presentation.progressColor}
      startAffordance={presentation.startAffordance}
      tracer={presentation.tracer}
      {...(presentation.showHint === undefined ? {} : { showHint: presentation.showHint })}
    />
  );
}

function requiredPresentation<Type extends MissionStepPresentation['type']>(
  presentations: MissionStepPresentationBindings,
  stepId: string,
  type: Type,
): Extract<MissionStepPresentation, { type: Type }> {
  const presentation = presentations[stepId];
  if (presentation === undefined) {
    throw new Error(`Mission step ${stepId} has no presentation binding.`);
  }
  if (presentation.type !== type) {
    throw new Error(
      `Mission step ${stepId} requires a ${type} presentation, received ${presentation.type}.`,
    );
  }
  return presentation as Extract<MissionStepPresentation, { type: Type }>;
}

function assertOrderedIds({
  declared,
  error,
  presented,
}: Readonly<{
  declared: readonly string[];
  error: Error;
  presented: readonly string[];
}>): void {
  if (
    declared.length !== presented.length ||
    declared.some((id, index) => id !== presented[index])
  ) {
    throw error;
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported mission step: ${JSON.stringify(value)}`);
}
