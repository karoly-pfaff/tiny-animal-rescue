import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FirstMissionScreen } from '../../sources/app/first-mission-screen';

afterEach(() => {
  vi.useRealTimers();
});

describe('FirstMissionScreen protected exit', () => {
  it('ignores a tap and exits only after the deliberate hold duration', () => {
    vi.useFakeTimers();
    const onExit = vi.fn();
    render(<FirstMissionScreen locale="hu" onExit={onExit} />);
    const back = screen.getByRole('button', { name: 'Tartsd nyomva a térképhez' });

    fireEvent.pointerDown(back, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    void act(() => vi.advanceTimersByTime(649));
    fireEvent.pointerUp(back, { pointerId: 1 });
    void act(() => vi.advanceTimersByTime(1));
    expect(onExit).not.toHaveBeenCalled();

    fireEvent.pointerDown(back, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    void act(() => vi.advanceTimersByTime(650));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('ignores secondary mouse input and keeps the active pointer authoritative', () => {
    vi.useFakeTimers();
    const onExit = vi.fn();
    render(<FirstMissionScreen locale="en" onExit={onExit} />);
    const back = screen.getByRole('button', { name: 'Hold to return to the map' });

    fireEvent.pointerDown(back, {
      button: 2,
      isPrimary: true,
      pointerId: 8,
      pointerType: 'mouse',
    });
    void act(() => vi.advanceTimersByTime(650));
    expect(onExit).not.toHaveBeenCalled();

    fireEvent.pointerDown(back, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: 'touch',
    });
    fireEvent.pointerDown(back, {
      button: 0,
      isPrimary: false,
      pointerId: 2,
      pointerType: 'touch',
    });
    fireEvent.pointerUp(back, { pointerId: 2 });
    void act(() => vi.advanceTimersByTime(650));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('supports keyboard and assistive click activation without weakening pointer safety', () => {
    const onExit = vi.fn();
    render(<FirstMissionScreen locale="en" onExit={onExit} />);
    const back = screen.getByRole('button', { name: 'Hold to return to the map' });

    fireEvent.click(back, { detail: 1 });
    expect(onExit).not.toHaveBeenCalled();
    fireEvent.click(back, { detail: 0 });
    expect(onExit).toHaveBeenCalledOnce();
  });
});
