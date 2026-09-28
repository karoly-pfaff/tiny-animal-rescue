import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from 'react';

import type { NormalizedPoint } from './drag-geometry';
import { capturePointer, isPrimaryActivationPointer, releasePointer } from './pointer-capture';
import {
  advanceTraceProgress,
  beginTraceProgress,
  completeTraceProgress,
  createTraceProgress,
  type TracePath,
  type TraceProgressState,
} from './trace-progress';

type TraceInteraction = Readonly<{
  activePointerId: React.RefObject<number | null>;
  canvas: React.RefObject<HTMLCanvasElement | null>;
  completed: React.RefObject<boolean>;
  corridorWidth: number;
  gestureStartProgress: React.RefObject<number | null>;
  lastPoint: React.RefObject<NormalizedPoint | null>;
  onComplete: () => void;
  path: TracePath;
  paused: boolean;
  progress: React.RefObject<TraceProgressState>;
  setPresentation: React.Dispatch<React.SetStateAction<TraceProgressState>>;
  surface: React.RefObject<HTMLButtonElement | null>;
}>;

type TraceInteractionOptions = Readonly<{
  corridorWidth: number;
  onComplete: () => void;
  path: TracePath;
  paused: boolean;
}>;

const minimumPointerMovementSquared = 0.000_004;

export function useTraceInteraction(options: TraceInteractionOptions) {
  const activePointerId = useRef<number | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const completed = useRef(false);
  const gestureStartProgress = useRef<number | null>(null);
  const lastPoint = useRef<NormalizedPoint | null>(null);
  const progress = useRef<TraceProgressState>(createTraceProgress());
  const surface = useRef<HTMLButtonElement>(null);
  const [presentation, setPresentation] = useState<TraceProgressState>(createTraceProgress);
  const interaction = {
    ...options,
    activePointerId,
    canvas,
    completed,
    gestureStartProgress,
    lastPoint,
    progress,
    setPresentation,
    surface,
  };
  return { canvas, interaction, presentation, surface } as const;
}

export function beginTrace(
  event: ReactPointerEvent<HTMLButtonElement>,
  interaction: TraceInteraction,
): void {
  if (!canBeginTrace(event, interaction)) {
    return;
  }
  const sample = sampleFor(event);
  const result = beginTraceProgress({
    ...sample,
    corridorWidth: interaction.corridorWidth,
    path: interaction.path,
    state: interaction.progress.current,
  });
  if (!result.accepted) {
    return;
  }
  startTracePointer({ event, interaction, point: sample.point, state: result.state });
}

function canBeginTrace(
  event: ReactPointerEvent<HTMLButtonElement>,
  interaction: TraceInteraction,
): boolean {
  return (
    !interaction.paused &&
    !interaction.completed.current &&
    interaction.activePointerId.current === null &&
    isPrimaryActivationPointer(event)
  );
}

type StartTracePointerOptions = Readonly<{
  event: ReactPointerEvent<HTMLButtonElement>;
  interaction: TraceInteraction;
  point: NormalizedPoint;
  state: TraceProgressState;
}>;

function startTracePointer({ event, interaction, point, state }: StartTracePointerOptions): void {
  event.preventDefault();
  interaction.progress.current = state;
  interaction.gestureStartProgress.current = state.progress;
  interaction.setPresentation(state);
  interaction.activePointerId.current = event.pointerId;
  interaction.lastPoint.current = point;
  capturePointer(event.currentTarget, event.pointerId);
}

export function continueTrace(
  event: ReactPointerEvent<HTMLButtonElement>,
  interaction: TraceInteraction,
): void {
  if (interaction.paused || interaction.activePointerId.current !== event.pointerId) {
    return;
  }
  event.preventDefault();
  const sample = sampleFor(event);
  const from = interaction.lastPoint.current ?? sample.point;
  interaction.lastPoint.current = sample.point;
  if (!hasMeaningfulPointerMovement(from, sample.point)) {
    return;
  }
  const previousState = interaction.progress.current;
  const nextState = nextTraceState(interaction, sample, from);
  applyTraceState(interaction, previousState, nextState);
}

function nextTraceState(
  interaction: TraceInteraction,
  sample: PointerSample,
  from: NormalizedPoint,
): TraceProgressState {
  return advanceTraceProgress({
    ...sample,
    corridorWidth: interaction.corridorWidth,
    from,
    path: interaction.path,
    state: interaction.progress.current,
    to: sample.point,
  });
}

function hasMeaningfulPointerMovement(from: NormalizedPoint, to: NormalizedPoint): boolean {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  return deltaX * deltaX + deltaY * deltaY >= minimumPointerMovementSquared;
}

function applyTraceState(
  interaction: TraceInteraction,
  previousState: TraceProgressState,
  nextState: TraceProgressState,
): void {
  if (nextState !== previousState) {
    interaction.onGuidanceActivity();
    interaction.progress.current = nextState;
    interaction.setPresentation(nextState);
    completeIfNeeded(interaction, previousState, nextState);
  }
}

export function finishTrace(
  event: ReactPointerEvent<HTMLButtonElement>,
  interaction: TraceInteraction,
): void {
  if (interaction.activePointerId.current !== event.pointerId) {
    return;
  }
  continueTrace(event, interaction);
  const wrongAction = isNoProgressGesture(interaction);
  releaseTracePointer(event, interaction);
  if (wrongAction) {
    interaction.onGuidanceWrongAction();
  }
}

function isNoProgressGesture(interaction: TraceInteraction): boolean {
  const startProgress = interaction.gestureStartProgress.current;
  return (
    !interaction.completed.current &&
    startProgress !== null &&
    interaction.progress.current.progress <= startProgress
  );
}

function releaseTracePointer(
  event: ReactPointerEvent<HTMLButtonElement>,
  interaction: TraceInteraction,
): void {
  interaction.activePointerId.current = null;
  interaction.gestureStartProgress.current = null;
  interaction.lastPoint.current = null;
  releasePointer(event.currentTarget, event.pointerId);
}

export function cancelTrace(
  event: ReactPointerEvent<HTMLButtonElement>,
  interaction: TraceInteraction,
): void {
  if (interaction.activePointerId.current !== event.pointerId) {
    return;
  }
  releaseTracePointer(event, interaction);
}

export function suspendTrace(interaction: TraceInteraction): void {
  const pointerId = interaction.activePointerId.current;
  const surface = interaction.surface.current;
  interaction.activePointerId.current = null;
  interaction.gestureStartProgress.current = null;
  interaction.lastPoint.current = null;
  if (pointerId !== null && surface !== null) {
    releasePointer(surface, pointerId);
  }
}

export function activateTraceAccessibly(
  event: ReactMouseEvent<HTMLButtonElement>,
  interaction: TraceInteraction,
): void {
  if (event.detail !== 0 || interaction.paused || interaction.completed.current) {
    return;
  }
  const previousState = interaction.progress.current;
  const nextState = completeTraceProgress(previousState);
  interaction.progress.current = nextState;
  interaction.setPresentation(nextState);
  completeIfNeeded(interaction, previousState, nextState);
}

function completeIfNeeded(
  interaction: TraceInteraction,
  previousState: TraceProgressState,
  nextState: TraceProgressState,
): void {
  if (!previousState.isComplete && nextState.isComplete && !interaction.completed.current) {
    interaction.completed.current = true;
    interaction.onComplete();
  }
}

type PointerSample = Readonly<{
  aspectRatio: number;
  point: NormalizedPoint;
}>;

function sampleFor(event: ReactPointerEvent<HTMLButtonElement>): PointerSample {
  const bounds = event.currentTarget.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { aspectRatio: 1, point: { x: 0, y: 0 } };
  }
  return {
    aspectRatio: bounds.width / bounds.height,
    point: {
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
    },
  };
}
