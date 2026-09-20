# ADR-0006: Versioned local persistence

- Status: Accepted
- Date: 2026-09-20

## Context

Rescued residents must persist across sessions, but v1 does not need accounts or cloud infrastructure. Content and save formats may evolve after release.

## Decision

Store authoritative progress locally through a repository interface backed by IndexedDB. Persist a schema version and migrate forward through pure, tested functions. Commit mission completion and rewards atomically and idempotently before celebration.

## Rationale

Local persistence satisfies the experience without collecting personal data or requiring connectivity. A repository boundary enables tests and future platform adapters.

## Consequences

- Uninstalling or clearing site data can remove progress; communicate this in parent-facing help.
- Save migrations are release-critical code.
- Unknown future schema versions must not be overwritten.
- Cloud sync is a separate future architecture decision.

## Rejected alternatives

- **Cloud account:** unnecessary privacy, operational, and compliance burden.
- **LocalStorage only:** weaker transactional and structured-data behavior.
- **No migration policy until needed:** risks losing the child's persistent shelter later.

