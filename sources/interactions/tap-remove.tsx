import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';

import { toPercent, type NormalizedPoint } from './drag-geometry';
import {
  capturePointer,
  type CapturedPointer,
  type CapturedPointerState,
  isPrimaryActivationPointer,
  releaseActivePointer,
} from './pointer-capture';
import { attemptTapTarget, initialTapRemoveState } from './tap-remove-state';
import './tap-remove.css';

export type TapRemoveTarget = Readonly<{
  accessibleLabel: string;
  center: NormalizedPoint;
  dataAttributes?: Readonly<Partial<Record<`data-${string}`, string>>>;
  height: number;
  id: string;
  visual: ReactNode;
  visualScale: number;
  width: number;
}>;

type TapRemoveProps = Readonly<{
  isGuidanceActive: boolean;
  onComplete: () => void;
  paused?: boolean;
  targets: readonly TapRemoveTarget[];
}>;

export function TapRemove({
  isGuidanceActive,
  onComplete,
  paused = false,
  targets,
}: TapRemoveProps) {
  const targetIds = targets.map(({ id }) => id);
  const [state, setState] = useState(initialTapRemoveState);
  const completionReported = useRef(false);
  const activePointer = useRef<CapturedPointer | null>(null);
  const isComplete = state.completedTargetIds.length === targets.length;

  useEffect(() => {
    if (isComplete && !completionReported.current) {
      completionReported.current = true;
      onComplete();
    }
  }, [isComplete, onComplete]);

  useEffect(() => {
    if (paused) {
      releaseActivePointer(activePointer);
    }
  }, [paused]);

  return (
    <div className="tap-remove-interaction" data-complete={isComplete} data-paused={paused}>
      {targets.map((target, targetIndex) =>
        state.completedTargetIds.includes(target.id) ? null : (
          <TapRemoveButton
            isActive={targetIndex === state.activeTargetIndex}
            isGuidanceActive={isGuidanceActive}
            isIncorrect={state.incorrectTargetId === target.id}
            activePointer={activePointer}
            feedbackRevision={state.incorrectAttemptRevision}
            key={target.id}
            onAttempt={() => {
              setState((current) => attemptTapTarget(targetIds, current, target.id));
            }}
            paused={paused}
            target={target}
          />
        ),
      )}
    </div>
  );
}

type TapRemoveButtonProps = Readonly<{
  activePointer: RefObject<CapturedPointer | null>;
  feedbackRevision: number;
  isActive: boolean;
  isGuidanceActive: boolean;
  isIncorrect: boolean;
  onAttempt: () => void;
  paused: boolean;
  target: TapRemoveTarget;
}>;

function TapRemoveButton({
  activePointer,
  feedbackRevision,
  isActive,
  isGuidanceActive,
  isIncorrect,
  onAttempt,
  paused,
  target,
}: TapRemoveButtonProps) {
  return (
    <button
      {...target.dataAttributes}
      aria-disabled={paused}
      aria-label={target.accessibleLabel}
      className="tap-remove-target"
      data-active={isActive}
      data-guidance={isActive && isGuidanceActive}
      data-incorrect={isIncorrect}
      data-target-id={target.id}
      onClick={(event) => {
        activateAccessibly(event, paused, onAttempt);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      onLostPointerCapture={(event) => {
        cancelTap(event, activePointer);
      }}
      onPointerCancel={(event) => {
        cancelTap(event, activePointer);
      }}
      onPointerDown={(event) => {
        beginTap(event, activePointer, paused);
      }}
      onPointerUp={(event) => {
        finishTap({ activePointer, event, onAttempt, paused });
      }}
      style={{
        height: toPercent(target.height),
        left: toPercent(target.center.x),
        top: toPercent(target.center.y),
        width: toPercent(target.width),
      }}
      type="button"
    >
      <span
        aria-hidden="true"
        className="tap-remove-visual"
        key={`${target.id}:${String(feedbackRevision)}`}
        style={{ scale: target.visualScale }}
      >
        {target.visual}
      </span>
    </button>
  );
}

function beginTap(
  event: ReactPointerEvent<HTMLButtonElement>,
  activePointer: CapturedPointerState,
  paused: boolean,
): void {
  if (paused || activePointer.current !== null || !isPrimaryActivationPointer(event)) {
    return;
  }
  event.preventDefault();
  activePointer.current = { pointerId: event.pointerId, target: event.currentTarget };
  capturePointer(event.currentTarget, event.pointerId);
}

function finishTap(
  options: Readonly<{
    activePointer: CapturedPointerState;
    event: ReactPointerEvent<HTMLButtonElement>;
    onAttempt: () => void;
    paused: boolean;
  }>,
): void {
  if (options.activePointer.current?.pointerId !== options.event.pointerId) {
    return;
  }
  options.event.preventDefault();
  releaseActivePointer(options.activePointer);
  if (!options.paused) {
    options.onAttempt();
  }
}

function cancelTap(
  event: ReactPointerEvent<HTMLButtonElement>,
  activePointer: CapturedPointerState,
): void {
  if (activePointer.current?.pointerId !== event.pointerId) {
    return;
  }
  releaseActivePointer(activePointer);
}

function activateAccessibly(
  event: ReactMouseEvent<HTMLButtonElement>,
  paused: boolean,
  onAttempt: () => void,
): void {
  if (!paused && event.detail === 0) {
    onAttempt();
  }
}
