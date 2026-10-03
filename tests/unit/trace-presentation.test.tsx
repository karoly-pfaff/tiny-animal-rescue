import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTracePresentation } from '../../sources/interactions/trace-presentation';
import type { TraceProgressState } from '../../sources/interactions/trace-progress';

describe('useTracePresentation', () => {
  let callbacks: Map<number, FrameRequestCallback>;
  let nextFrame: number;

  beforeEach(() => {
    callbacks = new Map();
    nextFrame = 1;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const frame = nextFrame;
      nextFrame += 1;
      callbacks.set(frame, callback);
      return frame;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frame) => {
      callbacks.delete(frame);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('commits only the latest progress state in the next browser frame', () => {
    const { result } = renderHook(() => useTracePresentation());
    const first = traceState(0.2);
    const latest = traceState(0.6);

    act(() => {
      result.current.setPresentation(first);
      result.current.setPresentation(latest);
    });

    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    expect(result.current.presentation.progress).toBe(0);
    runFrame(callbacks, 1);
    expect(result.current.presentation).toEqual(latest);
  });

  it('commits completion immediately and cancels a pending progress frame', () => {
    const { result, unmount } = renderHook(() => useTracePresentation());
    const complete = { hasStarted: true, isComplete: true, progress: 1 } as const;

    act(() => {
      result.current.setPresentation(traceState(0.4));
      result.current.setPresentation(complete);
    });

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(result.current.presentation).toEqual(complete);
    expect(callbacks.size).toBe(0);
    unmount();
  });
});

function traceState(progress: number): TraceProgressState {
  return { hasStarted: true, isComplete: false, progress };
}

function runFrame(callbacks: Map<number, FrameRequestCallback>, frame: number): void {
  const callback = callbacks.get(frame);
  if (callback === undefined) {
    throw new Error(`Missing animation frame ${String(frame)}.`);
  }
  act(() => {
    callbacks.delete(frame);
    callback(16.7);
  });
}
