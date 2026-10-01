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

- [ ] A seeded save renders all twelve residents in their catalog areas.
- [ ] Capacity validator rejects a fifth base resident in any area.
- [ ] Screenshots cover empty, partially filled, and complete shelter states.

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
