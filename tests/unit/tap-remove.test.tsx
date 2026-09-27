import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TapRemove, type TapRemoveTarget } from '../../sources/interactions/tap-remove';
import {
  attemptTapTarget,
  initialTapRemoveState,
} from '../../sources/interactions/tap-remove-state';

const targets = [
  {
    accessibleLabel: 'First branch',
    center: { x: 0.25, y: 0.4 },
    height: 0.2,
    id: 'first-branch',
    visual: <span data-testid="first-visual" />,
    visualScale: 0.6,
    width: 0.18,
  },
  {
    accessibleLabel: 'Second branch',
    center: { x: 0.65, y: 0.55 },
    height: 0.24,
    id: 'second-branch',
    visual: <span data-testid="second-visual" />,
    visualScale: 0.65,
    width: 0.22,
  },
] as const satisfies readonly TapRemoveTarget[];

describe('tap/remove state', () => {
  it('ignores completed targets and attempts after the sequence is complete', () => {
    const ids = targets.map(({ id }) => id);
    const first = attemptTapTarget(ids, initialTapRemoveState, 'first-branch');
    const duplicate = attemptTapTarget(ids, first, 'first-branch');
    const complete = attemptTapTarget(ids, duplicate, 'second-branch');

    expect(duplicate).toBe(first);
    expect(attemptTapTarget(ids, complete, 'second-branch')).toBe(complete);
  });

  it('re-arms gentle feedback for consecutive wrong attempts', () => {
    const ids = targets.map(({ id }) => id);
    const first = attemptTapTarget(ids, initialTapRemoveState, 'second-branch');
    const second = attemptTapTarget(ids, first, 'second-branch');

    expect(first.incorrectAttemptRevision).toBe(1);
    expect(second.incorrectAttemptRevision).toBe(2);
    expect(second.incorrectTargetId).toBe('second-branch');
  });
});

function preparePointer(button: HTMLElement) {
  const pointerCapture = {
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
    setPointerCapture: vi.fn(),
  };
  Object.assign(button, pointerCapture);
  return pointerCapture;
}

function tapWithPointer(button: HTMLElement, pointerType: 'mouse' | 'touch', pointerId = 1) {
  fireEvent.pointerDown(button, {
    button: 0,
    isPrimary: true,
    pointerId,
    pointerType,
  });
  fireEvent.pointerUp(button, { pointerId, pointerType });
}

describe('TapRemove', () => {
  it('supports one target and reports completion once', () => {
    const onComplete = vi.fn();
    render(
      <TapRemove isGuidanceActive={false} onComplete={onComplete} targets={targets.slice(0, 1)} />,
    );
    const first = screen.getByRole('button', { name: 'First branch' });
    preparePointer(first);

    tapWithPointer(first, 'touch');
    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'First branch' })).not.toBeInTheDocument();
  });

  it('keeps ordered multi-target attempts gentle and completes in authored order', () => {
    const onComplete = vi.fn();
    render(<TapRemove isGuidanceActive={false} onComplete={onComplete} targets={targets} />);
    const second = screen.getByRole('button', { name: 'Second branch' });
    preparePointer(second);

    tapWithPointer(second, 'mouse');
    expect(second).toHaveAttribute('data-incorrect', 'true');
    expect(screen.getByRole('button', { name: 'First branch' })).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    const first = screen.getByRole('button', { name: 'First branch' });
    preparePointer(first);
    tapWithPointer(first, 'mouse');
    tapWithPointer(screen.getByRole('button', { name: 'Second branch' }), 'mouse', 2);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('exposes a hit area larger than its visual and pulses only the active target', () => {
    render(<TapRemove isGuidanceActive onComplete={vi.fn()} targets={targets} />);

    const first = screen.getByRole('button', { name: 'First branch' });
    const second = screen.getByRole('button', { name: 'Second branch' });
    expect(first).toHaveStyle({ height: '20%', width: '18%' });
    expect(screen.getByTestId('first-visual').parentElement).toHaveStyle({ scale: '0.6' });
    expect(first).toHaveAttribute('data-guidance', 'true');
    expect(second).toHaveAttribute('data-guidance', 'false');
  });

  it('cancels safely, ignores secondary pointers, and supports keyboard activation', () => {
    const onComplete = vi.fn();
    render(
      <TapRemove isGuidanceActive={false} onComplete={onComplete} targets={targets.slice(0, 1)} />,
    );
    const first = screen.getByRole('button', { name: 'First branch' });
    const pointerCapture = preparePointer(first);

    fireEvent.pointerDown(first, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    fireEvent.pointerDown(first, {
      button: 0,
      isPrimary: false,
      pointerId: 2,
      pointerType: 'touch',
    });
    fireEvent.pointerUp(first, { pointerId: 2, pointerType: 'touch' });
    fireEvent.pointerCancel(first, { pointerId: 1, pointerType: 'touch' });
    expect(onComplete).not.toHaveBeenCalled();
    expect(pointerCapture.releasePointerCapture).toHaveBeenCalledOnce();

    fireEvent.click(first, { detail: 1 });
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(first, { detail: 0 });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('releases a paused tap and accepts fresh input only after resume', () => {
    const onComplete = vi.fn();
    const { rerender } = render(
      <TapRemove isGuidanceActive={false} onComplete={onComplete} targets={targets.slice(0, 1)} />,
    );
    const first = screen.getByRole('button', { name: 'First branch' });
    const pointerCapture = preparePointer(first);
    fireEvent.pointerDown(first, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });

    rerender(
      <TapRemove
        isGuidanceActive={false}
        onComplete={onComplete}
        paused
        targets={targets.slice(0, 1)}
      />,
    );
    fireEvent.pointerUp(first, { pointerId: 1, pointerType: 'touch' });
    fireEvent.click(first, { detail: 0 });

    expect(pointerCapture.releasePointerCapture).toHaveBeenCalledOnce();
    expect(first).toHaveAttribute('aria-disabled', 'true');
    expect(onComplete).not.toHaveBeenCalled();

    rerender(
      <TapRemove isGuidanceActive={false} onComplete={onComplete} targets={targets.slice(0, 1)} />,
    );
    tapWithPointer(first, 'touch', 2);
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
