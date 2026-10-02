import { describe, expect, it } from 'vitest';

import {
  attemptMatch,
  createMatchState,
  isMatchComplete,
  isMatchItemLocked,
  sourceSide,
  targetSide,
  type MatchPairDefinition,
} from '../../sources/interactions/match-state';

const pairs = [
  { sourceId: 'source-a', targetId: 'target-a' },
  { sourceId: 'source-b', targetId: 'target-b' },
] as const satisfies readonly MatchPairDefinition[];

describe('match state', () => {
  it('requires one to three pairs with unique source and target IDs', () => {
    expect(() => createMatchState([])).toThrow('between one and three');
    expect(() =>
      createMatchState([
        ...pairs,
        { sourceId: 'source-c', targetId: 'target-c' },
        { sourceId: 'source-d', targetId: 'target-d' },
      ]),
    ).toThrow('between one and three');
    expect(() =>
      createMatchState([
        { sourceId: 'duplicate', targetId: 'target-a' },
        { sourceId: 'duplicate', targetId: 'target-b' },
      ]),
    ).toThrow('source IDs must be unique');
    expect(() =>
      createMatchState([
        { sourceId: 'source-a', targetId: 'duplicate' },
        { sourceId: 'source-b', targetId: 'duplicate' },
      ]),
    ).toThrow('target IDs must be unique');
  });

  it('selects, toggles, and replaces items on the same side', () => {
    const initial = createMatchState(pairs);
    const selected = attemptMatch(pairs, initial, { id: 'source-a', side: sourceSide });
    const cleared = attemptMatch(pairs, selected, { id: 'source-a', side: sourceSide });
    const reselected = attemptMatch(pairs, cleared, { id: 'source-a', side: sourceSide });
    const replaced = attemptMatch(pairs, reselected, { id: 'source-b', side: sourceSide });

    expect(selected.selected).toEqual({ id: 'source-a', side: sourceSide });
    expect(cleared.selected).toBeNull();
    expect(replaced.selected).toEqual({ id: 'source-b', side: sourceSide });
    expect(isMatchComplete(pairs, replaced)).toBe(false);
  });

  it('keeps the first selection after a gentle wrong attempt', () => {
    const initial = createMatchState(pairs);
    const selected = attemptMatch(pairs, initial, { id: 'source-a', side: sourceSide });
    const rejected = attemptMatch(pairs, selected, { id: 'target-b', side: targetSide });

    expect(rejected.selected).toEqual(selected.selected);
    expect(rejected.incorrectSelection).toEqual({ id: 'target-b', side: targetSide });
    expect(rejected.incorrectRevision).toBe(1);
  });

  it('locks correct pairs once in either input direction', () => {
    const initial = createMatchState(pairs);
    const targetFirst = attemptMatch(pairs, initial, { id: 'target-b', side: targetSide });
    const secondComplete = attemptMatch(pairs, targetFirst, {
      id: 'source-b',
      side: sourceSide,
    });
    const repeated = attemptMatch(pairs, secondComplete, {
      id: 'target-b',
      side: targetSide,
    });
    const sourceFirst = attemptMatch(pairs, repeated, { id: 'source-a', side: sourceSide });
    const complete = attemptMatch(pairs, sourceFirst, { id: 'target-a', side: targetSide });

    expect(repeated).toBe(secondComplete);
    expect(isMatchItemLocked(pairs, complete, { id: 'source-a', side: sourceSide })).toBe(true);
    expect(isMatchItemLocked(pairs, complete, { id: 'target-b', side: targetSide })).toBe(true);
    expect(isMatchComplete(pairs, complete)).toBe(true);
    expect(complete.lastCompletedSourceId).toBe('source-a');
  });

  it('rejects unknown items on either side', () => {
    const state = createMatchState(pairs);
    expect(() => attemptMatch(pairs, state, { id: 'missing-source', side: sourceSide })).toThrow(
      'Unknown match source ID',
    );
    expect(() =>
      isMatchItemLocked(pairs, state, { id: 'missing-target', side: targetSide }),
    ).toThrow('Unknown match target ID');
  });
});
