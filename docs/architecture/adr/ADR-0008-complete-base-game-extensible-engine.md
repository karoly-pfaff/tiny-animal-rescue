# ADR-0008: Complete base game with an optional expansion seam

- Status: Accepted
- Date: 2026-09-20

## Context

The product should not become a perpetual platform project, but the architecture should not block inexpensive new missions if the child enjoys the game. “Expandable” can otherwise become an excuse to defer content or overbuild infrastructure.

## Decision

Treat v1.0 as complete at 4 locations, 12 residents, 16 missions, and 3 shelter areas. Implement only the pack seams required to keep engine and base content separated. Do not build remote delivery, marketplaces, pack management UI, or a content editor. A future pack is bundled at build time and must pass the same validation as base content.

## Rationale

This preserves a firm finish line while allowing later `winter-rescue`-style packs through data and assets rather than engine forks.

## Consequences

- Expansion examples may verify the seam but are not release content.
- Backlog items cannot add speculative platform features under the label of extensibility.
- Packs that add residents must declare adequate shelter capacity.
- The gameplay vocabulary remains fixed unless deliberately revised.

## Rejected alternatives

- **Hard-code the base game and stop:** fastest now, expensive to revisit and encourages duplicated mission components.
- **Build a full mod platform first:** delays the child-visible product and greatly expands scope.
- **Promise an ongoing content service:** creates an obligation the project does not need.
