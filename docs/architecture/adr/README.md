# Architecture decision records

ADRs are binding unless superseded. Implementation tasks must cite relevant ADRs when they touch a recorded decision.

| ADR                                                          | Decision                                                 | Status     |
| ------------------------------------------------------------ | -------------------------------------------------------- | ---------- |
| [ADR-0001](ADR-0001-web-first-react-typescript.md)           | Web-first React + TypeScript baseline                    | Accepted   |
| [ADR-0002](ADR-0002-declarative-content-packs.md)            | Declarative, validated content packs                     | Accepted   |
| [ADR-0003](ADR-0003-five-interaction-primitives.md)          | Freeze v1 to five interaction primitives                 | Accepted   |
| [ADR-0004](ADR-0004-three-area-shelter.md)                   | Three-area shelter with fixed base capacity              | Accepted   |
| [ADR-0005](ADR-0005-runtime-localization.md)                 | Runtime text/audio localization and text-free art        | Accepted   |
| [ADR-0006](ADR-0006-versioned-local-persistence.md)          | Versioned local persistence                              | Accepted   |
| [ADR-0007](ADR-0007-no-executable-content.md)                | No executable pack code                                  | Accepted   |
| [ADR-0008](ADR-0008-complete-base-game-extensible-engine.md) | Complete v1 with optional expansion seam                 | Accepted   |
| [ADR-0009](ADR-0009-enforced-quality-and-versioned-epics.md) | Enforced quality gates and one-version-per-epic delivery | Accepted   |
| [ADR-0010](ADR-0010-external-production-media.md)            | External R2 delivery for production media                | Superseded |
| [ADR-0011](ADR-0011-local-content-asset-materialization.md)  | Materialize R2 media into ignored local content assets   | Accepted   |
| [ADR-0012](ADR-0012-live-epic-product-inspection.md)         | Live product inspection before epic closure              | Accepted   |

## ADR format

New ADRs include context, decision, rationale, consequences, rejected alternatives, and status. Use the next sequential number. A change to an accepted decision creates a superseding ADR instead of rewriting history; editorial clarifications may amend an existing ADR with a dated note.
