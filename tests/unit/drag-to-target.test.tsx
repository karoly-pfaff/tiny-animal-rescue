import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DragToTarget } from '../../sources/interactions/drag-to-target';
import {
  clientPointToNormalized,
  isInsideTarget,
  type NormalizedTarget,
} from '../../sources/interactions/drag-geometry';

const start = { x: 0.2, y: 0.72 } as const;
const target = {
  center: { x: 0.65, y: 0.68 },
  height: 0.42,
  width: 0.24,
} as const satisfies NormalizedTarget;

afterEach(() => {
  vi.useRealTimers();
});

function renderInteraction(onComplete = vi.fn()) {
  const result = render(
    <DragToTarget
      accessibleLabel="Move the ladder"
      completionAnnouncement="Placed"
      hintDelayMs={4_000}
      onComplete={onComplete}
      start={start}
      target={target}
    />,
  );
  const ladder = screen.getByRole('button', { name: 'Move the ladder' });
  const pointerCapture = {
    hasPointerCapture: vi.fn(() => true),
    releasePointerCapture: vi.fn(),
    setPointerCapture: vi.fn(),
  };
  Object.assign(ladder, pointerCapture);
  const interaction = ladder.parentElement;
  if (interaction === null) {
    throw new Error('Drag interaction surface is missing.');
  }
  vi.spyOn(interaction, 'getBoundingClientRect').mockReturnValue({
    bottom: 768,
    height: 768,
    left: 0,
    right: 1024,
    top: 0,
    width: 1024,
    x: 0,
    y: 0,
    toJSON: () => undefined,
  });
  return { ...result, interaction, ladder, onComplete, pointerCapture };
}

describe('drag-to-target geometry', () => {
  it('maps client points responsively, clamps edges, and keeps a visible finger offset', () => {
    expect(
      clientPointToNormalized(
        { x: 522, y: 434 },
        { height: 768, left: 10, top: 2, width: 1024 },
        48,
      ),
    ).toEqual({ x: 0.5, y: 0.5 });
    expect(
      clientPointToNormalized({ x: -20, y: 900 }, { height: 600, left: 0, top: 0, width: 800 }, 48),
    ).toEqual({ x: 0, y: 1 });
  });

  it('accepts target edges and rejects points outside the responsive target', () => {
    expect(isInsideTarget({ x: 0.53, y: 0.47 }, target)).toBe(true);
    expect(isInsideTarget({ x: 0.529, y: 0.47 }, target)).toBe(false);
    expect(isInsideTarget({ x: 0.65, y: 0.891 }, target)).toBe(false);
  });
});

describe('DragToTarget', () => {
  it('snaps a valid primary-pointer drop and completes exactly once', () => {
    const { ladder, onComplete } = renderInteraction();
    fireEvent.pointerDown(ladder, {
      button: 0,
      clientX: 205,
      clientY: 601,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    fireEvent.pointerMove(ladder, { clientX: 666, clientY: 517, pointerId: 1 });
    fireEvent.pointerUp(ladder, { clientX: 666, clientY: 517, pointerId: 1 });
    fireEvent.click(ladder, { detail: 0 });

    expect(ladder).toHaveAttribute('data-phase', 'placed');
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('returns gently after an invalid drop and ignores secondary input', () => {
    const { ladder, onComplete } = renderInteraction();
    fireEvent.pointerDown(ladder, {
      button: 2,
      clientX: 205,
      clientY: 601,
      isPrimary: true,
      pointerId: 9,
      pointerType: 'mouse',
    });
    fireEvent.pointerUp(ladder, { clientX: 666, clientY: 517, pointerId: 9 });
    expect(ladder).toHaveAttribute('data-phase', 'idle');

    fireEvent.pointerDown(ladder, {
      button: 0,
      clientX: 205,
      clientY: 601,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    fireEvent.pointerUp(ladder, { clientX: 120, clientY: 130, pointerId: 1 });

    expect(ladder).toHaveAttribute('data-phase', 'idle');
    expect(ladder).toHaveStyle({ left: '20%', top: '72%' });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows deterministic idle guidance under a fake clock and hides it on interaction', () => {
    vi.useFakeTimers();
    const { interaction, ladder } = renderInteraction();

    void act(() => vi.advanceTimersByTime(3_999));
    expect(interaction.querySelector('.drag-ghost-hand')).not.toBeInTheDocument();
    expect(interaction).toHaveAttribute('data-guidance', 'false');
    void act(() => vi.advanceTimersByTime(1));
    expect(interaction.querySelector('.drag-ghost-hand')).toBeInTheDocument();
    expect(interaction).toHaveAttribute('data-guidance', 'true');

    fireEvent.pointerDown(ladder, {
      button: 0,
      clientX: 205,
      clientY: 601,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    expect(interaction.querySelector('.drag-ghost-hand')).not.toBeInTheDocument();
    expect(interaction).toHaveAttribute('data-guidance', 'false');
  });

  it('returns without completion after pointer cancellation or lost capture', () => {
    const { ladder, onComplete, pointerCapture } = renderInteraction();
    fireEvent.pointerDown(ladder, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    fireEvent.pointerCancel(ladder, { pointerId: 1 });
    expect(ladder).toHaveAttribute('data-phase', 'idle');

    fireEvent.pointerDown(ladder, {
      button: 0,
      isPrimary: true,
      pointerId: 3,
      pointerType: 'touch',
    });
    fireEvent.lostPointerCapture(ladder, { pointerId: 3 });

    expect(ladder).toHaveAttribute('data-phase', 'idle');
    expect(pointerCapture.releasePointerCapture).toHaveBeenCalledTimes(2);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('keeps the active pointer authoritative during a multi-pointer drag', () => {
    const { ladder, onComplete } = renderInteraction();
    fireEvent.pointerDown(ladder, {
      button: 0,
      clientX: 205,
      clientY: 601,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    fireEvent.pointerDown(ladder, {
      button: 0,
      clientX: 666,
      clientY: 517,
      isPrimary: false,
      pointerId: 2,
      pointerType: 'touch',
    });
    fireEvent.pointerMove(ladder, { clientX: 666, clientY: 517, pointerId: 2 });
    fireEvent.pointerUp(ladder, { clientX: 666, clientY: 517, pointerId: 2 });
    expect(ladder).toHaveAttribute('data-phase', 'dragging');
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.pointerMove(ladder, { clientX: 666, clientY: 565, pointerId: 1 });
    fireEvent.pointerUp(ladder, { clientX: 666, clientY: 565, pointerId: 1 });
    expect(ladder).toHaveAttribute('data-phase', 'placed');
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('supports keyboard and assistive activation', () => {
    const { ladder, onComplete } = renderInteraction();
    fireEvent.click(ladder, { detail: 0 });
    expect(ladder).toHaveAttribute('data-phase', 'placed');
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
