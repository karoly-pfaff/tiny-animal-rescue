import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { tracePointAtProgress, type TracePath } from '../../sources/interactions/trace-progress';
import { Trace } from '../../sources/interactions/trace';

const bounds = {
  bottom: 300,
  height: 300,
  left: 0,
  right: 400,
  top: 0,
  width: 400,
  x: 0,
  y: 0,
  toJSON: () => undefined,
};

const path = [
  { x: 0.1, y: 0.5 },
  { x: 0.9, y: 0.5 },
] satisfies TracePath;

function createCanvasContext() {
  return {
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    lineCap: 'butt',
    lineJoin: 'miter',
    lineTo: vi.fn(),
    lineWidth: 1,
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: '',
  };
}

function renderTrace(options: Readonly<{ onComplete?: () => void; paused?: boolean }> = {}) {
  const onComplete = options.onComplete ?? vi.fn();
  const pauseProps = options.paused === undefined ? {} : { paused: options.paused };
  const result = render(
    <Trace
      accessibleLabel="Guide the animal home"
      corridorColor="#d7c68e"
      corridorWidth={0.2}
      endAffordance={<span data-testid="trace-end-icon" />}
      onComplete={onComplete}
      path={path}
      progressColor="#69a772"
      startAffordance={<span data-testid="trace-start-icon" />}
      tracer={<span data-testid="trace-animal" />}
      {...pauseProps}
    />,
  );
  const button = screen.getByRole('button', { name: 'Guide the animal home' });
  const pointerCapture = {
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
    setPointerCapture: vi.fn(),
  };
  Object.assign(button, pointerCapture);
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(bounds);
  return { ...result, button, onComplete, pointerCapture };
}

function pointerDown(button: HTMLElement, x: number, pointerId = 1): void {
  fireEvent.pointerDown(button, {
    button: 0,
    clientX: x,
    clientY: 150,
    isPrimary: true,
    pointerId,
    pointerType: 'touch',
  });
}

function pointerMove(button: HTMLElement, x: number, pointerId = 1): void {
  fireEvent.pointerMove(button, { clientX: x, clientY: 150, pointerId });
}

describe('Trace', () => {
  let context: ReturnType<typeof createCanvasContext>;

  beforeEach(() => {
    context = createCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(bounds);
    vi.stubGlobal('devicePixelRatio', 2);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders a scaled canvas plus visible start, end, tracer, and hint affordances', () => {
    renderTrace();
    const canvas = document.querySelector('canvas');

    expect(canvas).toHaveAttribute('width', '800');
    expect(canvas).toHaveAttribute('height', '600');
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(context.stroke).toHaveBeenCalled();
    expect(screen.getByTestId('trace-start-icon')).toBeInTheDocument();
    expect(screen.getByTestId('trace-end-icon')).toBeInTheDocument();
    expect(screen.getByTestId('trace-animal')).toBeInTheDocument();
    expect(screen.getByTestId('trace-hint').children).toHaveLength(5);
  });

  it('preserves progress after a deviation, cancellation, pause, and resume', () => {
    const { button, onComplete, pointerCapture, rerender } = renderTrace();
    pointerDown(button, 40);
    pointerMove(button, 184);
    const partial = Number(button.getAttribute('data-progress'));
    fireEvent.pointerMove(button, { clientX: 200, clientY: 20, pointerId: 1 });
    fireEvent.pointerCancel(button, { pointerId: 1 });
    pointerMove(button, 360);

    expect(Number(button.getAttribute('data-progress'))).toBe(partial);
    expect(pointerCapture.releasePointerCapture).toHaveBeenCalledOnce();

    rerender(
      <Trace
        accessibleLabel="Guide the animal home"
        corridorColor="#d7c68e"
        corridorWidth={0.2}
        endAffordance={<span data-testid="trace-end-icon" />}
        onComplete={onComplete}
        path={path}
        paused
        progressColor="#69a772"
        startAffordance={<span data-testid="trace-start-icon" />}
        tracer={<span data-testid="trace-animal" />}
      />,
    );
    const resumePoint = tracePointAtProgress(path, partial);
    pointerDown(button, resumePoint.x * bounds.width, 2);
    pointerMove(button, 360, 2);
    expect(Number(button.getAttribute('data-progress'))).toBe(partial);

    rerender(
      <Trace
        accessibleLabel="Guide the animal home"
        corridorColor="#d7c68e"
        corridorWidth={0.2}
        endAffordance={<span data-testid="trace-end-icon" />}
        onComplete={onComplete}
        path={path}
        progressColor="#69a772"
        startAffordance={<span data-testid="trace-start-icon" />}
        tracer={<span data-testid="trace-animal" />}
      />,
    );
    pointerDown(button, resumePoint.x * bounds.width, 3);
    pointerMove(button, 360, 3);
    fireEvent.pointerUp(button, { clientX: 360, clientY: 150, pointerId: 3 });

    expect(button).toHaveAttribute('data-complete', 'true');
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('ignores invalid starts, secondary pointers, and duplicate completion', () => {
    const { button, onComplete } = renderTrace();
    pointerDown(button, 200);
    pointerMove(button, 360);
    expect(button).toHaveAttribute('data-progress', '0.0000');

    pointerDown(button, 40);
    fireEvent.pointerDown(button, {
      button: 0,
      clientX: 40,
      clientY: 150,
      isPrimary: false,
      pointerId: 2,
      pointerType: 'touch',
    });
    pointerMove(button, 360, 2);
    expect(button).toHaveAttribute('data-progress', '0.0000');
    pointerMove(button, 360);
    fireEvent.pointerUp(button, { clientX: 360, clientY: 150, pointerId: 1 });
    pointerDown(button, 40, 3);
    pointerMove(button, 360, 3);

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('supports one explicit keyboard completion and an optional hidden hint', () => {
    const onComplete = vi.fn();
    const { button, rerender } = renderTrace({ onComplete });

    fireEvent.click(button, { detail: 1 });
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(button, { detail: 0 });
    fireEvent.click(button, { detail: 0 });

    expect(button).toHaveAttribute('data-progress', '1.0000');
    expect(onComplete).toHaveBeenCalledOnce();

    rerender(
      <Trace
        accessibleLabel="Guide the animal home"
        corridorColor="#d7c68e"
        corridorWidth={0.2}
        endAffordance={<span />}
        onComplete={onComplete}
        path={path}
        progressColor="#69a772"
        showHint={false}
        startAffordance={<span />}
        tracer={<span />}
      />,
    );
    expect(screen.queryByTestId('trace-hint')).not.toBeInTheDocument();
  });
});
