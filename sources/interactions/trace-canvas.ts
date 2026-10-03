import type { RefObject } from 'react';

import { observeResponsiveCanvas, resizeCanvasBackingStore } from './responsive-canvas';
import { tracePathAtProgress, type TracePath } from './trace-progress';

export type TraceCanvasOptions = Readonly<{
  corridorColor: string;
  corridorWidth: number;
  path: TracePath;
  progress: number;
  progressColor: string;
}>;

export function observeTraceCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  readOptions: () => TraceCanvasOptions,
): () => void {
  return observeResponsiveCanvas(canvasRef, (canvas) => {
    renderTraceCanvas(canvas, readOptions());
  });
}

export function renderTraceCanvas(canvas: HTMLCanvasElement, options: TraceCanvasOptions): void {
  const context = resizeCanvasBackingStore(canvas);
  if (context === null) {
    return;
  }
  const bounds = canvas.getBoundingClientRect();
  context.clearRect(0, 0, bounds.width, bounds.height);
  drawPath({
    bounds,
    color: options.corridorColor,
    context,
    points: options.path,
    width: options.corridorWidth,
  });
  if (options.progress > 0) {
    drawPath({
      bounds,
      color: options.progressColor,
      context,
      points: tracePathAtProgress(options.path, options.progress),
      width: options.corridorWidth * 0.42,
    });
  }
}

type DrawPathOptions = Readonly<{
  bounds: Readonly<{ height: number; width: number }>;
  color: string;
  context: CanvasRenderingContext2D;
  points: readonly { x: number; y: number }[];
  width: number;
}>;

function drawPath(options: DrawPathOptions): void {
  const first = options.points[0];
  if (first === undefined) {
    return;
  }
  beginCanvasPath(options, first);
  for (const point of options.points.slice(1)) {
    options.context.lineTo(point.x * options.bounds.width, point.y * options.bounds.height);
  }
  finishCanvasPath(options);
}

function beginCanvasPath(
  options: DrawPathOptions,
  first: Readonly<{ x: number; y: number }>,
): void {
  options.context.save();
  options.context.beginPath();
  options.context.moveTo(first.x * options.bounds.width, first.y * options.bounds.height);
}

function finishCanvasPath(options: DrawPathOptions): void {
  options.context.lineCap = 'round';
  options.context.lineJoin = 'round';
  options.context.lineWidth = options.width * Math.min(options.bounds.width, options.bounds.height);
  options.context.strokeStyle = options.color;
  options.context.stroke();
  options.context.restore();
}
