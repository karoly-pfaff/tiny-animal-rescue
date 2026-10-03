import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { createTraceProgress, type TraceProgressState } from './trace-progress';

export function useTracePresentation(): Readonly<{
  presentation: TraceProgressState;
  setPresentation: (state: TraceProgressState) => void;
}> {
  const frame = useRef<number | null>(null);
  const pending = useRef<TraceProgressState | null>(null);
  const [presentation, commitPresentation] = useState<TraceProgressState>(createTraceProgress);
  const setPresentation = useCallback((state: TraceProgressState) => {
    if (state.isComplete) {
      commitCompletedPresentation({ commit: commitPresentation, frame, pending }, state);
      return;
    }
    pending.current = state;
    frame.current ??= requestAnimationFrame(() => {
      commitPendingPresentation(frame, pending, commitPresentation);
    });
  }, []);
  useEffect(
    () => () => {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
      }
    },
    [],
  );
  return { presentation, setPresentation };
}

type TraceStateRef = RefObject<TraceProgressState | null>;
type FrameRef = RefObject<number | null>;
type PresentationCommit = (state: TraceProgressState) => void;
type PresentationQueue = Readonly<{
  commit: PresentationCommit;
  frame: FrameRef;
  pending: TraceStateRef;
}>;

function commitCompletedPresentation(
  { commit, frame, pending }: PresentationQueue,
  state: TraceProgressState,
): void {
  if (frame.current !== null) {
    cancelAnimationFrame(frame.current);
    frame.current = null;
  }
  pending.current = null;
  commit(state);
}

function commitPendingPresentation(
  frame: FrameRef,
  pending: TraceStateRef,
  commit: PresentationCommit,
): void {
  frame.current = null;
  const state = pending.current;
  pending.current = null;
  if (state !== null) {
    commit(state);
  }
}
