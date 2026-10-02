# ADR-0015: Carry reusable mechanics into assembled content inspection

- Status: Accepted
- Date: 2026-09-28
- Amends: ADR-0012

## Context

The delivery sequence implements the five frozen interaction primitives in EPIC-003, before the
complete base-game mission catalog is authored in EPIC-007. The initial Rescue mission can exercise
drag-to-target and tap/remove through the production player runtime, but no player-owned wipe, match,
or trace mission exists yet. Adding hidden missions or a test route to the shipped application would
expand product scope and would make an artificial demo look like assembled-product evidence.

ADR-0012 correctly rejects isolated component screenshots as a substitute for a live production
walkthrough. Without a bounded sequencing rule, however, it also creates a dependency cycle: the
engine milestone cannot close until later content exists, while that content epic depends on the
engine milestone.

## Decision

A reusable-mechanic epic may defer the assembled-product portion of a live inspection only when no
declared player journey using that mechanic exists yet. The deferral is valid only if all of the
following are true:

1. the production player runtime contains the shared lifecycle and renderer seam that mounts the
   mechanic without mission-ID branching;
2. every already-authored player journey affected by the change is walked through in the exact
   production preview under ADR-0012;
3. a separately built, contract-only fixture exercises every deferred mechanic with the production
   lifecycle and production primitive implementation across the supported input and viewport matrix;
4. that fixture remains test evidence, is absent from the shipped application, and is never described
   as the live assembled-product inspection;
5. the current epic inventories each deferred mechanic and names one exact later story that must
   exercise it through real localized player content; and
6. the owning later story and epic cannot close until the carried journeys pass the full ADR-0012
   HU/EN, mouse/touch, supported-viewport live inspection.

EPIC-003 uses this rule for wipe/clean, match, and trace. E007-S08 owns their carried assembled-product
inspection, alongside tap/remove and drag-to-target, through the complete v1 playthrough. EPIC-003
still inspects the actual first Rescue and guidance journeys in the production preview; its primitive
fixture is supporting automation and visual evidence only.

This rule does not apply when a production mission already exists, does not defer behavior defects,
and does not relax media ownership or materialization requirements.

## Rationale

The engine can be reviewed at the point where its contract is introduced without fabricating
player-visible content. Binding the later inspection to an exact story preserves the assembled-product
quality gate and makes the temporary evidence boundary explicit.

## Consequences

- Engine epics may close before every reusable mechanic has a real content journey, but only with the
  bounded inventory above.
- Contract fixtures prove mechanics, lifecycle behavior, input handling, and responsive presentation;
  they never prove localized narrative composition or final production-media quality.
- E007-S08 must demonstrate all five primitives through real missions and inherits every deferred
  EPIC-003 inspection obligation.
- A missing, renamed, or incomplete carry-forward story blocks the later epic and release.

## Rejected alternatives

- **Ship a hidden mechanic workshop:** expands the player artifact with test-only behavior and still
  does not prove real mission composition.
- **Wait for all v1 content before closing the engine epic:** creates a dependency cycle and removes
  the value of milestone ordering.
- **Treat fixture screenshots as the final live inspection:** contradicts ADR-0012 and cannot prove
  localization, production media, or assembled flow.
- **Leave the obligation implicit:** makes it easy for later content work to omit one primitive or one
  input/locale/viewport combination.
