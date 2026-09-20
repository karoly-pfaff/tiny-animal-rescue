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
  schemaVersion: 1
  createdAt: string
  updatedAt: string
  locale: 'hu' | 'en'
  settings: {
    musicVolume: number
    effectsVolume: number
    narrationVolume: number
    reducedMotion: boolean
  }
  completedMissionIds: string[]
  unlockedResidentIds: string[]
  worldFlags: string[]
  currentMission?: {
    missionId: string
    completedStepIds: string[]
    stepState?: Record<string, unknown>
  }
}
```

The concrete persisted format must further constrain `stepState` by interaction type; arbitrary values are shown only to illustrate resumability.

## Storage

Use a repository interface with an IndexedDB implementation and an in-memory implementation for tests. Local storage may hold only a small bootstrap/settings hint, not the authoritative save.

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

## Reset

Reset progress is behind the parent gate, requires a second confirmation, and preserves audio/language settings unless the parent selects a full reset.

