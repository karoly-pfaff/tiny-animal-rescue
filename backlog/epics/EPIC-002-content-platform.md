# EPIC-002: Declarative content platform

- Status: In progress
- Milestone: M2
- Target version: `0.3.0`
- Inspection journeys: `start,map,content-loading`
- Dependencies: EPIC-001
- ADRs: ADR-0002, ADR-0005, ADR-0007, ADR-0008, ADR-0011, ADR-0012

## Outcome

Replace vertical-slice-specific declarations with a versioned, validated content registry capable of loading the base pack and future build-time packs without executing content code.

## Stories

### E002-S01 — Define runtime types and JSON Schemas

- [x] Pack, animal, mission, location, shelter-area, localization, and asset metadata types exist.
- [x] JSON Schemas reject unknown properties and invalid enum values.
- [x] Schema examples compile into the runtime types through tested normalization.
- [x] Contract versioning behavior is documented and tested.

### E002-S02 — Discover and assemble packs

- [x] Build tooling discovers declared pack manifests deterministically.
- [x] Content-directory declarations reject empty, absolute POSIX/Windows, URL, traversal, dot-segment,
      backslash, and malformed paths before filesystem discovery.
- [x] Dependency order is resolved and cycles fail clearly.
- [x] Duplicate global IDs fail validation.
- [x] Base pack cannot depend on an expansion pack.
- [x] Runtime consumes an immutable normalized registry.

### E002-S03 — Add semantic validation

- [x] All cross-record references resolve.
- [x] mission/reward/category rules are enforced.
- [x] shelter capacity and resident uniqueness are enforced.
- [x] prerequisites are acyclic and Help resident dependencies are correct.
- [x] exact v1 catalog validation can be enabled for release mode.

### E002-S04 — Add asset ownership and metadata validation

- [x] Pack-relative paths reject traversal and absolute URLs.
- [x] Required files, media types, transparency/dimension metadata, and locale ownership are checked.
- [x] Cross-pack references require declared dependencies.
- [x] Missing required and placeholder assets fail release validation.

### E002-S05 — Migrate first rescue to content

- [x] Mimi, Garden, Indoor Room, and kitten mission load from the base pack.
- [x] No engine file branches on `garden-kitten-tree` or `mimi-kitten`.
- [x] Existing vertical-slice E2E tests still pass.
- [x] Invalid content fixtures prove each important validator.

### E002-S06 — Prove the expansion seam

- [x] A test-only sample pack adds one non-release mission or record without engine edits.
- [x] Removing the test pack restores the exact base registry.
- [x] No pack manager UI, remote loading, or arbitrary script support is introduced.

### E002-S07 — Defer production audio to M6

- [x] The bounded first-rescue production-audio scope moves intact to E006-S07.
- [x] No audio acceptance criterion is dropped or weakened by the move.
- [x] M2 claims only the declarative content platform and does not claim production-audio completion.
- [x] ADR-0012 records the bounded deferral, and E006-S07 inherits the exercised journey set.
- [x] No audio binary, delivery rule, runtime behavior, or milestone/version sequence changes here.

## Exit criteria

- Content validation is part of `validate:quick`.
- The first rescue is entirely declared by content plus reusable engine behavior.
- A test pack proves extension without becoming shipped scope.

## Verification

```text
npm run test:unit
npm run test:integration
npm run test:content
npm run test:assets:materialized
npm run validate:full
```

Inspect invalid fixtures for every validator class, the immutable assembled registry, the absence of
base-content/engine ID branches, and proof that removing the test pack restores the exact base registry.

## Primary risks

- schema/runtime drift;
- turning normalization into a hidden scripting system;
- overbuilding remote/plugin infrastructure prohibited by ADR-0008.
