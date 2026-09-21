# EPIC-001: First rescue vertical slice

- Status: In progress
- Milestone: M1
- Target version: `0.2.0`
- Dependencies: EPIC-000
- ADRs: ADR-0001, ADR-0005, ADR-0006, ADR-0010

## Outcome

Deliver the complete `garden-kitten-tree` experience: start → map → mission → drag ladder → tap Mimi → celebration → minimal shelter → reload with progress preserved.

## Stories

### E001-S01 — Child-facing start and first-run flow

- [x] One dominant Play action enters the first mission path.
- [x] First-run HU/EN selection is accessible without requiring reading from the child after caregiver setup.
- [x] Settings entry is visually secondary and parent-oriented.
- [x] Start art contains no baked text.

### E001-S02 — Minimal Garden map entry

- [ ] The map shows the shelter and Garden mission marker.
- [ ] Selecting the marker opens the correct mission.
- [ ] Other v1 locations are not yet shown as broken/locked promises.
- [ ] Back navigation is safe from accidental single taps during play.

### E001-S03 — Ladder drag step

- [ ] The ladder follows pointer/touch with a visible offset.
- [ ] A valid drop snaps to the tree and completes once.
- [ ] An invalid drop returns gently without negative feedback.
- [ ] Idle guidance pulses and demonstrates the drag under a fake clock.
- [ ] Responsive coordinate mapping is covered by tests.

### E001-S04 — Mimi tap and rescue completion

- [ ] Mimi becomes actionable only after the ladder step.
- [ ] A tap triggers the descent/happy state and completes the mission once.
- [ ] Reward writes before celebration begins.
- [ ] Celebration narrates Mimi's localized name and offers Map/Shelter navigation.

### E001-S05 — Minimal persistence and shelter proof

- [ ] Completion and Mimi's resident unlock survive reload.
- [ ] Re-entering the mission replays it without duplicating rewards.
- [ ] The minimal Indoor Room shows Mimi and supports one tap reaction.
- [ ] Corrupt local test data follows a safe recovery path.

### E001-S06 — Vertical-slice E2E proof

- [ ] HU and EN happy paths pass.
- [ ] Reload after completion shows Mimi in shelter.
- [ ] Reference screenshots cover Start, Map, both mission steps, Celebration, and Shelter.
- [ ] No console error or unhandled rejection occurs.

## Exit criteria

- A non-developer can complete the rescue on a touch device or touch-emulated browser.
- The result persists and is visible in the shelter.
- The slice uses only narrow implementations needed by this mission; generalization is deferred to EPIC-002/003.

## Verification

```text
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:visual
npm run validate:full
```

Inspect the HU/EN touch and mouse journeys, persisted reload, console/unhandled-error capture, and
reviewed screenshots for every vertical-slice screen.

## Primary risks

- temporary slice logic leaking into permanent mission-specific branches;
- celebration appearing before persistence succeeds;
- drag geometry feeling correct with a mouse but failing under a finger.
