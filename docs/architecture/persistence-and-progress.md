# Persistence and progression

## Principles

- save locally and automatically;
- commit meaningful progress before showing celebration;
- make every reward idempotent;
- keep save data small and content-agnostic;
- migrate forward explicitly;
- never erase a valid save because an optional record is unavailable.

## Save model

```ts
type SaveGameV1 = {
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  locale: 'hu' | 'en';
  settings: {
    musicVolume: number;
    effectsVolume: number;
    narrationVolume: number;
    reducedMotion: boolean;
  };
  completedMissionIds: string[];
  unlockedResidentIds: string[];
  worldFlags: string[];
  currentMission?: {
    missionId: string;
    completedStepIds: string[];
    stepState?:
      | { interaction: 'drag'; stepId: string; placedItemIds: string[] }
      | { interaction: 'match'; stepId: string; matchedPairIds: string[] }
      | { interaction: 'tap'; stepId: string; acknowledged: boolean }
      | { interaction: 'trace'; stepId: string; progress: number }
      | { interaction: 'wipe'; stepId: string; clearedCellIds: string[] };
  };
};
```

`stepState` is deliberately a closed union. Content cannot persist arbitrary executable or
unbounded values in the save.

## Storage

Use a repository interface with typed `load`, `transaction`, `replace`, and `reset` operations, an
IndexedDB implementation, and a deterministic in-memory implementation for tests. Writes are
serialized so concurrent callers cannot base changes on the same stale snapshot. Local storage may
hold only a small bootstrap/settings hint, not the authoritative save.

## Commit boundaries

- Settings save immediately.
- A completed mission step commits resumable state.
- Mission completion writes completed mission, reward, and cleared current mission in one logical transaction.
- Celebration starts only after that transaction succeeds.

## Resume behavior

If the app closes mid-mission, opening that mission resumes at the first incomplete step. Partial wipe/trace data may be persisted at coarse intervals, but v1 may restart the current step if preserving it would add disproportionate complexity. Completed steps must never be lost.

## Migration

Each schema version has a pure migration to the next version. Migrations are deterministic, unit-tested, and never fetch network data. Unknown future versions stop with a parent-facing recovery path and do not overwrite the file.

## Progression selectors

Availability is derived rather than stored:

- tutorial mission is available on a new save;
- Forest and Farm appear after tutorial completion;
- Pond appears after any three Rescue completions;
- authored mission prerequisites reveal later missions;
- completed missions remain replayable;
- Help missions remain hidden until their resident is unlocked.

The runtime derives these results deterministically from content-declared location requirements,
mission prerequisites, known completed mission IDs, and unlocked resident IDs. Unknown completed IDs
do not satisfy Rescue-count thresholds, and the save does not duplicate derived location availability
as an unlock flag.

The map presents the selector's available missions in authored order. It emphasizes the first
incomplete mission without removing completed missions from replay, and opens a selected mission on
its content-addressed `/mission/<mission-id>` route. Direct mission routes are subject to the same
availability selector and return to the current map when the mission is unknown or unavailable.
Completed calls use a gentle, non-rating visual marker and remain actionable. During the current app
session, mission navigation remembers the selected location so an exit or post-celebration return
reopens that location and restores keyboard focus to its landmark. This transient navigation context
is not a persisted unlock flag and does not participate in progression derivation.

## Reset

Reset progress is behind the parent gate, requires a second confirmation, and preserves audio/language settings unless the parent selects a full reset.
