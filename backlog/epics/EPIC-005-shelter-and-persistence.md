# EPIC-005: Shelter and persistence

- Status: Planned
- Milestone: M5
- Target version: `0.6.0`
- Inspection journeys: `shelter,persistence,reload`
- Dependencies: EPIC-002, EPIC-004
- ADRs: ADR-0004, ADR-0006, ADR-0008

## Outcome

Create the persistent three-area shelter for twelve residents and harden versioned local progress, idempotent rewards, resume behavior, and reset flows.

## Stories

### E005-S01 — Final save repository and schema

- [x] IndexedDB repository implements typed load, transaction, replace, and reset operations.
- [x] In-memory repository supports deterministic tests.
- [x] Save timestamps, schema version, settings, completed missions, residents, flags, and resumable mission state are represented.
- [x] Writes are serialized to avoid stale overwrites.

### E005-S02 — Migration and recovery framework

- [x] Pure sequential migration functions exist with fixtures.
- [x] Unknown future versions are preserved and not overwritten.
- [x] Corrupt current data produces a parent-facing recovery choice.
- [x] Recovery never fabricates completed missions or residents.

### E005-S03 — Atomic completion and resume

- [x] Step completion persists according to the documented policy.
- [x] Mission completion, resident unlock, world flags, and current-mission cleanup commit atomically.
- [x] Repeated completion events are idempotent.
- [x] Background/foreground and browser refresh cases are integration-tested.

### E005-S04 — Three shelter areas

- [x] Indoor Room, Garden, and Pondside load from content.
- [x] Swipe and large arrows navigate areas.
- [x] The current area is announced visually and, when requested, audibly.
- [x] Each area renders at most four residents with non-overlapping hit regions.
- [x] Empty slots are visually natural, not shown as locked silhouettes.

### E005-S05 — Resident presentation and reactions

- [x] Unlocked residents appear in deterministic content-defined positions.
- [x] A tap speaks the name and triggers a short allowed reaction.
- [x] Pet/feed/play moments end cleanly and create no persistent need state.
- [x] Locked residents do not leak through asset preloading or focus order.

### E005-S06 — Reset progress

- [x] Reset sits behind the parent gate with second confirmation.
- [x] Progress-only reset preserves locale/audio settings.
- [x] Full reset is explicit and returns to first run.
- [x] Reset operations are tested under interrupted/failed storage conditions.

### E005-S07 — Full shelter proof

- [x] A seeded save renders all twelve residents in their catalog areas.
- [x] Capacity validator rejects a fifth base resident in any area.
- [x] Screenshots cover empty, partially filled, and complete shelter states.

#### Bounded resident-media deferral

E005-S07 proves the declarative twelve-resident population, deterministic placement, capacity,
localization, and fallback layout. It does not claim that the pending resident cutouts or the two
pending shelter backgrounds are production-complete. Under ADR-0012, production and final live
inspection are owned exactly as follows:

- E007-S02 owns Morzsi/Biscuit and Breki/Hoppy production resident media;
- E007-S03 owns Süni/Prickle, Csipi/Peep, Makk/Acorn, and Rozi/Rosie production resident media;
- E007-S04 owns Pipi and Pamacs/Floss production resident media;
- E007-S05 owns Totó/Toto, Kiki, and Habi/Bubbles production resident media; and
- E007-S06 owns the final Garden and Pondside shelter backgrounds plus assembled placement of all
  twelve residents, including already-approved Mimi.

Each owning story must carry the inherited `shelter` journey through HU and EN, mouse and touch, and
the complete supported viewport matrix with its owned R2 media locked and locally materialized.
E007-S06 may not close until the resident media owned by E007-S02 through E007-S05 has passed those
checks. Until then the deterministic development fallback is expected evidence, not production-media
approval.

#### Bounded shelter-voice deferral

E005-S04 and E005-S05 prove semantic cue dispatch, localized fallback copy, repeat controls, and
code-native speech fallback. They do not claim production-complete recorded shelter narration.
Ownership and inherited evidence are exact:

- E006-S07 owns `voice.shelter.indoor-room.name`,
  `voice.shelter.shelter-garden.name`, `voice.shelter.pondside.name`, and
  `voice.resident.mimi-kitten.name` in Hungarian and English as part of the bounded first-rescue
  audio set.
- E007-S07 owns the Hungarian and English production recordings for
  `voice.resident.morzsi-puppy.name`, `voice.resident.pipi-chick.name`,
  `voice.resident.csipi-bird.name`, `voice.resident.suni-hedgehog.name`,
  `voice.resident.makk-squirrel.name`, `voice.resident.pamacs-lamb.name`,
  `voice.resident.rozi-fawn.name`, `voice.resident.toto-turtle.name`,
  `voice.resident.kiki-duckling.name`, `voice.resident.breki-frog.name`, and
  `voice.resident.habi-fish.name`.

Both owning stories inherit E005's `shelter` journey in Hungarian and English, including listening
QA for area-name repeat and resident taps with mouse and touch. E006-S07 must additionally cover the
complete supported viewport matrix for the first-rescue shelter state; E007-S07 must cover all twelve
residents after their owning production art is materialized. Until those stories close, browser
speech is an expected bounded dependency and is not production-media approval.

## Exit criteria

- Progress survives restart and migrations.
- All twelve residents fit comfortably across three areas.
- No shelter interaction creates pressure, decay, or obligation.

## Verification

```text
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:visual
npm run validate:full
```

Inspect 100% branch coverage for every migration and reward policy, corrupt/future-save preservation,
atomic repeated completion, interrupted writes, reload, reset, and empty/partial/full shelter evidence.

## Primary risks

- subtle lost-update bugs during rapid navigation;
- shelter art making hit areas overlap;
- interactions drifting into a maintenance simulator.
