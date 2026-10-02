import { type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';

import type { GuidancePresentation } from '../engine/guidance-ladder-state';
import { toPercent, type NormalizedPoint } from './drag-geometry';
import {
  activateMatchAccessibly,
  beginMatchPointer,
  cancelMatchPointer,
  finishMatchPointer,
  useMatchPointer,
} from './match-pointer';
import {
  attemptMatch,
  createMatchState,
  isMatchComplete,
  isMatchItemLocked,
  sourceSide,
  targetSide,
  type MatchPairDefinition,
  type MatchSelection,
  type MatchSide,
  type MatchState,
} from './match-state';
import './match.css';

export type MatchItem = Readonly<{
  accessibleLabel: string;
  center: NormalizedPoint;
  height: number;
  id: string;
  visual: ReactNode;
  width: number;
}>;

export type MatchPair = Readonly<{
  completionAnnouncement: string;
  nonColorCue: ReactElement;
  source: MatchItem;
  target: MatchItem;
}>;

type MatchProps = Readonly<{
  guidance: GuidancePresentation;
  onComplete: () => void;
  onGuidanceActivity: () => void;
  onGuidanceWrongAction: () => void;
  pairs: readonly MatchPair[];
  paused?: boolean;
}>;

export function Match({
  guidance,
  onComplete,
  onGuidanceActivity,
  onGuidanceWrongAction,
  pairs,
  paused = false,
}: MatchProps) {
  const definitions = pairDefinitions(pairs);
  const [state, setState] = useState(() => createMatchState(definitions));
  const activePointer = useMatchPointer(paused);
  const completionReported = useRef(false);
  const complete = isMatchComplete(definitions, state);

  useEffect(() => {
    if (complete && !completionReported.current) {
      completionReported.current = true;
      onComplete();
    }
  }, [complete, onComplete]);

  const attempt = (selection: MatchSelection) => {
    onGuidanceActivity();
    const nextState = attemptMatch(definitions, state, selection);
    if (nextState.incorrectRevision > state.incorrectRevision) {
      onGuidanceWrongAction();
    }
    setState(nextState);
  };

  const guidedSelection = guidanceSelection(definitions, state);
  const hasVisibleGuidance = guidance.isPulseVisible || guidance.isStaticHighlightVisible;

  return (
    <div
      className="match-interaction"
      data-complete={complete}
      data-guidance-mode={guidance.isStaticHighlightVisible ? 'static' : 'motion'}
      data-guidance-stage={guidance.stage}
      data-paused={paused}
    >
      {pairs.map((pair) => (
        <MatchButton
          activePointer={activePointer}
          item={pair.source}
          key={`${sourceSide}:${pair.source.id}`}
          nonColorCue={pair.nonColorCue}
          onAttempt={attempt}
          paused={paused}
          pairId={pair.source.id}
          side={sourceSide}
          state={state}
          definitions={definitions}
          guided={
            hasVisibleGuidance &&
            sameSelection(guidedSelection, {
              id: pair.source.id,
              side: sourceSide,
            })
          }
        />
      ))}
      {pairs.map((pair) => (
        <MatchButton
          activePointer={activePointer}
          item={pair.target}
          key={`${targetSide}:${pair.target.id}`}
          nonColorCue={pair.nonColorCue}
          onAttempt={attempt}
          paused={paused}
          pairId={pair.source.id}
          side={targetSide}
          state={state}
          definitions={definitions}
          guided={
            hasVisibleGuidance &&
            sameSelection(guidedSelection, {
              id: pair.target.id,
              side: targetSide,
            })
          }
        />
      ))}
      <span aria-live="polite" className="match-live-region">
        {completionAnnouncement(pairs, state)}
      </span>
    </div>
  );
}

type MatchButtonProps = Readonly<{
  activePointer: ReturnType<typeof useMatchPointer>;
  definitions: readonly MatchPairDefinition[];
  guided: boolean;
  item: MatchItem;
  nonColorCue: ReactElement;
  onAttempt: (selection: MatchSelection) => void;
  pairId: string;
  paused: boolean;
  side: MatchSide;
  state: MatchState;
}>;

function MatchButton(props: MatchButtonProps) {
  const selection = { id: props.item.id, side: props.side };
  const itemKey = `${props.side}:${props.item.id}`;
  const locked = isMatchItemLocked(props.definitions, props.state, selection);
  const selected = sameSelection(props.state.selected, selection);
  const incorrect = sameSelection(props.state.incorrectSelection, selection);
  return (
    <button
      aria-disabled={props.paused}
      aria-label={props.item.accessibleLabel}
      aria-pressed={selected}
      className="match-item"
      data-incorrect={incorrect}
      data-guidance={props.guided}
      data-locked={locked}
      data-match-pair={props.pairId}
      data-side={props.side}
      disabled={locked}
      onClick={(event) => {
        if (!props.paused) {
          activateMatchAccessibly(event, () => {
            props.onAttempt(selection);
          });
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      onLostPointerCapture={(event) => {
        cancelMatchPointer(event, props.activePointer);
      }}
      onPointerCancel={(event) => {
        cancelMatchPointer(event, props.activePointer);
      }}
      onPointerDown={(event) => {
        if (!props.paused) {
          beginMatchPointer(event, props.activePointer, itemKey);
        }
      }}
      onPointerUp={(event) => {
        if (props.paused) {
          cancelMatchPointer(event, props.activePointer);
          return;
        }
        finishMatchPointer({
          activePointer: props.activePointer,
          event,
          itemKey,
          onAttempt: () => {
            props.onAttempt(selection);
          },
        });
      }}
      style={itemStyle(props.item)}
      type="button"
    >
      <span
        aria-hidden="true"
        className="match-item-visual"
        key={`${props.item.id}:${String(incorrect ? props.state.incorrectRevision : 0)}`}
      >
        {props.item.visual}
      </span>
      <span aria-hidden="true" className="match-item-cue">
        {props.nonColorCue}
      </span>
    </button>
  );
}

function pairDefinitions(pairs: readonly MatchPair[]): readonly MatchPairDefinition[] {
  return pairs.map(({ source, target }) => ({ sourceId: source.id, targetId: target.id }));
}

function itemStyle(item: MatchItem): React.CSSProperties {
  return {
    height: toPercent(item.height),
    left: toPercent(item.center.x),
    top: toPercent(item.center.y),
    width: toPercent(item.width),
  };
}

function sameSelection(first: MatchSelection | null, second: MatchSelection): boolean {
  return first?.id === second.id && first.side === second.side;
}

function guidanceSelection(
  pairs: readonly MatchPairDefinition[],
  state: MatchState,
): MatchSelection | null {
  if (state.selected !== null) {
    const pair = pairs.find(
      ({ sourceId, targetId }) =>
        sourceId === state.selected?.id || targetId === state.selected?.id,
    );
    if (pair === undefined) {
      return null;
    }
    return state.selected.side === sourceSide
      ? { id: pair.targetId, side: targetSide }
      : { id: pair.sourceId, side: sourceSide };
  }
  const pair = pairs.find(({ sourceId }) => !state.completedSourceIds.includes(sourceId));
  return pair === undefined ? null : { id: pair.sourceId, side: sourceSide };
}

function completionAnnouncement(pairs: readonly MatchPair[], state: MatchState): string | null {
  return (
    pairs.find(({ source }) => source.id === state.lastCompletedSourceId)?.completionAnnouncement ??
    null
  );
}
