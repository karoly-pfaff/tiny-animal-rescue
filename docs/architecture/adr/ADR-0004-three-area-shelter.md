# ADR-0004: Three-area shelter with fixed base capacity

- Status: Accepted
- Date: 2026-09-20

## Context

A single shelter screen becomes crowded as residents are added. Unlimited scrolling weakens place identity and encourages uncontrolled content growth.

## Decision

The base shelter contains three named areas—Indoor Room, Garden, and Pondside—with a capacity of four residents each. Horizontal swipe and large arrow controls move between areas. Base v1 has exactly twelve residents. Future packs that add residents must add or explicitly extend suitable shelter capacity.

## Rationale

Three visually distinct rooms create a larger-feeling persistent space while keeping every resident readable and touchable. Capacity is a useful product constraint, not merely a layout limit.

## Consequences

- Resident content must declare exactly one shelter area.
- Capacity is validated at build time.
- World/Help missions are the preferred way to expand mission count without overcrowding.
- Future themed areas can provide a natural expansion boundary.

## Rejected alternatives

- **All residents on one screen:** poor readability and hit-target density.
- **Infinite paginated generic rooms:** scalable but visually repetitive and removes scope pressure.
- **Only one resident at a time:** loses the satisfying collection and living-shelter effect.

