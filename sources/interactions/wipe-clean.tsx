import { type ReactNode, useEffect } from 'react';

import { observeWipeCanvas } from './wipe-canvas';
import {
  activateWipeAccessibly,
  beginWipe,
  cancelWipe,
  continueWipe,
  finishWipe,
  suspendWipe,
  useWipeInteraction,
} from './wipe-interaction';
import './wipe-clean.css';

type WipeCleanProps = Readonly<{
  accessibleLabel: string;
  brushRadius?: number;
  columns?: number;
  completionThreshold: number;
  maskColor: string;
  onComplete: () => void;
  paused?: boolean;
  rows?: number;
  underlay: ReactNode;
}>;

const defaultBrushRadius = 0.09;
const defaultColumns = 48;

export function WipeClean({
  accessibleLabel,
  brushRadius = defaultBrushRadius,
  columns = defaultColumns,
  completionThreshold,
  maskColor,
  onComplete,
  paused = false,
  rows = 32,
  underlay,
}: WipeCleanProps) {
  const { canvas, coverage, interaction, isComplete, strokes, surface } = useWipeInteraction({
    brushRadius,
    columns,
    completionThreshold,
    onComplete,
    paused,
    rows,
  });

  useEffect(
    () => observeWipeCanvas(canvas, { brushRadius, completed: isComplete, maskColor }, strokes),
    [brushRadius, canvas, isComplete, maskColor, strokes],
  );

  useEffect(() => {
    if (paused) {
      suspendWipe(interaction);
    }
  }, [interaction, paused]);

  return (
    <button
      aria-disabled={paused}
      aria-label={accessibleLabel}
      aria-pressed={isComplete}
      className="wipe-clean"
      data-complete={isComplete}
      data-paused={paused}
      data-progress={coverage.toFixed(4)}
      onClick={(event) => {
        activateWipeAccessibly(event, interaction);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      onLostPointerCapture={(event) => {
        cancelWipe(event, interaction);
      }}
      onPointerCancel={(event) => {
        cancelWipe(event, interaction);
      }}
      onPointerDown={(event) => {
        beginWipe(event, interaction);
      }}
      onPointerMove={(event) => {
        continueWipe(event, interaction);
      }}
      onPointerUp={(event) => {
        finishWipe(event, interaction);
      }}
      ref={surface}
      type="button"
    >
      <span aria-hidden="true" className="wipe-clean-underlay">
        {underlay}
      </span>
      <canvas aria-hidden="true" className="wipe-clean-mask" ref={canvas} />
    </button>
  );
}
