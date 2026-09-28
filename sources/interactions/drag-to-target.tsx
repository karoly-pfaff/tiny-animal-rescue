import type { ReactNode } from 'react';

import type { GuidancePresentation } from '../engine/guidance-ladder-state';
import type { NormalizedPoint, NormalizedTarget } from './drag-geometry';
import { useDragController } from './drag-to-target-controller';
import { createHintStyle, createItemStyle, createTargetStyle } from './drag-to-target-styles';

type DragToTargetProps = Readonly<{
  accessibleLabel: string;
  completionAnnouncement: string;
  guidance: GuidancePresentation;
  hideTargetWhenPlaced?: boolean;
  onComplete: () => void;
  onGuidanceActivity: () => void;
  onGuidanceWrongAction: () => void;
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

export function DragToTarget(props: DragToTargetProps) {
  const {
    activateAccessibly,
    begin,
    continue: continueDrag,
    finish,
    interaction,
    phase,
    position,
  } = useDragController(props);
  const { guidance } = props;
  const paused = Boolean(props.paused);
  const hintStyle = createHintStyle(props.start, props.target.center);
  const hasActionableGuidance = phase === 'idle' && hasVisibleGuidance(guidance);

  return (
    <div
      className="drag-interaction"
      data-guidance={hasActionableGuidance}
      data-guidance-mode={guidance.isStaticHighlightVisible ? 'static' : 'motion'}
      data-guidance-stage={guidance.stage}
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
        style={createTargetStyle(props.target)}
      />
      <DragGuidanceDemonstration
        isVisible={guidance.isDemonstrationVisible && phase === 'idle'}
        style={hintStyle}
      />
      <button
        aria-disabled={paused}
        aria-label={props.accessibleLabel}
        className={['drag-source', props.sourceClassName].filter(Boolean).join(' ')}
        data-phase={phase}
        data-source-id={props.sourceId}
        onClick={activateAccessibly}
        onContextMenu={(event) => {
          event.preventDefault();
        }}
        onLostPointerCapture={(event) => {
          finish(event, true);
        }}
        onPointerCancel={(event) => {
          finish(event, true);
        }}
        onPointerDown={begin}
        onPointerMove={continueDrag}
        onPointerUp={(event) => {
          finish(event, false);
        }}
        style={createItemStyle(position)}
        type="button"
      >
        {props.sourceVisual}
      </button>
      <span className="visually-hidden" aria-live="polite">
        {phase === 'placed' ? props.completionAnnouncement : null}
      </span>
    </div>
  );
}

function hasVisibleGuidance(guidance: GuidancePresentation): boolean {
  return guidance.isPulseVisible || guidance.isStaticHighlightVisible;
}

function DragGuidanceDemonstration({
  isVisible,
  style,
}: Readonly<{
  isVisible: boolean;
  style: ReturnType<typeof createHintStyle>;
}>) {
  if (!isVisible) {
    return null;
  }
  return <span className="drag-ghost-hand" aria-hidden="true" style={style} />;
}
