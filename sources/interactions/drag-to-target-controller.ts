import {
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { GuidancePresentation } from '../engine/guidance-ladder-state';
import {
  clientPointToNormalized,
  isInsideTarget,
  type NormalizedPoint,
  type NormalizedTarget,
} from './drag-geometry';
import {
  capturePointer,
  type CapturedPointer,
  isPrimaryActivationPointer,
  releaseActivePointer,
} from './pointer-capture';

type DragPhase = 'dragging' | 'idle' | 'placed';

const draggingPhase = 'dragging' satisfies DragPhase;
const idlePhase = 'idle' satisfies DragPhase;
const placedPhase = 'placed' satisfies DragPhase;

type DragControllerOptions = Readonly<{
  guidance: GuidancePresentation;
  onComplete: () => void;
  onGuidanceActivity: () => void;
  onGuidanceWrongAction: () => void;
  paused?: boolean;
  pointerOffsetPx?: number;
  start: NormalizedPoint;
  target: NormalizedTarget;
}>;

type DragContext = Readonly<{
  activePointer: RefObject<CapturedPointer | null>;
  activeToleranceScale: RefObject<number>;
  completed: RefObject<boolean>;
  guidance: GuidancePresentation;
  interaction: RefObject<HTMLDivElement | null>;
  latestPosition: RefObject<NormalizedPoint>;
  onComplete: () => void;
  onGuidanceActivity: () => void;
  onGuidanceWrongAction: () => void;
  paused: boolean;
  pointerOffsetPx: number;
  setPhase: Dispatch<SetStateAction<DragPhase>>;
  setPosition: Dispatch<SetStateAction<NormalizedPoint>>;
  start: NormalizedPoint;
  target: NormalizedTarget;
}>;

export type DragController = Readonly<{
  activateAccessibly: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  begin: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  continue: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  finish: (event: ReactPointerEvent<HTMLButtonElement>, cancelled: boolean) => void;
  interaction: RefObject<HTMLDivElement | null>;
  phase: DragPhase;
  position: NormalizedPoint;
}>;

const defaultPointerOffsetPx = 48;

export function useDragController({
  guidance,
  onComplete,
  onGuidanceActivity,
  onGuidanceWrongAction,
  paused = false,
  pointerOffsetPx = defaultPointerOffsetPx,
  start,
  target,
}: DragControllerOptions): DragController {
  const [phase, setPhase] = useState<DragPhase>(idlePhase);
  const [position, setPosition] = useState(start);
  const interaction = useRef<HTMLDivElement>(null);
  const activePointer = useRef<CapturedPointer | null>(null);
  const activeToleranceScale = useRef(1);
  const completed = useRef(false);
  const latestPosition = useRef(start);
  const context = {
    activePointer,
    activeToleranceScale,
    completed,
    guidance,
    interaction,
    latestPosition,
    onComplete,
    onGuidanceActivity,
    onGuidanceWrongAction,
    paused,
    pointerOffsetPx,
    setPhase,
    setPosition,
    start,
    target,
  };
  useEffect(() => {
    if (paused && activePointer.current !== null) {
      releaseActivePointer(activePointer);
      activeToleranceScale.current = 1;
      latestPosition.current = start;
      setPosition(start);
      setPhase(idlePhase);
    }
  }, [paused, start]);
  return {
    activateAccessibly: (event) => {
      activateAccessibly(event, context);
    },
    begin: (event) => {
      beginDrag(event, context);
    },
    continue: (event) => {
      continueDrag(event, context);
    },
    finish: (event, cancelled) => {
      finishDrag(event, cancelled, context);
    },
    interaction,
    phase,
    position,
  };
}

function beginDrag(event: ReactPointerEvent<HTMLButtonElement>, context: DragContext): void {
  if (!canBeginDrag(event, context)) {
    return;
  }
  event.preventDefault();
  context.activeToleranceScale.current = context.guidance.toleranceScale;
  context.onGuidanceActivity();
  context.activePointer.current = { pointerId: event.pointerId, target: event.currentTarget };
  capturePointer(event.currentTarget, event.pointerId);
  context.setPhase(draggingPhase);
  moveTo(pointFor(event, context), context);
}

function canBeginDrag(event: ReactPointerEvent<HTMLButtonElement>, context: DragContext): boolean {
  return (
    !context.completed.current &&
    !context.paused &&
    context.activePointer.current === null &&
    isPrimaryActivationPointer(event)
  );
}

function continueDrag(event: ReactPointerEvent<HTMLButtonElement>, context: DragContext): void {
  if (context.paused || context.activePointer.current?.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();
  context.onGuidanceActivity();
  moveTo(pointFor(event, context), context);
}

function finishDrag(
  event: ReactPointerEvent<HTMLButtonElement>,
  cancelled: boolean,
  context: DragContext,
): void {
  if (context.activePointer.current?.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();
  if (context.paused) {
    suspendDrag(context);
    return;
  }
  const droppedAt = pointFor(event, context);
  releaseActivePointer(context.activePointer);
  resolveDrop(cancelled, droppedAt, context);
}

function resolveDrop(cancelled: boolean, droppedAt: NormalizedPoint, context: DragContext): void {
  if (
    !cancelled &&
    isInsideTarget(droppedAt, context.target, context.activeToleranceScale.current)
  ) {
    complete(context);
    context.activeToleranceScale.current = 1;
    return;
  }
  returnToStart(context);
  context.activeToleranceScale.current = 1;
  if (!cancelled) {
    context.onGuidanceWrongAction();
  }
}

function activateAccessibly(event: ReactMouseEvent<HTMLButtonElement>, context: DragContext): void {
  event.preventDefault();
  if (event.detail !== 0 || context.completed.current || context.paused) {
    return;
  }
  context.onGuidanceActivity();
  complete(context);
}

function pointFor(
  event: ReactPointerEvent<HTMLButtonElement>,
  context: DragContext,
): NormalizedPoint {
  const bounds = context.interaction.current?.getBoundingClientRect();
  if (bounds === undefined) {
    return context.latestPosition.current;
  }
  return clientPointToNormalized(
    { x: event.clientX, y: event.clientY },
    bounds,
    context.pointerOffsetPx,
  );
}

function complete(context: DragContext): void {
  context.completed.current = true;
  moveTo(context.target.center, context);
  context.setPhase(placedPhase);
  context.onComplete();
}

function returnToStart(context: DragContext): void {
  moveTo(context.start, context);
  context.setPhase(idlePhase);
}

function suspendDrag(context: DragContext): void {
  if (context.activePointer.current === null) {
    return;
  }
  releaseActivePointer(context.activePointer);
  context.activeToleranceScale.current = 1;
  returnToStart(context);
}

function moveTo(position: NormalizedPoint, context: DragContext): void {
  context.latestPosition.current = position;
  context.setPosition(position);
}
