import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { inactiveGuidancePresentation } from '../../sources/engine/guidance-ladder-state';
import { Match, type MatchItem, type MatchPair } from '../../sources/interactions/match';

type ItemOptions = Readonly<{ accessibleLabel: string; id: string; x: number; y: number }>;

function item({ accessibleLabel, id, x, y }: ItemOptions): MatchItem {
  return {
    accessibleLabel,
    center: { x, y },
    height: 0.2,
    id,
    visual: <span data-testid={`${id}-visual`} />,
    width: 0.2,
  };
}

function pair(id: string, sourceY: number, targetY: number): MatchPair {
  return {
    completionAnnouncement: `${id} matched`,
    nonColorCue: <span data-testid={`${id}-cue`} />,
    source: item({ accessibleLabel: `Source ${id}`, id: `source-${id}`, x: 0.2, y: sourceY }),
    target: item({ accessibleLabel: `Target ${id}`, id: `target-${id}`, x: 0.8, y: targetY }),
  };
}

const firstPair = pair('A', 0.2, 0.8);
const pairs = [firstPair, pair('B', 0.5, 0.2), pair('C', 0.8, 0.5)];

function guidanceProps() {
  return {
    guidance: inactiveGuidancePresentation,
    onGuidanceActivity: vi.fn(),
    onGuidanceWrongAction: vi.fn(),
  } as const;
}

describe('Match', () => {
  it('reports guidance activity and wrong matches while exposing the active cue', () => {
    const onGuidanceActivity = vi.fn();
    const onGuidanceWrongAction = vi.fn();
    const { container } = render(
      <Match
        guidance={{
          ...inactiveGuidancePresentation,
          isStaticHighlightVisible: true,
          stage: 'pulse',
        }}
        onComplete={vi.fn()}
        onGuidanceActivity={onGuidanceActivity}
        onGuidanceWrongAction={onGuidanceWrongAction}
        pairs={pairs}
      />,
    );
    const sourceA = screen.getByRole('button', { name: 'Source A' });

    expect(container.firstChild).toHaveAttribute('data-guidance-mode', 'static');
    expect(container.firstChild).toHaveAttribute('data-guidance-stage', 'pulse');
    expect(sourceA).toHaveAttribute('data-guidance', 'true');

    fireEvent.click(sourceA, { detail: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Target B' }), { detail: 0 });

    expect(onGuidanceActivity).toHaveBeenCalledTimes(2);
    expect(onGuidanceWrongAction).toHaveBeenCalledOnce();
  });

  it('matches up to three pairs in arbitrary order without color-only cues', () => {
    const onComplete = vi.fn();
    const { container, rerender } = render(
      <Match {...guidanceProps()} onComplete={onComplete} pairs={pairs} />,
    );
    const sourceA = screen.getByRole('button', { name: 'Source A' });
    const sourceB = screen.getByRole('button', { name: 'Source B' });
    const sourceC = screen.getByRole('button', { name: 'Source C' });
    const targetA = screen.getByRole('button', { name: 'Target A' });
    const targetB = screen.getByRole('button', { name: 'Target B' });
    const targetC = screen.getByRole('button', { name: 'Target C' });

    expect(screen.getAllByTestId('A-cue')).toHaveLength(2);
    fireEvent.click(targetB, { detail: 0 });
    fireEvent.click(sourceB, { detail: 0 });
    expect(sourceB).toBeDisabled();
    expect(targetB).toBeDisabled();

    fireEvent.click(sourceA, { detail: 0 });
    fireEvent.click(targetC, { detail: 0 });
    expect(sourceA).toHaveAttribute('aria-pressed', 'true');
    expect(targetC).toHaveAttribute('data-incorrect', 'true');
    fireEvent.click(targetA, { detail: 0 });

    fireEvent.click(targetC, { detail: 0 });
    fireEvent.click(sourceC, { detail: 0 });
    expect(container.firstChild).toHaveAttribute('data-complete', 'true');
    expect(sourceC).toBeDisabled();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.getByText('C matched')).toBeInTheDocument();

    rerender(<Match {...guidanceProps()} onComplete={vi.fn()} pairs={pairs} />);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('cancels captured input, ignores secondary pointers, and supports keyboard selection', () => {
    const onComplete = vi.fn();
    render(<Match {...guidanceProps()} onComplete={onComplete} pairs={[firstPair]} />);
    const source = screen.getByRole('button', { name: 'Source A' });
    const target = screen.getByRole('button', { name: 'Target A' });
    const pointerCapture = {
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    };
    const targetPointerCapture = {
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    };
    Object.assign(source, pointerCapture);
    Object.assign(target, targetPointerCapture);
    vi.spyOn(source, 'getBoundingClientRect').mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    });
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    });

    fireEvent.pointerDown(source, {
      button: 2,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'mouse',
    });
    fireEvent.pointerUp(source, { pointerId: 1, pointerType: 'mouse' });
    expect(source).toHaveAttribute('aria-pressed', 'false');

    fireEvent.pointerDown(source, {
      button: 0,
      isPrimary: true,
      pointerId: 2,
      pointerType: 'touch',
    });
    fireEvent.pointerDown(source, {
      button: 0,
      isPrimary: false,
      pointerId: 3,
      pointerType: 'touch',
    });
    fireEvent.pointerUp(source, { pointerId: 3, pointerType: 'touch' });
    fireEvent.pointerCancel(source, { pointerId: 3, pointerType: 'touch' });
    fireEvent.pointerUp(source, {
      clientX: 150,
      clientY: 50,
      pointerId: 2,
      pointerType: 'touch',
    });
    expect(source).toHaveAttribute('aria-pressed', 'false');
    expect(pointerCapture.releasePointerCapture).toHaveBeenCalledOnce();
    fireEvent.pointerDown(source, {
      button: 0,
      isPrimary: true,
      pointerId: 5,
      pointerType: 'touch',
    });
    fireEvent.lostPointerCapture(source, { pointerId: 5, pointerType: 'touch' });
    expect(pointerCapture.releasePointerCapture).toHaveBeenCalledTimes(2);

    fireEvent.click(source, { detail: 1 });
    expect(source).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(source, { detail: 0 });
    fireEvent.pointerDown(target, {
      button: 0,
      clientX: 50,
      clientY: 50,
      isPrimary: true,
      pointerId: 4,
      pointerType: 'touch',
    });
    fireEvent.pointerUp(target, {
      clientX: 50,
      clientY: 50,
      pointerId: 4,
      pointerType: 'touch',
    });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('releases a paused match pointer and accepts fresh input only after resume', () => {
    const onComplete = vi.fn();
    const { rerender } = render(
      <Match {...guidanceProps()} onComplete={onComplete} pairs={[firstPair]} />,
    );
    const source = screen.getByRole('button', { name: 'Source A' });
    const pointerCapture = {
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    };
    Object.assign(source, pointerCapture);
    fireEvent.pointerDown(source, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });

    rerender(<Match {...guidanceProps()} onComplete={onComplete} pairs={[firstPair]} paused />);
    fireEvent.pointerUp(source, { pointerId: 1, pointerType: 'touch' });
    fireEvent.click(source, { detail: 0 });

    expect(pointerCapture.releasePointerCapture).toHaveBeenCalledOnce();
    expect(source).toHaveAttribute('aria-disabled', 'true');
    expect(source).toHaveAttribute('aria-pressed', 'false');

    rerender(<Match {...guidanceProps()} onComplete={onComplete} pairs={[firstPair]} />);
    fireEvent.click(source, { detail: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Target A' }), { detail: 0 });
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
