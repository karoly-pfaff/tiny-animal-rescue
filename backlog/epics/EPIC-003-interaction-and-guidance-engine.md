# EPIC-003: Interaction and guidance engine

- Status: In progress
- Milestone: M3
- Target version: `0.4.0`
- Inspection journeys: `first-rescue,guidance`
- Dependencies: EPIC-001, EPIC-002
- ADRs: ADR-0001, ADR-0003, ADR-0007, ADR-0012, ADR-0015

## Outcome

Implement all five production-grade, reusable interaction primitives behind one mission-step lifecycle with consistent guidance, input cancellation, responsive geometry, and deterministic tests.

## Stories

### E003-S01 — Mission step orchestrator

- [x] Runtime loads normalized steps and mounts exactly one active interaction.
- [x] Completion is idempotent and advances once.
- [x] pause, resume, reset, and dispose lifecycles are explicit.
- [x] Exhaustive TypeScript switches fail compilation for unhandled step types.
- [x] Components emit events; they do not write global progress directly.

### E003-S02 — Production tap/remove

- [x] Single and ordered multi-target removal are supported.
- [x] Invisible hit areas may exceed visual bounds and remain testable.
- [x] Completed targets cannot trigger duplicate completion.
- [x] Tap feedback, target pulse, and reduced-motion alternatives work.

### E003-S03 — Production drag-to-target

- [x] Pointer capture, offset, cancellation, snap tolerance, return animation, and responsive scaling work.
- [x] The source remains visible under a finger.
- [x] Incorrect targets do not produce harsh feedback.
- [x] Touch and mouse test matrices pass.

### E003-S04 — Production wipe/clean

- [x] Canvas mask supports broad strokes and configurable completion threshold.
- [x] Progress calculation is performant and deterministic.
- [x] Partial progress survives pause and does not reset on pointer leave.
- [x] A non-precision completion path is verified at supported viewports.

### E003-S05 — Production match

- [x] Up to three source-target pairs are supported.
- [x] Correctness never depends only on color.
- [x] Each completed pair locks and contributes once.
- [x] Input order may vary without breaking mission state.

### E003-S06 — Production trace

- [x] A broad corridor maps correctly to scaled coordinates.
- [x] Small deviations preserve progress; there is no full punitive reset.
- [x] Start/end affordances and animated hint path are visible.
- [x] Performance remains smooth on the target class of tablet.

### E003-S07 — Shared guidance ladder

- [x] Narration, idle pulse, ghost hand, and tolerance escalation are centrally coordinated.
- [x] Timing is configurable and fake-clock tested.
- [x] Replay stops/replaces prior prompt without overlap.
- [x] Guidance state pauses when the app backgrounds.
- [x] Reduced-motion mode substitutes low-motion highlighting.

### E003-S08 — Primitive demonstration suite

- [x] One contract-only fixture scene demonstrates each primitive.
- [x] Visual and E2E tests cover success, wrong action, cancellation, pause, and replay.
- [x] No fixture becomes a hidden v1 mission.

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

## Bounded media deferral

- EPIC-003 owns no new production media and does not claim the first-rescue audio set complete.
- The nine previously qualified base-pack image assets must be locally materialized for the M3 live
  product inspection; their locked digests remain unchanged in this milestone.
- The inherited first-rescue narration continues to use its localized browser-voice development
  fallback. Production music, effects, and HU/EN voice files are owned by E006-S07, remain outside
  Git, and must be materialized from R2 and inspected across the inherited first-rescue journeys
  before EPIC-006 can close.

## Bounded assembled-product inspection deferral

- The production first Rescue exercises drag-to-target and tap/remove through the shared mission-step
  lifecycle; its HU/EN guidance journeys remain part of the exact-candidate live inspection.
- Wipe/clean, match, and trace have no authored player mission in this milestone. Their contract-only
  fixture proves production lifecycle, primitive, input, pause, guidance, and viewport behavior but
  is not claimed as an assembled-product walkthrough.
- Under ADR-0015, E007-S08 owns the carried live inspection for all five primitives through real HU/EN
  missions, with mouse, touch, reduced-motion, and the complete supported viewport matrix. EPIC-007
  cannot close if any carried primitive journey is absent or uses a mission-ID engine branch.

## Primary risks

- coordinate-space bugs across DOM/canvas/responsive scaling;
- hint logic duplicated inside primitives;
- visually impressive but motor-demanding interactions.
