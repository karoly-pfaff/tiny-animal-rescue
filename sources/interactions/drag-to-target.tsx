import {
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
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
import {
  capturePointer,
  type CapturedPointer,
  isPrimaryActivationPointer,
  releaseActivePointer,
} from './pointer-capture';
import { createHintStyle, createItemStyle, createTargetStyle } from './drag-to-target-styles';
type DragToTargetProps = Readonly<{
  accessibleLabel: string;
  completionAnnouncement: string;
  hideTargetWhenPlaced?: boolean;
  hintDelayMs?: number;
  onComplete: () => void;
  paused?: boolean;
  pointerOffsetPx?: number;
  sourceClassName?: string;
  sourceId?: string;
  sourceVisual: ReactNode;
  start: NormalizedPoint;
  successCue?: string;
  target: NormalizedTarget;
  targetId?: string;
}>;

type DragPhase = 'dragging' | 'idle' | 'placed';

type DragContext = Readonly<{
  activePointer: RefObject<CapturedPointer | null>;
  completed: RefObject<boolean>;
  interaction: RefObject<HTMLDivElement | null>;
  latestPosition: RefObject<NormalizedPoint>;
  onComplete: () => void;
  paused: boolean;
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
  const paused = Boolean(props.paused);
  const hintStyle = createHintStyle(props.start, props.target.center);

  return (
    <div
      className="drag-interaction"
      data-guidance={showHint}
      data-hide-target-when-placed={props.hideTargetWhenPlaced}
      data-paused={paused}
      data-phase={phase}
      data-success-cue={props.successCue}
      ref={interaction}
    >
      <span
        className="ladder-target"
        data-target-id={props.targetId}
        aria-hidden="true"
        style={targetStyle}
      />
      {showHint && phase === idlePhase ? (
        <span className="drag-ghost-hand" aria-hidden="true" style={hintStyle} />
      ) : null}
      <button
        aria-disabled={paused}
        aria-label={props.accessibleLabel}
        className={['drag-source', props.sourceClassName].filter(Boolean).join(' ')}
        data-phase={phase}
        data-source-id={props.sourceId}
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
        {props.sourceVisual}
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
  paused = false,
  pointerOffsetPx = defaultPointerOffsetPx,
  start,
  target,
}: DragToTargetProps): DragController {
  const [phase, setPhase] = useState<DragPhase>(idlePhase);
  const [position, setPosition] = useState(start);
  const [showHint, setShowHint] = useState(false);
  const interaction = useRef<HTMLDivElement>(null);
  const activePointer = useRef<CapturedPointer | null>(null);
  const completed = useRef(false);
  const latestPosition = useRef(start);
  useIdleHint(phase, hintDelayMs, setShowHint);
  useEffect(() => {
    if (paused && activePointer.current !== null) {
      releaseActivePointer(activePointer);
      latestPosition.current = start;
      setPosition(start);
      setPhase(idlePhase);
    }
  }, [paused, start]);
  const context = {
    activePointer,
    completed,
    interaction,
    latestPosition,
    onComplete,
    paused,
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
  context.activePointer.current = { pointerId: event.pointerId, target: event.currentTarget };
  capturePointer(event.currentTarget, event.pointerId);
  context.setShowHint(false);
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
    releaseActivePointer(context.activePointer);
    returnToStart(context);
    return;
  }
  const droppedAt = pointFor(event, context);
  releaseActivePointer(context.activePointer);
  if (!cancelled && isInsideTarget(droppedAt, context.target)) {
    complete(context);
  } else {
    returnToStart(context);
  }
}

function activateAccessibly(event: ReactMouseEvent<HTMLButtonElement>, context: DragContext): void {
  event.preventDefault();
  if (event.detail !== 0 || context.completed.current || context.paused) {
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
