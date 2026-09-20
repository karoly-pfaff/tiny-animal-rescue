# Mission review checklist

Use this checklist after the content records and asset inventory exist.

## Product fit

- The problem is understandable from the scene before narration finishes.
- A 3–4-year-old can perform every required action with forgiving input.
- There is no timer, score, failure, guilt, maintenance obligation, or reading requirement.
- The mission has one emotionally clear success state.

## Contract

- IDs are stable lower-case kebab-case.
- Category is Rescue, Help, or World and follows its reward rules.
- Required step count is 2–4, except an approved continuous trace.
- Every step uses an accepted interaction type.
- Prerequisites resolve and introduce no cycle.
- Rewards are finite, recognized, and idempotent.
- No content record contains executable code or an expression.

## Resident and progression

- Rescue unlocks exactly the subject resident.
- Help depends on the resident's Rescue mission.
- World does not create a shelter resident.
- The resident has exactly one compatible shelter area.
- Capacity remains at or below four residents in every base area.
- The mission is reachable in the authored progression and remains replayable.

## Scene and interaction

- One action is visually dominant at each step.
- Sources, targets, and paths remain clear at every supported viewport.
- Decorative layers do not cover hit regions or interaction corridors.
- Color is reinforced by shape, position, icon, or animation.
- Wrong actions return gently and preserve useful partial progress.
- Hint pulse and ghost-hand behavior are declared or covered by defaults.

## Localization and media

- HU and EN keys were added together.
- Intro, each step, success, and resident-name narration are inventoried.
- Production images contain no words, letters, numbers, or pseudo-writing.
- Assets belong to the pack or an explicit dependency.
- Required files and metadata exist; no placeholder is release-eligible.

## Evidence

- Schema and semantic validation pass.
- Relevant unit/integration tests pass.
- The mission has a touch-oriented happy-path test or justified coverage elsewhere.
- Reference screenshots or a visual review cover the active step and success state.
