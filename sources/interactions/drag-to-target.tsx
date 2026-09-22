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

import {
  clientPointToNormalized,
  isInsideTarget,
  type NormalizedPoint,
  type NormalizedTarget,
} from './drag-geometry';
import { capturePointer, isPrimaryActivationPointer, releasePointer } from './pointer-capture';
import { createHintStyle, createItemStyle, createTargetStyle } from './drag-to-target-styles';
import { LadderArt } from './ladder-art';

type DragToTargetProps = Readonly<{
  accessibleLabel: string;
  assetUrl?: string | null;
  completionAnnouncement: string;
  hintDelayMs?: number;
  onComplete: () => void;
  pointerOffsetPx?: number;
  start: NormalizedPoint;
  target: NormalizedTarget;
}>;

type DragPhase = 'dragging' | 'idle' | 'placed';

type DragContext = Readonly<{
  activePointerId: RefObject<number | null>;
  completed: RefObject<boolean>;
  interaction: RefObject<HTMLDivElement | null>;
  latestPosition: RefObject<NormalizedPoint>;
  onComplete: () => void;
  pointerOffsetPx: number;
  setPhase: Dispatch<SetStateAction<DragPhase>>;
  setPosition: Dispatch<SetStateAction<NormalizedPoint>>;
  setShowHint: Dispatch<SetStateAction<boolean>>;
  start: NormalizedPoint;
  target: NormalizedTarget;
}>;

type DragController = Readonly<{
  context: DragContext;
  interaction: RefObject<HTMLDivElement | null>;
  phase: DragPhase;
  position: NormalizedPoint;
  showHint: boolean;
}>;

const defaultHintDelayMs = 4_000;
const defaultPointerOffsetPx = 48;
const draggingPhase = 'dragging' satisfies DragPhase;
const idlePhase = 'idle' satisfies DragPhase;
const placedPhase = 'placed' satisfies DragPhase;

export function DragToTarget(props: DragToTargetProps) {
  const controller = useDragController(props);
  const { phase, position, showHint, interaction, context } = controller;
  const itemStyle = createItemStyle(position);
  const targetStyle = createTargetStyle(props.target);
  const hintStyle = createHintStyle(props.start, props.target.center);

  return (
    <div
      className="drag-interaction"
      data-guidance={showHint}
      data-phase={phase}
      data-production-art={typeof props.assetUrl === 'string'}
      ref={interaction}
    >
      <span className="ladder-target" aria-hidden="true" style={targetStyle} />
      {showHint && phase === idlePhase ? (
        <span className="drag-ghost-hand" aria-hidden="true" style={hintStyle} />
      ) : null}
      <button
        aria-label={props.accessibleLabel}
        className="mission-ladder"
        data-phase={phase}
        onClick={(event) => {
          activateAccessibly(event, context);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
        }}
        onLostPointerCapture={(event) => {
          finishDrag(event, true, context);
        }}
        onPointerCancel={(event) => {
          finishDrag(event, true, context);
        }}
        onPointerDown={(event) => {
          beginDrag(event, context);
        }}
        onPointerMove={(event) => {
          continueDrag(event, context);
        }}
        onPointerUp={(event) => {
          finishDrag(event, false, context);
        }}
        style={itemStyle}
        type="button"
      >
        <LadderArt assetUrl={props.assetUrl} />
      </button>
      <span className="visually-hidden" aria-live="polite">
        {phase === placedPhase ? props.completionAnnouncement : null}
      </span>
    </div>
  );
}

function useDragController({
  hintDelayMs = defaultHintDelayMs,
  onComplete,
  pointerOffsetPx = defaultPointerOffsetPx,
  start,
  target,
}: DragToTargetProps): DragController {
  const [phase, setPhase] = useState<DragPhase>(idlePhase);
  const [position, setPosition] = useState(start);
  const [showHint, setShowHint] = useState(false);
  const interaction = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const completed = useRef(false);
  const latestPosition = useRef(start);
  useIdleHint(phase, hintDelayMs, setShowHint);
  const context = {
    activePointerId,
    completed,
    interaction,
    latestPosition,
    onComplete,
    pointerOffsetPx,
    setPhase,
    setPosition,
    setShowHint,
    start,
    target,
  };
  return { context, interaction, phase, position, showHint };
}

function useIdleHint(
  phase: DragPhase,
  hintDelayMs: number,
  setShowHint: Dispatch<SetStateAction<boolean>>,
): void {
  useEffect(() => {
    if (phase !== idlePhase) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setShowHint(true);
    }, hintDelayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [hintDelayMs, phase, setShowHint]);
}

function beginDrag(event: ReactPointerEvent<HTMLButtonElement>, context: DragContext): void {
  if (!canBeginDrag(event, context)) {
    return;
  }
  event.preventDefault();
  context.activePointerId.current = event.pointerId;
  capturePointer(event.currentTarget, event.pointerId);
  context.setShowHint(false);
  context.setPhase(draggingPhase);
  moveTo(pointFor(event, context), context);
}

function canBeginDrag(event: ReactPointerEvent<HTMLButtonElement>, context: DragContext): boolean {
  return (
    !context.completed.current &&
    context.activePointerId.current === null &&
    isPrimaryActivationPointer(event)
  );
}

function continueDrag(event: ReactPointerEvent<HTMLButtonElement>, context: DragContext): void {
  if (context.activePointerId.current !== event.pointerId) {
    return;
  }
  event.preventDefault();
  moveTo(pointFor(event, context), context);
}

function finishDrag(
  event: ReactPointerEvent<HTMLButtonElement>,
  cancelled: boolean,
  context: DragContext,
): void {
  if (context.activePointerId.current !== event.pointerId) {
    return;
  }
  event.preventDefault();
  const droppedAt = pointFor(event, context);
  context.activePointerId.current = null;
  releasePointer(event.currentTarget, event.pointerId);
  if (!cancelled && isInsideTarget(droppedAt, context.target)) {
    complete(context);
  } else {
    returnToStart(context);
  }
}

function activateAccessibly(event: ReactMouseEvent<HTMLButtonElement>, context: DragContext): void {
  event.preventDefault();
  if (event.detail !== 0 || context.completed.current) {
    return;
  }
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
  context.setShowHint(false);
  moveTo(context.target.center, context);
  context.setPhase(placedPhase);
  context.onComplete();
}

function returnToStart(context: DragContext): void {
  moveTo(context.start, context);
  context.setPhase(idlePhase);
}

function moveTo(position: NormalizedPoint, context: DragContext): void {
  context.latestPosition.current = position;
  context.setPosition(position);
}
