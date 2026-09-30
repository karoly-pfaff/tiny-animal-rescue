# EPIC-004: Map and progression

- Status: In progress
- Milestone: M4
- Target version: `0.5.0`
- Inspection journeys: `map,progression,replay`
- Dependencies: EPIC-002, EPIC-003
- ADRs: ADR-0002, ADR-0008

## Outcome

Deliver the complete rescue map, authored unlock order, location navigation, and replay model without scores or frustrating lock displays.

## Stories

### E004-S01 — Location content and map layout

- [x] Garden, Forest, Farm, Pond, and central Shelter are content-declared.
- [x] Layout remains clear in supported landscape and portrait viewports.
- [x] Each location has a distinct silhouette and color/shape identity.
- [x] Each location declares a distinct semantic audio cue.
- [ ] Tapping a location plays its authored effect asset in the shipped product; production playback
      is carried intact by the bounded E006-S07 deferral below.
- [x] Location labels are runtime-localized and optional to understanding.

### E004-S02 — Progression selectors

- [x] Tutorial is available on a new save.
- [x] Forest and Farm reveal after tutorial completion.
- [x] Pond reveals after any three Rescue completions.
- [x] Mission prerequisites are evaluated from completed IDs.
- [x] Help missions stay hidden until their resident is unlocked.
- [x] Derived availability is deterministic and unit-tested.

### E004-S03 — Rescue call presentation

- [x] Available mission cards show an animal/subject portrait and location cue.
- [x] The next authored mission is visually prominent without blocking other unlocked replays.
- [x] No countdown, urgency pressure, or guilt message is used.
- [x] Selecting a call loads the correct mission and opening narration.

### E004-S04 — Mission replay and completion state

- [x] Completed missions remain accessible from their location.
- [x] Replay never duplicates residents or world rewards.
- [x] Completion is shown as a gentle visual state, not a performance rating.
- [x] Returning from a mission restores map focus to its location.

### E004-S05 — Map E2E coverage

- [x] New-save, post-tutorial, three-rescue, and all-complete seeded states are tested.
- [x] Portrait and landscape navigation screenshots are reviewed.
- [x] Touch targets do not overlap at minimum supported size.

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

## Bounded media deferral

- EPIC-004 proves the declarative map-cue contract and cue dispatch order, but it does not claim that
  the default browser effect service produces audible output. E006-S07 owns production playback for
  `effects.ambience.rescue-center`, `effects.ambience.garden`, `effects.ambience.forest`,
  `effects.ambience.farm`, and `effects.ambience.pond`, including exact R2 keys and digest locks,
  effect-channel and mute behavior, browser-audio unlock, repeated/overlapping playback QA, and
  listening QA. E006-S07 inherits EPIC-004's `map`, `progression`, and `replay` journeys in Hungarian
  and English with mouse, touch, and every supported viewport; EPIC-006 cannot close while any of
  those map cues remains inaudible.
- EPIC-004 also declares six location backgrounds whose production binaries remain outside Git and
  are not yet R2 locked. `images/map/forest-map.png` and
  `images/missions/forest/background.png` are owned by E007-S03;
  `images/map/farm-map.png` and `images/missions/farm/background.png` are owned by E007-S04; and
  `images/map/pond-map.png` and `images/missions/pond/background.png` are owned by E007-S05. Each
  owner must approve provenance/license and full-size QA, upload and digest-lock the exact object,
  materialize it locally, and inherit EPIC-004's `map`, `progression`, and `replay` live-inspection
  journeys for its location. EPIC-007 cannot close until all six carried dependencies pass those
  journeys and the full-playthrough gate in E007-S08.

## Primary risks

- clutter as sixteen missions accumulate;
- hidden dependency mistakes creating unreachable missions;
- portrait layouts shrinking targets below acceptable sizes.
