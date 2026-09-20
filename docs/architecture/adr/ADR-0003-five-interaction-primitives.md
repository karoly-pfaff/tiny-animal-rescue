# ADR-0003: Freeze v1 to five interaction primitives

- Status: Accepted
- Date: 2026-09-20

## Context

Mission variety can easily create one-off mechanics, making the game expensive to implement and inconsistent for preschool players. The design already covers the intended stories with a small reusable vocabulary.

## Decision

v1 supports exactly five required interaction types: tap/remove, drag-to-target, wipe/clean, match, and trace. Missions compose 2–4 steps from this set, with an approved exception for one continuous trace-only step. A sixth type requires explicit scope approval and a superseding or amending ADR.

## Rationale

Repeated mechanics reduce learning load, enable stronger accessibility tuning, and concentrate test effort. Visual narrative and step composition provide variety without multiplying systems.

## Consequences

- Content ideas must be adapted to the existing vocabulary or deferred.
- Each primitive needs production-grade hinting, input cancellation, responsive geometry, and tests.
- Content validation rejects unknown step types.

## Rejected alternatives

- **Unique mechanic per rescue:** creates a minigame collection in disguise and undermines predictability.
- **Only tap and drag:** simpler, but insufficient visual/tactile variety for sixteen missions.
- **Generic scripting language:** moves complexity into content and conflicts with safe declarative packs.

