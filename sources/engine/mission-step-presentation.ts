import type { ReactNode } from 'react';

import type { MatchPair } from '../interactions/match';
import type { TapRemoveTarget } from '../interactions/tap-remove';
import type { TracePath } from '../interactions/trace-progress';

type DragStepPresentation = Readonly<{
  accessibleLabel: string;
  completionAnnouncement: string;
  hideTargetWhenPlaced?: boolean;
  pointerOffsetPx?: number;
  sourceAssetUrl: string | null;
  sourceClassName?: string;
  sourceVisual: ReactNode;
  type: 'drag';
}>;

type TapStepPresentation = Readonly<{
  targets: readonly TapRemoveTarget[];
  type: 'tap';
}>;

type WipeStepPresentation = Readonly<{
  accessibleLabel: string;
  brushRadius?: number;
  columns?: number;
  maskColor: string;
  rows?: number;
  type: 'wipe';
  underlay: ReactNode;
}>;

type MatchStepPresentation = Readonly<{
  pairs: readonly MatchPair[];
  type: 'match';
}>;

type TraceStepPresentation = Readonly<{
  accessibleLabel: string;
  corridorColor: string;
  endAffordance: ReactNode;
  path: TracePath;
  progressColor: string;
  showHint?: boolean;
  startAffordance: ReactNode;
  tracer: ReactNode;
  type: 'trace';
}>;

export type MissionStepPresentation =
  | DragStepPresentation
  | MatchStepPresentation
  | TapStepPresentation
  | TraceStepPresentation
  | WipeStepPresentation;

export type MissionStepPresentationBindings = Readonly<Record<string, MissionStepPresentation>>;
