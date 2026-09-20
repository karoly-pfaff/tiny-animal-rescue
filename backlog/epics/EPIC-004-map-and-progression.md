# EPIC-004: Map and progression

- Status: Planned
- Milestone: M4
- Target version: `0.5.0`
- Dependencies: EPIC-002, EPIC-003
- ADRs: ADR-0002, ADR-0008

## Outcome

Deliver the complete rescue map, authored unlock order, location navigation, and replay model without scores or frustrating lock displays.

## Stories

### E004-S01 — Location content and map layout

- [ ] Garden, Forest, Farm, Pond, and central Shelter are content-declared.
- [ ] Layout remains clear in supported landscape and portrait viewports.
- [ ] Each location has a distinct silhouette, color/shape identity, and audio cue.
- [ ] Location labels are runtime-localized and optional to understanding.

### E004-S02 — Progression selectors

- [ ] Tutorial is available on a new save.
- [ ] Forest and Farm reveal after tutorial completion.
- [ ] Pond reveals after any three Rescue completions.
- [ ] Mission prerequisites are evaluated from completed IDs.
- [ ] Help missions stay hidden until their resident is unlocked.
- [ ] Derived availability is deterministic and unit-tested.

### E004-S03 — Rescue call presentation

- [ ] Available mission cards show an animal/subject portrait and location cue.
- [ ] The next authored mission is visually prominent without blocking other unlocked replays.
- [ ] No countdown, urgency pressure, or guilt message is used.
- [ ] Selecting a call loads the correct mission and opening narration.

### E004-S04 — Mission replay and completion state

- [ ] Completed missions remain accessible from their location.
- [ ] Replay never duplicates residents or world rewards.
- [ ] Completion is shown as a gentle visual state, not a performance rating.
- [ ] Returning from a mission restores map focus to its location.

### E004-S05 — Map E2E coverage

- [ ] New-save, post-tutorial, three-rescue, and all-complete seeded states are tested.
- [ ] Portrait and landscape navigation screenshots are reviewed.
- [ ] Touch targets do not overlap at minimum supported size.

## Exit criteria

- All v1 locations and progression rules are demonstrable with seeded content.
- A child always has one clear available action and can replay completed content.
- No stored “unlock” flags duplicate rules that can be derived from progress.

## Verification

```text
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:visual
npm run validate:full
```

Inspect new-save, post-tutorial, three-rescue, all-complete, replay, portrait, and landscape evidence
with deterministic progression fixtures.

## Primary risks

- clutter as sixteen missions accumulate;
- hidden dependency mistakes creating unreachable missions;
- portrait layouts shrinking targets below acceptable sizes.
