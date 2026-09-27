export type MatchSide = 'source' | 'target';

export type MatchPairDefinition = Readonly<{
  sourceId: string;
  targetId: string;
}>;

export type MatchSelection = Readonly<{
  id: string;
  side: MatchSide;
}>;

export type MatchState = Readonly<{
  completedSourceIds: readonly string[];
  incorrectRevision: number;
  incorrectSelection: MatchSelection | null;
  lastCompletedSourceId: string | null;
  selected: MatchSelection | null;
}>;

export const sourceSide = 'source' satisfies MatchSide;
export const targetSide = 'target' satisfies MatchSide;

export function createMatchState(pairs: readonly MatchPairDefinition[]): MatchState {
  assertPairCount(pairs);
  assertUniqueIds(
    pairs.map(({ sourceId }) => sourceId),
    sourceSide,
  );
  assertUniqueIds(
    pairs.map(({ targetId }) => targetId),
    targetSide,
  );
  return {
    completedSourceIds: [],
    incorrectRevision: 0,
    incorrectSelection: null,
    lastCompletedSourceId: null,
    selected: null,
  };
}

export function attemptMatch(
  pairs: readonly MatchPairDefinition[],
  state: MatchState,
  selection: MatchSelection,
): MatchState {
  const selectedPair = requirePair(pairs, selection);
  if (state.completedSourceIds.includes(selectedPair.sourceId)) {
    return state;
  }
  if (state.selected === null) {
    return selectItem(state, selection);
  }
  if (state.selected.side === selection.side) {
    return selectSameSide(state, selection);
  }
  return resolvePairAttempt({
    firstSelection: state.selected,
    pairs,
    selectedPair,
    selection,
    state,
  });
}

export function isMatchComplete(pairs: readonly MatchPairDefinition[], state: MatchState): boolean {
  return state.completedSourceIds.length === pairs.length;
}

export function isMatchItemLocked(
  pairs: readonly MatchPairDefinition[],
  state: MatchState,
  selection: MatchSelection,
): boolean {
  return state.completedSourceIds.includes(requirePair(pairs, selection).sourceId);
}

function assertPairCount(pairs: readonly MatchPairDefinition[]): void {
  if (pairs.length < 1 || pairs.length > 3) {
    throw new Error('Match interactions require between one and three pairs.');
  }
}

function assertUniqueIds(ids: readonly string[], side: MatchSide): void {
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Match ${side} IDs must be unique.`);
  }
}

function requirePair(
  pairs: readonly MatchPairDefinition[],
  selection: MatchSelection,
): MatchPairDefinition {
  const pair = pairs.find((candidate) => idForSide(candidate, selection.side) === selection.id);
  if (pair === undefined) {
    throw new Error(`Unknown match ${selection.side} ID: ${selection.id}.`);
  }
  return pair;
}

function idForSide(pair: MatchPairDefinition, side: MatchSide): string {
  return side === sourceSide ? pair.sourceId : pair.targetId;
}

function selectItem(state: MatchState, selection: MatchSelection): MatchState {
  return { ...state, incorrectSelection: null, selected: selection };
}

function selectSameSide(state: MatchState, selection: MatchSelection): MatchState {
  const selected = state.selected?.id === selection.id ? null : selection;
  return { ...state, incorrectSelection: null, selected };
}

type ResolvePairOptions = Readonly<{
  firstSelection: MatchSelection;
  pairs: readonly MatchPairDefinition[];
  selectedPair: MatchPairDefinition;
  selection: MatchSelection;
  state: MatchState;
}>;

function resolvePairAttempt({
  firstSelection,
  pairs,
  selectedPair,
  selection,
  state,
}: ResolvePairOptions): MatchState {
  const firstPair = requirePair(pairs, firstSelection);
  return firstPair.sourceId === selectedPair.sourceId
    ? completePair(state, selectedPair.sourceId)
    : rejectPair(state, selection);
}

function completePair(state: MatchState, sourceId: string): MatchState {
  return {
    ...state,
    completedSourceIds: [...state.completedSourceIds, sourceId],
    incorrectSelection: null,
    lastCompletedSourceId: sourceId,
    selected: null,
  };
}

function rejectPair(state: MatchState, selection: MatchSelection): MatchState {
  return {
    ...state,
    incorrectRevision: state.incorrectRevision + 1,
    incorrectSelection: selection,
  };
}
