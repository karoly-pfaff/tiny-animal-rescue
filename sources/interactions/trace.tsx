import { type CSSProperties, type ReactNode, useEffect } from 'react';

import type { GuidancePresentation } from '../engine/guidance-ladder-state';
import { observeTraceCanvas } from './trace-canvas';
import {
  activateTraceAccessibly,
  beginTrace,
  cancelTrace,
  continueTrace,
  finishTrace,
  suspendTrace,
  useTraceInteraction,
} from './trace-interaction';
import { tracePointAtProgress, type TracePath } from './trace-progress';
import './trace.css';

export type TraceProps = Readonly<{
  accessibleLabel: string;
  corridorColor: string;
  corridorWidth: number;
  endAffordance: ReactNode;
  guidance: GuidancePresentation;
  onComplete: () => void;
  onGuidanceActivity: () => void;
  onGuidanceWrongAction: () => void;
  path: TracePath;
  paused?: boolean;
  progressColor: string;
  showHint?: boolean;
  startAffordance: ReactNode;
  tracer: ReactNode;
}>;

const hintProgresses = [0.18, 0.34, 0.5, 0.66, 0.82] as const;

export function Trace({
  accessibleLabel,
  corridorColor,
  corridorWidth,
  endAffordance,
  guidance,
  onComplete,
  onGuidanceActivity,
  onGuidanceWrongAction,
  path,
  paused = false,
  progressColor,
  showHint = true,
  startAffordance,
  tracer,
}: TraceProps) {
  const effectiveCorridorWidth = scaledCorridorWidth(corridorWidth, guidance.toleranceScale);
  const { canvas, interaction, presentation, surface } = useTraceInteraction({
    corridorWidth: effectiveCorridorWidth,
    onComplete,
    onGuidanceActivity,
    onGuidanceWrongAction,
    path,
    paused,
  });
  const start = tracePointAtProgress(path, 0);
  const end = tracePointAtProgress(path, 1);
  const tracerPoint = tracePointAtProgress(path, presentation.progress);

  useEffect(
    () =>
      observeTraceCanvas(canvas, {
        corridorColor,
        corridorWidth: effectiveCorridorWidth,
        path,
        progress: presentation.progress,
        progressColor,
      }),
    [canvas, corridorColor, effectiveCorridorWidth, path, presentation.progress, progressColor],
  );

  useEffect(() => {
    if (paused) {
      suspendTrace(interaction);
    }
  }, [interaction, paused]);

  return (
    <button
      aria-disabled={paused}
      aria-label={accessibleLabel}
      aria-pressed={presentation.isComplete}
      className="trace"
      data-complete={presentation.isComplete}
      data-guidance={hasVisibleGuidance(guidance)}
      data-guidance-mode={guidance.isStaticHighlightVisible ? 'static' : 'motion'}
      data-guidance-stage={guidance.stage}
      data-paused={paused}
      data-progress={presentation.progress.toFixed(4)}
      onClick={(event) => {
        activateTraceAccessibly(event, interaction);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      onLostPointerCapture={(event) => {
        cancelTrace(event, interaction);
      }}
      onPointerCancel={(event) => {
        cancelTrace(event, interaction);
      }}
      onPointerDown={(event) => {
        beginTrace(event, interaction);
      }}
      onPointerMove={(event) => {
        continueTrace(event, interaction);
      }}
      onPointerUp={(event) => {
        finishTrace(event, interaction);
      }}
      ref={surface}
      type="button"
    >
      <canvas aria-hidden="true" className="trace-canvas" ref={canvas} />
      {showHint ? <TraceHint path={path} progress={presentation.progress} /> : null}
      <span aria-hidden="true" className="trace-affordance trace-start" style={atPoint(start)}>
        {startAffordance}
      </span>
      <span aria-hidden="true" className="trace-affordance trace-end" style={atPoint(end)}>
        {endAffordance}
      </span>
      <span
        aria-hidden="true"
        className="trace-tracer"
        data-complete={presentation.isComplete}
        style={atPoint(tracerPoint)}
      >
        {tracer}
      </span>
    </button>
  );
}

function hasVisibleGuidance(guidance: GuidancePresentation): boolean {
  return guidance.isPulseVisible || guidance.isStaticHighlightVisible;
}

function TraceHint({ path, progress }: Readonly<{ path: TracePath; progress: number }>) {
  return (
    <span aria-hidden="true" className="trace-hint" data-testid="trace-hint">
      {hintProgresses.map((hintProgress, index) => (
        <span
          className="trace-hint-dot"
          data-reached={progress >= hintProgress}
          key={hintProgress}
          style={{
            ...atPoint(tracePointAtProgress(path, hintProgress)),
            animationDelay: `${String(index * 160)}ms`,
          }}
        />
      ))}
    </span>
  );
}

function atPoint(point: Readonly<{ x: number; y: number }>): CSSProperties {
  return { left: `${String(point.x * 100)}%`, top: `${String(point.y * 100)}%` };
}

function scaledCorridorWidth(corridorWidth: number, toleranceScale: number): number {
  return Math.min(1, corridorWidth * toleranceScale);
}
