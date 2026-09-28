import type { RefObject } from 'react';

import type { NormalizedPoint } from './drag-geometry';
import { observeResponsiveCanvas, resizeCanvasBackingStore } from './responsive-canvas';

export type WipeStroke = Readonly<{ from: NormalizedPoint; to: NormalizedPoint }>;

type CanvasRenderOptions = Readonly<{
  brushRadius: number;
  canvas: HTMLCanvasElement;
  completed: boolean;
  maskColor: string;
  strokes: readonly WipeStroke[];
}>;

export function observeWipeCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  renderOptions: Omit<CanvasRenderOptions, 'canvas' | 'strokes'>,
  strokes: RefObject<WipeStroke[]>,
): () => void {
  return observeResponsiveCanvas(canvasRef, (canvas) => {
    renderMask({ ...renderOptions, canvas, strokes: strokes.current });
  });
}

function renderMask(options: CanvasRenderOptions): void {
  const context = resizeCanvasBackingStore(options.canvas);
  if (context === null) {
    return;
  }
  if (options.completed) {
    clearMask(context, options.canvas);
    return;
  }
  paintMask(context, options);
  for (const stroke of options.strokes) {
    drawWipeStroke(options.canvas, stroke, options.brushRadius);
  }
}

function clearMask(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  const bounds = canvas.getBoundingClientRect();
  context.clearRect(0, 0, bounds.width, bounds.height);
}

function paintMask(context: CanvasRenderingContext2D, options: CanvasRenderOptions): void {
  const bounds = options.canvas.getBoundingClientRect();
  context.globalCompositeOperation = 'source-over';
  context.fillStyle = options.maskColor;
  context.fillRect(0, 0, bounds.width, bounds.height);
}

export function drawWipeStroke(
  canvas: HTMLCanvasElement | null,
  stroke: WipeStroke,
  brushRadius: number,
): void {
  const context = canvas?.getContext('2d');
  if (canvas === null || context === null || context === undefined) {
    return;
  }
  configureEraser(context, canvas, brushRadius);
  strokePath(context, canvas, stroke);
  context.restore();
}

function configureEraser(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  brushRadius: number,
): void {
  const bounds = canvas.getBoundingClientRect();
  context.save();
  context.globalCompositeOperation = 'destination-out';
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = brushRadius * 2 * Math.min(bounds.width, bounds.height);
}

function strokePath(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  stroke: WipeStroke,
): void {
  const bounds = canvas.getBoundingClientRect();
  context.beginPath();
  context.moveTo(stroke.from.x * bounds.width, stroke.from.y * bounds.height);
  context.lineTo(stroke.to.x * bounds.width, stroke.to.y * bounds.height);
  context.stroke();
}
