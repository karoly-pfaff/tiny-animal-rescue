# EPIC-002: Declarative content platform

- Status: Planned
- Milestone: M2
- Target version: `0.3.0`
- Inspection journeys: `start,map,content-loading`
- Dependencies: EPIC-001
- ADRs: ADR-0002, ADR-0007, ADR-0008

## Outcome

Replace vertical-slice-specific declarations with a versioned, validated content registry capable of loading the base pack and future build-time packs without executing content code.

## Stories

### E002-S01 — Define runtime types and JSON Schemas

- [ ] Pack, animal, mission, location, shelter-area, localization, and asset metadata types exist.
- [ ] JSON Schemas reject unknown properties and invalid enum values.
- [ ] Schema examples compile into the runtime types through tested normalization.
- [ ] Contract versioning behavior is documented and tested.

### E002-S02 — Discover and assemble packs

- [ ] Build tooling discovers declared pack manifests deterministically.
- [ ] Content-directory declarations reject empty, absolute POSIX/Windows, URL, traversal, dot-segment,
      backslash, and malformed paths before filesystem discovery.
- [ ] Dependency order is resolved and cycles fail clearly.
- [ ] Duplicate global IDs fail validation.
- [ ] Base pack cannot depend on an expansion pack.
- [ ] Runtime consumes an immutable normalized registry.

### E002-S03 — Add semantic validation

- [ ] All cross-record references resolve.
- [ ] mission/reward/category rules are enforced.
- [ ] shelter capacity and resident uniqueness are enforced.
- [ ] prerequisites are acyclic and Help resident dependencies are correct.
- [ ] exact v1 catalog validation can be enabled for release mode.

### E002-S04 — Add asset ownership and metadata validation

- [ ] Pack-relative paths reject traversal and absolute URLs.
- [ ] Required files, media types, transparency/dimension metadata, and locale ownership are checked.
- [ ] Cross-pack references require declared dependencies.
- [ ] Missing required and placeholder assets fail release validation.

### E002-S05 — Migrate first rescue to content

- [ ] Mimi, Garden, Indoor Room, and kitten mission load from the base pack.
- [ ] No engine file branches on `garden-kitten-tree` or `mimi-kitten`.
- [ ] Existing vertical-slice E2E tests still pass.
- [ ] Invalid content fixtures prove each important validator.

### E002-S06 — Prove the expansion seam

- [ ] A test-only sample pack adds one non-release mission or record without engine edits.
- [ ] Removing the test pack restores the exact base registry.
- [ ] No pack manager UI, remote loading, or arbitrary script support is introduced.

## Exit criteria

- Content validation is part of `validate:quick`.
- The first rescue is entirely declared by content plus reusable engine behavior.
- A test pack proves extension without becoming shipped scope.

## Verification

```text
npm run test:unit
npm run test:integration
npm run test:content
npm run validate:full
```

Inspect invalid fixtures for every validator class, the immutable assembled registry, the absence of
base-content/engine ID branches, and proof that removing the test pack restores the exact base registry.

## Primary risks

- schema/runtime drift;
- turning normalization into a hidden scripting system;
- overbuilding remote/plugin infrastructure prohibited by ADR-0008.
