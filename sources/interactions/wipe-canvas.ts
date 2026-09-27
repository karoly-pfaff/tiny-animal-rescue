import type { RefObject } from 'react';

import type { NormalizedPoint } from './drag-geometry';

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
  const canvas = canvasRef.current;
  if (canvas === null) {
    return () => undefined;
  }
  const render = () => {
    renderMask({ ...renderOptions, canvas, strokes: strokes.current });
  };
  render();
  return observeResize(canvas, render);
}

function observeResize(canvas: HTMLCanvasElement, render: () => void): () => void {
  if (typeof ResizeObserver === 'undefined') {
    window.addEventListener('resize', render);
    return () => {
      window.removeEventListener('resize', render);
    };
  }
  const observer = new ResizeObserver(render);
  observer.observe(canvas);
  return () => {
    observer.disconnect();
  };
}

function renderMask(options: CanvasRenderOptions): void {
  const context = resizeAndGetContext(options.canvas);
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

function resizeAndGetContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(bounds.width * ratio));
  canvas.height = Math.max(1, Math.round(bounds.height * ratio));
  const context = canvas.getContext('2d');
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  return context;
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
