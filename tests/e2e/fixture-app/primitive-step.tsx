import type { ReactElement } from 'react';

import type {
  MatchStep,
  MissionStep,
  TapStep,
  TraceStep,
} from '../../../sources/content/mission-contract';
import type { GuidancePresentation } from '../../../sources/engine/guidance-ladder-state';
import {
  MissionStepRenderer,
  type MissionStepPresentation,
} from '../../../sources/engine/mission-step-renderer';
import type { ActiveMissionInteraction } from '../../../sources/engine/use-mission-step-orchestrator';
import type { MatchItem, MatchPair } from '../../../sources/interactions/match';
import type { TapRemoveTarget } from '../../../sources/interactions/tap-remove';
import type { TracePath } from '../../../sources/interactions/trace-progress';
import { fixtureTracePath } from './trace-fixture-path';

type PrimitiveStepProps = Readonly<{
  active: ActiveMissionInteraction<MissionStep>;
  guidance: GuidancePresentation;
  onComplete: () => void;
  onGuidanceActivity: () => void;
  onGuidanceWrongAction: () => void;
  paused: boolean;
  prompt: string;
}>;

const tracePaths: Readonly<Record<string, TracePath>> = {
  'gentle-pond-route': fixtureTracePath,
};

export function PrimitiveStep(props: PrimitiveStepProps): ReactElement {
  return (
    <MissionStepRenderer
      active={props.active}
      guidance={props.guidance}
      onComplete={props.onComplete}
      onGuidanceActivity={props.onGuidanceActivity}
      onGuidanceWrongAction={props.onGuidanceWrongAction}
      presentations={{
        [props.active.step.id]: primitivePresentation(props.active.step, props.prompt),
      }}
    />
  );
}

function primitivePresentation(step: MissionStep, prompt: string): MissionStepPresentation {
  switch (step.type) {
    case 'tap':
      return { targets: tapTargets(step, prompt), type: 'tap' };
    case 'drag':
      return {
        accessibleLabel: prompt,
        completionAnnouncement: 'Basket placed',
        sourceAssetUrl: null,
        sourceClassName: 'fixture-drag-source',
        sourceVisual: <span className="fixture-drag-basket" />,
        type: 'drag',
      };
    case 'wipe':
      return {
        accessibleLabel: prompt,
        brushRadius: 0.1,
        columns: 64,
        maskColor: '#7b6048',
        rows: 64,
        type: 'wipe',
        underlay: <FixtureWipeUnderlay />,
      };
    case 'match':
      return { pairs: matchPairs(step), type: 'match' };
    case 'trace':
      return tracePresentation(step, prompt);
    default:
      return assertNever(step);
  }
}

function tapTargets(step: TapStep, prompt: string): readonly TapRemoveTarget[] {
  return step.targetIds.map((id, index) => ({
    accessibleLabel: `${prompt}: ${String(index + 1)}`,
    center: { x: (index + 1) / (step.targetIds.length + 1), y: 0.52 },
    height: 0.34,
    id,
    visual: <span className={`fixture-tap-leaf fixture-tap-leaf-${String(index + 1)}`} />,
    visualScale: 0.7,
    width: 0.3,
  }));
}

function matchPairs(step: MatchStep): readonly MatchPair[] {
  return step.pairs.map((pair, index) => {
    const y = (index + 1) / (step.pairs.length + 1);
    return {
      completionAnnouncement: `${humanize(pair.sourceId)} matched`,
      nonColorCue: matchCue(index),
      source: matchItem(pair.sourceId, 0.2, y),
      target: matchItem(pair.targetId, 0.8, y),
    };
  });
}

function matchItem(id: string, x: number, y: number): MatchItem {
  return {
    accessibleLabel: humanize(id),
    center: { x, y },
    height: 0.22,
    id,
    visual: <span className="fixture-match-object" />,
    width: 0.2,
  };
}

function matchCue(index: number): ReactElement {
  const shapeNames = ['round', 'triangle', 'square'] as const;
  const shape = shapeNames[index] ?? 'round';
  return <span className={`fixture-match-cue fixture-match-cue-${shape}`} />;
}

function tracePresentation(step: TraceStep, prompt: string): MissionStepPresentation {
  const path = tracePaths[step.pathId];
  if (path === undefined) {
    throw new Error(`Unknown fixture trace path: ${step.pathId}`);
  }
  return {
    accessibleLabel: prompt,
    corridorColor: '#f2d69a',
    endAffordance: <span className="fixture-trace-pond" />,
    path,
    progressColor: '#65a986',
    startAffordance: <span className="fixture-trace-start" />,
    tracer: <span className="fixture-trace-turtle" />,
    type: 'trace',
  };
}

function FixtureWipeUnderlay() {
  return (
    <span className="interaction-demo-underlay">
      <span className="interaction-demo-paw interaction-demo-paw-main" />
      <span className="interaction-demo-paw interaction-demo-paw-one" />
      <span className="interaction-demo-paw interaction-demo-paw-two" />
      <span className="interaction-demo-paw interaction-demo-paw-three" />
    </span>
  );
}

function humanize(id: string): string {
  return id.replaceAll('-', ' ');
}

function assertNever(value: never): never {
  throw new Error(`Unsupported primitive demonstration step: ${JSON.stringify(value)}`);
}
