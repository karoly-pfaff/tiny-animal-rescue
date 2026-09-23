type MissionType = 'rescue' | 'help' | 'world';

type MissionPrerequisite = Readonly<{ completedMissionId: string }>;

type MissionReward = Readonly<{
  completeMission: true;
  unlockResidentId?: string;
  worldFlags?: readonly string[];
}>;

type MissionLocalizationKeys = Readonly<{
  titleKey: string;
  introKey: string;
  successKey: string;
}>;

type HintStrategy = Readonly<{
  type: 'pulse-after-delay';
  delayMs: number;
}>;

type StepSuccessCue =
  | 'effects.interaction.tap-remove'
  | 'effects.interaction.obstacle-cleared'
  | 'effects.interaction.drag-snap'
  | 'effects.interaction.wipe-complete'
  | 'effects.interaction.match-success'
  | 'effects.interaction.trace-complete'
  | 'effects.progress.step-complete';

type MissionStepBase = Readonly<{
  id: string;
  promptKey: string;
  successCue: StepSuccessCue;
  hint: HintStrategy;
}>;

type TapStep = MissionStepBase &
  Readonly<{
    type: 'tap';
    targetIds: readonly string[];
  }>;

type DragStep = MissionStepBase &
  Readonly<{
    type: 'drag';
    sourceId: string;
    targetId: string;
    snapTolerance: number;
  }>;

type WipeStep = MissionStepBase &
  Readonly<{
    type: 'wipe';
    maskId: string;
    completionRatio: number;
  }>;

type MatchStep = MissionStepBase &
  Readonly<{
    type: 'match';
    pairs: readonly Readonly<{ sourceId: string; targetId: string }>[];
  }>;

type TraceStep = MissionStepBase &
  Readonly<{
    type: 'trace';
    pathId: string;
    corridorWidth: number;
  }>;

type MissionStep = TapStep | DragStep | WipeStep | MatchStep | TraceStep;

export type MissionRecord = Readonly<{
  id: string;
  type: MissionType;
  locationId: string;
  subjectAnimalId?: string;
  prerequisites: readonly MissionPrerequisite[];
  scene: Readonly<{
    background: string;
    designWidth: 1024;
    designHeight: 768;
  }>;
  steps: readonly MissionStep[];
  reward: MissionReward;
  localization: MissionLocalizationKeys;
  assets: Readonly<{ required: readonly string[] }>;
}>;
