# EPIC-002: Declarative content platform

- Status: In progress
- Milestone: M2
- Target version: `0.3.0`
- Inspection journeys: `start,map,content-loading`
- Dependencies: EPIC-001
- ADRs: ADR-0002, ADR-0005, ADR-0007, ADR-0008, ADR-0011, ADR-0012

## Outcome

Replace vertical-slice-specific declarations with a versioned, validated content registry capable of loading the base pack and future build-time packs without executing content code.
Finish the bounded production audio set that the M2 journeys actually exercise; full-game audio and
parent audio settings remain owned by EPIC-006.

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

### E002-S07 — Produce and integrate the epic audio set

- [ ] A generated inventory lists every music, effect, and HU/EN voice runtime ID exercised by the
      EPIC-002 product journeys, with no unrelated full-game audio scope.
- [ ] The owner produces, edits, and approves every inventoried file using the repository prompt pack;
      production exports contain no audible watermark, branding, signature, or authorship credit.
- [ ] Every asset has approved prompt, provenance/license, mastering, duration/format, channel, and
      repeated/overlapping playback QA evidence plus an exact R2 object key and digest lock.
- [ ] Verified R2 media materializes only into the ignored `content/base/assets/audio/` tree and the
      packaged product resolves local pack paths without a browser-time R2 request.
- [ ] Music, effects, and voice use separate channels; narration replaces the current line and ducks
      music without depending on wall-clock audio duration for mission progression.
- [ ] HU and EN voice coverage is equivalent, code-native speech is absent from the media-complete
      candidate, and mute/replay/background-resume behavior passes integration and browser checks.
- [ ] The exact candidate passes asset/audio gates, the complete supported viewport/input journey
      matrix, listening QA, and ADR-0012 live production-preview inspection.

## Exit criteria

- Content validation is part of `validate:quick`.
- The first rescue is entirely declared by content plus reusable engine behavior.
- A test pack proves extension without becoming shipped scope.
- Every sound exercised by the M2 inspection journeys is production media with complete evidence.

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
