import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TapRemove, type TapRemoveTarget } from '../../sources/interactions/tap-remove';
import type { GuidancePresentation } from '../../sources/engine/guidance-ladder-state';
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
const idleGuidance = {
  isDemonstrationVisible: false,
  isPulseVisible: false,
  isStaticHighlightVisible: false,
  stage: 'idle',
  toleranceScale: 1,
} as const satisfies GuidancePresentation;

function renderTapRemove(
  onComplete: () => void,
  selectedTargets: readonly TapRemoveTarget[],
  guidance: GuidancePresentation = idleGuidance,
) {
  const onGuidanceActivity = vi.fn();
  const onGuidanceWrongAction = vi.fn();
  const result = render(
    <TapRemove
      guidance={guidance}
      onComplete={onComplete}
      onGuidanceActivity={onGuidanceActivity}
      onGuidanceWrongAction={onGuidanceWrongAction}
      targets={selectedTargets}
    />,
  );
  return { ...result, onGuidanceActivity, onGuidanceWrongAction };
}

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
    const { onGuidanceActivity } = renderTapRemove(onComplete, targets.slice(0, 1));
    const first = screen.getByRole('button', { name: 'First branch' });
    preparePointer(first);

    tapWithPointer(first, 'touch');
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onGuidanceActivity).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'First branch' })).not.toBeInTheDocument();
  });

  it('keeps ordered multi-target attempts gentle and completes in authored order', () => {
    const onComplete = vi.fn();
    const { onGuidanceWrongAction } = renderTapRemove(onComplete, targets);
    const second = screen.getByRole('button', { name: 'Second branch' });
    preparePointer(second);

    tapWithPointer(second, 'mouse');
    expect(second).toHaveAttribute('data-incorrect', 'true');
    expect(screen.getByRole('button', { name: 'First branch' })).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    expect(onGuidanceWrongAction).toHaveBeenCalledOnce();

    const first = screen.getByRole('button', { name: 'First branch' });
    preparePointer(first);
    tapWithPointer(first, 'mouse');
    tapWithPointer(screen.getByRole('button', { name: 'Second branch' }), 'mouse', 2);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('exposes a hit area larger than its visual and pulses only the active target', () => {
    const pulseGuidance = {
      ...idleGuidance,
      isPulseVisible: true,
      stage: 'pulse',
    } as const satisfies GuidancePresentation;
    renderTapRemove(vi.fn(), targets, pulseGuidance);

    const first = screen.getByRole('button', { name: 'First branch' });
    const second = screen.getByRole('button', { name: 'Second branch' });
    expect(first).toHaveStyle({ height: '20%', width: '18%' });
    expect(screen.getByTestId('first-visual').parentElement).toHaveStyle({ scale: '0.6' });
    expect(first).toHaveAttribute('data-guidance', 'true');
    expect(first).toHaveAttribute('data-guidance-mode', 'motion');
    expect(second).toHaveAttribute('data-guidance', 'false');
  });

  it('exposes the low-motion guidance alternative without a demonstration', () => {
    const staticGuidance = {
      ...idleGuidance,
      isStaticHighlightVisible: true,
      stage: 'demonstration',
    } as const satisfies GuidancePresentation;
    renderTapRemove(vi.fn(), targets.slice(0, 1), staticGuidance);

    const first = screen.getByRole('button', { name: 'First branch' });
    expect(first).toHaveAttribute('data-guidance', 'true');
    expect(first).toHaveAttribute('data-guidance-mode', 'static');
  });

  it('cancels safely, ignores secondary pointers, and supports keyboard activation', () => {
    const onComplete = vi.fn();
    renderTapRemove(onComplete, targets.slice(0, 1));
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
    const { rerender } = renderTapRemove(onComplete, targets.slice(0, 1));
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
        guidance={idleGuidance}
        onComplete={onComplete}
        onGuidanceActivity={vi.fn()}
        onGuidanceWrongAction={vi.fn()}
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
      <TapRemove
        guidance={idleGuidance}
        onComplete={onComplete}
        onGuidanceActivity={vi.fn()}
        onGuidanceWrongAction={vi.fn()}
        targets={targets.slice(0, 1)}
      />,
    );
    tapWithPointer(first, 'touch', 2);
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
