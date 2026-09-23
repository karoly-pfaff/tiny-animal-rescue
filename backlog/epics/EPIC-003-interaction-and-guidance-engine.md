# EPIC-003: Interaction and guidance engine

- Status: Planned
- Milestone: M3
- Target version: `0.4.0`
- Inspection journeys: `interaction-primitives,guidance`
- Dependencies: EPIC-001, EPIC-002
- ADRs: ADR-0001, ADR-0003, ADR-0007

## Outcome

Implement all five production-grade, reusable interaction primitives behind one mission-step lifecycle with consistent guidance, input cancellation, responsive geometry, and deterministic tests.

## Stories

### E003-S01 — Mission step orchestrator

- [ ] Runtime loads normalized steps and mounts exactly one active interaction.
- [ ] Completion is idempotent and advances once.
- [ ] pause, resume, reset, and dispose lifecycles are explicit.
- [ ] Exhaustive TypeScript switches fail compilation for unhandled step types.
- [ ] Components emit events; they do not write global progress directly.

### E003-S02 — Production tap/remove

- [ ] Single and ordered multi-target removal are supported.
- [ ] Invisible hit areas may exceed visual bounds and remain testable.
- [ ] Completed targets cannot trigger duplicate completion.
- [ ] Tap feedback, target pulse, and reduced-motion alternatives work.

### E003-S03 — Production drag-to-target

- [ ] Pointer capture, offset, cancellation, snap tolerance, return animation, and responsive scaling work.
- [ ] The source remains visible under a finger.
- [ ] Incorrect targets do not produce harsh feedback.
- [ ] Touch and mouse test matrices pass.

### E003-S04 — Production wipe/clean

- [ ] Canvas mask supports broad strokes and configurable completion threshold.
- [ ] Progress calculation is performant and deterministic.
- [ ] Partial progress survives pause and does not reset on pointer leave.
- [ ] A non-precision completion path is verified at supported viewports.

### E003-S05 — Production match

- [ ] Up to three source-target pairs are supported.
- [ ] Correctness never depends only on color.
- [ ] Each completed pair locks and contributes once.
- [ ] Input order may vary without breaking mission state.

### E003-S06 — Production trace

- [ ] A broad corridor maps correctly to scaled coordinates.
- [ ] Small deviations preserve progress; there is no full punitive reset.
- [ ] Start/end affordances and animated hint path are visible.
- [ ] Performance remains smooth on the target class of tablet.

### E003-S07 — Shared guidance ladder

- [ ] Narration, idle pulse, ghost hand, and tolerance escalation are centrally coordinated.
- [ ] Timing is configurable and fake-clock tested.
- [ ] Replay stops/replaces prior prompt without overlap.
- [ ] Guidance state pauses when the app backgrounds.
- [ ] Reduced-motion mode substitutes low-motion highlighting.

### E003-S08 — Primitive demonstration suite

- [ ] One contract-only fixture scene demonstrates each primitive.
- [ ] Visual and E2E tests cover success, wrong action, cancellation, pause, and replay.
- [ ] No fixture becomes a hidden v1 mission.

## Exit criteria

- Five primitives pass their unit, integration, touch, and visual gates.
- A content-only fixture can compose them without engine changes.
- Unknown interaction types fail validation and compile-time handling.

## Verification

```text
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:visual
npm run validate:full
```

Inspect success, wrong action, cancellation, second pointer, pause/resume, fake-clock guidance,
reduced-motion, touch/mouse, and supported-viewport evidence for every primitive.

## Primary risks

- coordinate-space bugs across DOM/canvas/responsive scaling;
- hint logic duplicated inside primitives;
- visually impressive but motor-demanding interactions.
