import type { RefObject } from 'react';

export function observeResponsiveCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  render: (canvas: HTMLCanvasElement) => void,
): () => void {
  const canvas = canvasRef.current;
  if (canvas === null) {
    return () => undefined;
  }
  const renderCanvas = () => {
    render(canvas);
  };
  renderCanvas();
  return observeCanvasResize(canvas, renderCanvas);
}

function observeCanvasResize(canvas: HTMLCanvasElement, renderCanvas: () => void): () => void {
  if (typeof ResizeObserver === 'undefined') {
    window.addEventListener('resize', renderCanvas);
    return () => {
      window.removeEventListener('resize', renderCanvas);
    };
  }
  const observer = new ResizeObserver(renderCanvas);
  observer.observe(canvas);
  return () => {
    observer.disconnect();
  };
}

export function resizeCanvasBackingStore(
  canvas: HTMLCanvasElement,
): CanvasRenderingContext2D | null {
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(bounds.width * ratio));
  const height = Math.max(1, Math.round(bounds.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext('2d');
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  return context;
}
