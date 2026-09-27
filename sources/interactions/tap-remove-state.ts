export type TapRemoveState = Readonly<{
  activeTargetIndex: number;
  completedTargetIds: readonly string[];
  incorrectAttemptRevision: number;
  incorrectTargetId: string | null;
}>;

export const initialTapRemoveState: TapRemoveState = {
  activeTargetIndex: 0,
  completedTargetIds: [],
  incorrectAttemptRevision: 0,
  incorrectTargetId: null,
};

export function attemptTapTarget(
  targetIds: readonly string[],
  state: TapRemoveState,
  targetId: string,
): TapRemoveState {
  const expectedTargetId = targetIds[state.activeTargetIndex];
  if (expectedTargetId === undefined || state.completedTargetIds.includes(targetId)) {
    return state;
  }
  if (targetId !== expectedTargetId) {
    return {
      ...state,
      incorrectAttemptRevision: state.incorrectAttemptRevision + 1,
      incorrectTargetId: targetId,
    };
  }
  return {
    activeTargetIndex: state.activeTargetIndex + 1,
    completedTargetIds: [...state.completedTargetIds, targetId],
    incorrectAttemptRevision: state.incorrectAttemptRevision,
    incorrectTargetId: null,
  };
}
