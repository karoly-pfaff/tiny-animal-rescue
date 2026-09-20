# EPIC-005: Shelter and persistence

- Status: Planned
- Milestone: M5
- Target version: `0.6.0`
- Dependencies: EPIC-002, EPIC-004
- ADRs: ADR-0004, ADR-0006, ADR-0008

## Outcome

Create the persistent three-area shelter for twelve residents and harden versioned local progress, idempotent rewards, resume behavior, and reset flows.

## Stories

### E005-S01 — Final save repository and schema

- [ ] IndexedDB repository implements typed load, transaction, replace, and reset operations.
- [ ] In-memory repository supports deterministic tests.
- [ ] Save timestamps, schema version, settings, completed missions, residents, flags, and resumable mission state are represented.
- [ ] Writes are serialized to avoid stale overwrites.

### E005-S02 — Migration and recovery framework

- [ ] Pure sequential migration functions exist with fixtures.
- [ ] Unknown future versions are preserved and not overwritten.
- [ ] Corrupt current data produces a parent-facing recovery choice.
- [ ] Recovery never fabricates completed missions or residents.

### E005-S03 — Atomic completion and resume

- [ ] Step completion persists according to the documented policy.
- [ ] Mission completion, resident unlock, world flags, and current-mission cleanup commit atomically.
- [ ] Repeated completion events are idempotent.
- [ ] Background/foreground and browser refresh cases are integration-tested.

### E005-S04 — Three shelter areas

- [ ] Indoor Room, Garden, and Pondside load from content.
- [ ] Swipe and large arrows navigate areas.
- [ ] The current area is announced visually and, when requested, audibly.
- [ ] Each area renders at most four residents with non-overlapping hit regions.
- [ ] Empty slots are visually natural, not shown as locked silhouettes.

### E005-S05 — Resident presentation and reactions

- [ ] Unlocked residents appear in deterministic content-defined positions.
- [ ] A tap speaks the name and triggers a short allowed reaction.
- [ ] Pet/feed/play moments end cleanly and create no persistent need state.
- [ ] Locked residents do not leak through asset preloading or focus order.

### E005-S06 — Reset progress

- [ ] Reset sits behind the parent gate with second confirmation.
- [ ] Progress-only reset preserves locale/audio settings.
- [ ] Full reset is explicit and returns to first run.
- [ ] Reset operations are tested under interrupted/failed storage conditions.

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
