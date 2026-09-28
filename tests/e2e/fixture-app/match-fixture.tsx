import { useState } from 'react';

import { inactiveGuidancePresentation } from '../../../sources/engine/guidance-ladder-state';
import { Match, type MatchItem, type MatchPair } from '../../../sources/interactions/match';

type FixtureItemOptions = Readonly<{
  accessibleLabel: string;
  id: string;
  x: number;
  y: number;
}>;

function fixtureItem({ accessibleLabel, id, x, y }: FixtureItemOptions): MatchItem {
  return {
    accessibleLabel,
    center: { x, y },
    height: 0.2,
    id,
    visual: <span className="fixture-match-object" />,
    width: 0.18,
  };
}

const pairs = [
  {
    completionAnnouncement: 'Round pair matched',
    nonColorCue: <span className="fixture-match-cue fixture-match-cue-round" />,
    source: fixtureItem({ accessibleLabel: 'Round toy', id: 'round-toy', x: 0.2, y: 0.22 }),
    target: fixtureItem({ accessibleLabel: 'Round basket', id: 'round-basket', x: 0.8, y: 0.78 }),
  },
  {
    completionAnnouncement: 'Triangle pair matched',
    nonColorCue: <span className="fixture-match-cue fixture-match-cue-triangle" />,
    source: fixtureItem({
      accessibleLabel: 'Triangle toy',
      id: 'triangle-toy',
      x: 0.2,
      y: 0.5,
    }),
    target: fixtureItem({
      accessibleLabel: 'Triangle basket',
      id: 'triangle-basket',
      x: 0.8,
      y: 0.22,
    }),
  },
  {
    completionAnnouncement: 'Square pair matched',
    nonColorCue: <span className="fixture-match-cue fixture-match-cue-square" />,
    source: fixtureItem({ accessibleLabel: 'Square toy', id: 'square-toy', x: 0.2, y: 0.78 }),
    target: fixtureItem({ accessibleLabel: 'Square basket', id: 'square-basket', x: 0.8, y: 0.5 }),
  },
] satisfies readonly MatchPair[];

export function MatchFixture() {
  const [completionCount, setCompletionCount] = useState(0);
  return (
    <main className="interaction-demo" data-completion-count={completionCount}>
      <div className="interaction-demo-surface match-demo-surface">
        <Match
          guidance={inactiveGuidancePresentation}
          onComplete={() => {
            setCompletionCount((current) => current + 1);
          }}
          onGuidanceActivity={() => undefined}
          onGuidanceWrongAction={() => undefined}
          pairs={pairs}
        />
      </div>
    </main>
  );
}
