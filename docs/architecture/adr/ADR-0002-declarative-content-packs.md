# ADR-0002: Declarative, validated content packs

- Status: Accepted
- Date: 2026-09-20

## Context

The base game must be complete, yet new missions, animals, locations, or themed packs should be addable without editing engine logic. Unstructured configuration would make failures appear only at runtime and encourage pack-specific branching.

## Decision

Represent content as versioned JSON records and owned assets grouped in packs. Validate records structurally and semantically during development and CI. Assemble an immutable runtime registry from validated packs. All cross-record behavior uses typed IDs and finite unions.

## Rationale

Codex can reliably create new records against explicit contracts. Build-time validation catches missing references, capacity errors, localization gaps, and asset leakage before a child reaches the scene.

## Consequences

- Schema and TypeScript models must evolve together.
- Some authored concepts may require engine changes instead of ad hoc scripting.
- Pack dependencies and ID stability become part of compatibility policy.
- Adding ordinary conforming content does not require an ADR.

## Rejected alternatives

- **Hard-coded mission components:** initially fast, but every content addition changes engine code and duplicates behavior.
- **Database/CMS in v1:** unnecessary infrastructure and network/privacy surface.
- **Loose JSON with runtime defaults only:** errors become late, ambiguous, and difficult to test.

