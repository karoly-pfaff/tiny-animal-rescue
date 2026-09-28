import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { inactiveGuidancePresentation } from '../../sources/engine/guidance-ladder-state';
import { WipeClean } from '../../sources/interactions/wipe-clean';

const bounds = {
  bottom: 240,
  height: 240,
  left: 0,
  right: 320,
  top: 0,
  width: 320,
  x: 0,
  y: 0,
  toJSON: () => undefined,
};

function createCanvasContext() {
  return {
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    globalCompositeOperation: 'source-over',
    lineCap: 'butt',
    lineJoin: 'miter',
    lineTo: vi.fn(),
    lineWidth: 1,
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
  };
}

function renderWipe(
  completionThreshold = 0.95,
  onComplete = vi.fn(),
  onGuidanceActivity = vi.fn(),
) {
  const result = render(
    <WipeClean
      accessibleLabel="Clean the fixture"
      brushRadius={0.1}
      columns={20}
      completionThreshold={completionThreshold}
      guidance={inactiveGuidancePresentation}
      maskColor="#654321"
      onComplete={onComplete}
      onGuidanceActivity={onGuidanceActivity}
      rows={20}
      underlay={<span data-testid="clean-surface" />}
    />,
  );
  const button = screen.getByRole('button', { name: 'Clean the fixture' });
  const pointerCapture = {
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
    setPointerCapture: vi.fn(),
  };
  Object.assign(button, pointerCapture);
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(bounds);
  return { ...result, button, onComplete, onGuidanceActivity, pointerCapture };
}

function wipe(
  button: HTMLElement,
  options: Readonly<{ fromX: number; pointerId: number; toX: number }>,
): void {
  fireEvent.pointerDown(button, {
    button: 0,
    clientX: options.fromX,
    clientY: 120,
    isPrimary: true,
    pointerId: options.pointerId,
    pointerType: 'touch',
  });
  fireEvent.pointerMove(button, {
    clientX: options.toX,
    clientY: 120,
    pointerId: options.pointerId,
  });
}

describe('WipeClean', () => {
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

  it('reports accepted activity and exposes static guidance presentation', () => {
    const onGuidanceActivity = vi.fn();
    render(
      <WipeClean
        accessibleLabel="Clean the fixture"
        brushRadius={0.1}
        columns={20}
        completionThreshold={0.95}
        guidance={{
          ...inactiveGuidancePresentation,
          isDemonstrationVisible: true,
          isStaticHighlightVisible: true,
          stage: 'demonstration',
        }}
        maskColor="#654321"
        onComplete={vi.fn()}
        onGuidanceActivity={onGuidanceActivity}
        rows={20}
        underlay={<span />}
      />,
    );
    const button = screen.getByRole('button', { name: 'Clean the fixture' });
    Object.assign(button, {
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    });
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(bounds);

    expect(button).toHaveAttribute('data-guidance', 'true');
    expect(button).toHaveAttribute('data-guidance-demonstration', 'true');
    expect(button).toHaveAttribute('data-guidance-mode', 'static');
    expect(button).toHaveAttribute('data-guidance-stage', 'demonstration');

    fireEvent.pointerDown(button, {
      button: 0,
      clientX: 32,
      clientY: 120,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    fireEvent.pointerMove(button, { clientX: 64, clientY: 120, pointerId: 1 });

    expect(onGuidanceActivity).toHaveBeenCalledTimes(2);
  });

  it('renders a HiDPI mask and caller-owned underlay', () => {
    renderWipe();
    const canvas = document.querySelector('canvas');

    expect(screen.getByTestId('clean-surface')).toBeInTheDocument();
    expect(canvas).toHaveAttribute('width', '640');
    expect(canvas).toHaveAttribute('height', '480');
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 320, 240);
  });

  it('preserves partial progress across pointer leave, pause, and resume', () => {
    const { button, pointerCapture, rerender } = renderWipe();
    wipe(button, { fromX: 32, pointerId: 1, toX: 160 });
    const beforeLeave = Number(button.getAttribute('data-progress'));

    fireEvent.pointerLeave(button, { pointerId: 1 });
    fireEvent.pointerMove(button, { clientX: 224, clientY: 120, pointerId: 1 });
    const afterLeave = Number(button.getAttribute('data-progress'));
    rerender(
      <WipeClean
        accessibleLabel="Clean the fixture"
        brushRadius={0.1}
        columns={20}
        completionThreshold={0.95}
        guidance={inactiveGuidancePresentation}
        maskColor="#654321"
        onComplete={vi.fn()}
        onGuidanceActivity={vi.fn()}
        paused
        rows={20}
        underlay={<span data-testid="clean-surface" />}
      />,
    );
    fireEvent.pointerMove(button, { clientX: 288, clientY: 120, pointerId: 1 });
    wipe(button, { fromX: 32, pointerId: 2, toX: 288 });
    const whilePaused = Number(button.getAttribute('data-progress'));
    rerender(
      <WipeClean
        accessibleLabel="Clean the fixture"
        brushRadius={0.1}
        columns={20}
        completionThreshold={0.95}
        guidance={inactiveGuidancePresentation}
        maskColor="#654321"
        onComplete={vi.fn()}
        onGuidanceActivity={vi.fn()}
        rows={20}
        underlay={<span data-testid="clean-surface" />}
      />,
    );
    wipe(button, { fromX: 224, pointerId: 3, toX: 288 });

    expect(afterLeave).toBeGreaterThan(beforeLeave);
    expect(whilePaused).toBe(afterLeave);
    expect(Number(button.getAttribute('data-progress'))).toBeGreaterThan(whilePaused);
    expect(pointerCapture.releasePointerCapture).toHaveBeenCalledOnce();
  });

  it('ignores secondary input and completes broad strokes exactly once', () => {
    const onComplete = vi.fn();
    const { button } = renderWipe(0.05, onComplete);
    fireEvent.pointerDown(button, {
      button: 0,
      clientX: 32,
      clientY: 120,
      isPrimary: false,
      pointerId: 2,
      pointerType: 'touch',
    });
    expect(button).toHaveAttribute('data-progress', '0.0000');

    wipe(button, { fromX: 32, pointerId: 1, toX: 288 });
    fireEvent.pointerUp(button, { clientX: 288, clientY: 120, pointerId: 1 });
    wipe(button, { fromX: 32, pointerId: 3, toX: 288 });

    expect(button).toHaveAttribute('data-complete', 'true');
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('supports keyboard activation without duplicating completion', () => {
    const onComplete = vi.fn();
    const { button } = renderWipe(0.9, onComplete);

    fireEvent.click(button, { detail: 1 });
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(button, { detail: 0 });
    fireEvent.click(button, { detail: 0 });

    expect(button).toHaveAttribute('data-progress', '1.0000');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(context.clearRect).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
