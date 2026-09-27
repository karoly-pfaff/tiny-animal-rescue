import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from 'react';

import type { NormalizedPoint } from './drag-geometry';
import { capturePointer, isPrimaryActivationPointer, releasePointer } from './pointer-capture';
import { drawWipeStroke, type WipeStroke } from './wipe-canvas';
import {
  applyWipeStroke,
  completeWipeProgress,
  createWipeProgress,
  isWipeComplete,
  wipeCoverage,
  type WipeProgressState,
} from './wipe-progress';

type WipeInteraction = Readonly<{
  activePointerId: React.RefObject<number | null>;
  brushRadius: number;
  canvas: React.RefObject<HTMLCanvasElement | null>;
  completed: React.RefObject<boolean>;
  completionThreshold: number;
  lastPoint: React.RefObject<NormalizedPoint | null>;
  onComplete: () => void;
  paused: boolean;
  progress: React.RefObject<WipeProgressState>;
  setPresentation: React.Dispatch<React.SetStateAction<WipePresentation>>;
  strokes: React.RefObject<WipeStroke[]>;
  surface: React.RefObject<HTMLButtonElement | null>;
}>;

type WipePresentation = Readonly<{ coverage: number; isComplete: boolean }>;
type WipeInteractionOptions = Readonly<{
  brushRadius: number;
  columns: number;
  completionThreshold: number;
  onComplete: () => void;
  paused: boolean;
  rows: number;
}>;

export function useWipeInteraction(options: WipeInteractionOptions) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const activePointerId = useRef<number | null>(null);
  const lastPoint = useRef<NormalizedPoint | null>(null);
  const completed = useRef(false);
  const progress = useRef<WipeProgressState>(createWipeProgress(options.columns, options.rows));
  const strokes = useRef<WipeStroke[]>([]);
  const surface = useRef<HTMLButtonElement>(null);
  const [presentation, setPresentation] = useState<WipePresentation>({
    coverage: 0,
    isComplete: false,
  });
  const interaction = {
    ...options,
    activePointerId,
    canvas,
    completed,
    lastPoint,
    progress,
    setPresentation,
    strokes,
    surface,
  };
  return { ...presentation, canvas, interaction, strokes, surface } as const;
}

export function beginWipe(
  event: ReactPointerEvent<HTMLButtonElement>,
  interaction: WipeInteraction,
): void {
  if (
    interaction.paused ||
    interaction.completed.current ||
    interaction.activePointerId.current !== null ||
    !isPrimaryActivationPointer(event)
  ) {
    return;
  }
  event.preventDefault();
  interaction.activePointerId.current = event.pointerId;
  capturePointer(event.currentTarget, event.pointerId);
  const sample = sampleFor(event);
  interaction.lastPoint.current = sample.point;
  applyStroke({ ...sample, from: sample.point, interaction, to: sample.point });
}

export function continueWipe(
  event: ReactPointerEvent<HTMLButtonElement>,
  interaction: WipeInteraction,
): void {
  if (interaction.paused || interaction.activePointerId.current !== event.pointerId) {
    return;
  }
  event.preventDefault();
  const sample = sampleFor(event);
  applyStroke({
    ...sample,
    from: interaction.lastPoint.current ?? sample.point,
    interaction,
    to: sample.point,
  });
  interaction.lastPoint.current = sample.point;
}

export function finishWipe(
  event: ReactPointerEvent<HTMLButtonElement>,
  interaction: WipeInteraction,
): void {
  if (interaction.activePointerId.current !== event.pointerId) {
    return;
  }
  continueWipe(event, interaction);
  interaction.activePointerId.current = null;
  interaction.lastPoint.current = null;
  releasePointer(event.currentTarget, event.pointerId);
}

export function suspendWipe(interaction: WipeInteraction): void {
  const pointerId = interaction.activePointerId.current;
  const surface = interaction.surface.current;
  interaction.activePointerId.current = null;
  interaction.lastPoint.current = null;
  if (pointerId !== null && surface !== null) {
    releasePointer(surface, pointerId);
  }
}

export function cancelWipe(
  event: ReactPointerEvent<HTMLButtonElement>,
  interaction: WipeInteraction,
): void {
  if (interaction.activePointerId.current !== event.pointerId) {
    return;
  }
  interaction.activePointerId.current = null;
  interaction.lastPoint.current = null;
  releasePointer(event.currentTarget, event.pointerId);
}

export function activateWipeAccessibly(
  event: ReactMouseEvent<HTMLButtonElement>,
  interaction: WipeInteraction,
): void {
  if (event.detail !== 0 || interaction.completed.current || interaction.paused) {
    return;
  }
  interaction.progress.current = completeWipeProgress(interaction.progress.current);
  complete(interaction);
}

type ApplyStrokeOptions = Readonly<{
  aspectRatio: number;
  from: NormalizedPoint;
  interaction: WipeInteraction;
  to: NormalizedPoint;
}>;

function applyStroke({ aspectRatio, from, interaction, to }: ApplyStrokeOptions): void {
  if (interaction.completed.current) {
    return;
  }
  const stroke = { from, to };
  interaction.strokes.current.push(stroke);
  drawWipeStroke(interaction.canvas.current, stroke, interaction.brushRadius);
  const next = applyWipeStroke({
    aspectRatio,
    brushRadius: interaction.brushRadius,
    from,
    state: interaction.progress.current,
    to,
  });
  interaction.progress.current = next;
  reportProgress(next, interaction);
}

function reportProgress(next: WipeProgressState, interaction: WipeInteraction): void {
  const coverage = wipeCoverage(next);
  interaction.setPresentation((current) => ({ ...current, coverage }));
  if (isWipeComplete(next, interaction.completionThreshold)) {
    complete(interaction);
  }
}

function complete(interaction: WipeInteraction): void {
  if (interaction.completed.current) {
    return;
  }
  interaction.completed.current = true;
  interaction.setPresentation({
    coverage: wipeCoverage(interaction.progress.current),
    isComplete: true,
  });
  interaction.onComplete();
}

type PointerSample = Readonly<{ aspectRatio: number; point: NormalizedPoint }>;

function sampleFor(event: ReactPointerEvent<HTMLButtonElement>): PointerSample {
  const bounds = event.currentTarget.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { aspectRatio: 1, point: { x: 0, y: 0 } };
  }
  return {
    aspectRatio: bounds.width / bounds.height,
    point: {
      x: clampUnit((event.clientX - bounds.left) / bounds.width),
      y: clampUnit((event.clientY - bounds.top) / bounds.height),
    },
  };
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}
