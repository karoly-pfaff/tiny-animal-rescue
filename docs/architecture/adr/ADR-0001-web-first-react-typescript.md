# ADR-0001: Web-first React and TypeScript baseline

- Status: Accepted
- Date: 2026-09-20

## Context

The game must be easy to build incrementally with Codex, run on tablets and development desktops, support responsive UI and touch, and avoid a heavy game-engine workflow. Most screens are layered 2D scenes and ordinary UI. Only wipe and trace need pixel-oriented input.

## Decision

Use TypeScript, React, and Vite. Render application UI, map, shelter, and tap/drag/match missions with DOM/SVG. Use a narrowly scoped canvas surface for wipe and trace. Use Pointer Events as the input abstraction. Keep the static output compatible with a future Capacitor wrapper.

## Rationale

This stack matches the project's interaction complexity, makes state and content validation straightforward, supports fast browser tests, and minimizes special tooling. A hybrid rendering approach avoids forcing every UI element into canvas while preserving the two interactions that benefit from it.

## Consequences

- Layout and accessibility remain inspectable in the DOM.
- Asset and rendering performance need explicit measurement on target tablets.
- Canvas code requires separate visual/input tests.
- Native store packaging remains a separate delivery concern.

## Rejected alternatives

- **Phaser for the whole application:** adds a second UI paradigm and makes ordinary screens/localization harder without enough benefit.
- **Pure DOM including wipe:** per-pixel mask behavior becomes awkward and less performant.
- **Native-first framework:** increases setup and platform complexity before the game loop is proven.
