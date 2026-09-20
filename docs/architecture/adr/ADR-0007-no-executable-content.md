# ADR-0007: No executable content code

- Status: Accepted
- Date: 2026-09-20

## Context

Pack-specific scripts appear flexible but bypass type safety, validation, child-safety guarantees, and predictable testing. They also make “add content without changing the engine” misleading because content becomes hidden engine code.

## Decision

Content packs contain only declarative data and assets. They may select from registered interaction, reward, animation, audio, and shelter-reaction enums. They may not ship JavaScript, expressions, dynamic imports, or arbitrary callbacks.

## Rationale

A finite behavior vocabulary is auditable, deterministic, secure, and easy for Codex to extend reliably.

## Consequences

- Truly new behavior requires an engine change, tests, and usually an ADR.
- Content validation rejects unknown behavior names.
- Remote third-party mod support is not possible under the v1 contract.

## Rejected alternatives

- **Sandboxed scripts:** still adds security and debugging complexity with no v1 need.
- **JSON expressions:** creates a programming language without admitting it.
- **Per-pack React components:** destroys engine/content separation.

