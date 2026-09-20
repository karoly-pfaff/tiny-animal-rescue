# EPIC-009: Release readiness

- Status: Planned
- Milestone: M9
- Target version: `0.10.0`
- Dependencies: EPIC-000 through EPIC-008
- ADRs: all accepted ADRs

## Outcome

Produce a reproducible, auditable `0.10.0` v1 release candidate with complete documentation,
licenses, release checks, and no unresolved blocker. Promotion of that qualified artifact to `1.0.0`
is a separate post-M9 procedure.

## Stories

### E009-S01 — Production build hardening

- [ ] Clean install and production build are reproducible.
- [ ] Relative asset paths and static preview work offline after initial load where configured.
- [ ] The public bundle contains no source maps, embedded source/debug metadata, development-only
      routes, endpoints, overlays, or test assets; `test:artifact` enforces the
      [artifact policy](../../docs/delivery/quality-gates.md#dependency-and-artifact-gates).
- [ ] Bundle and asset size reports are captured and unexpected regressions resolved.

### E009-S02 — Full validation pipeline

- [ ] `validate:release` composes `validate:full` with release-content, asset/provenance, license,
      static-security, artifact, full-viewport E2E, and visual gates in the stable order defined by the
      [quality-gate contract](../../docs/delivery/quality-gates.md#required-commands).
- [ ] Failures retain useful reports/screenshots.
- [ ] Release validation forbids placeholders and requires the exact catalog.
- [ ] CI and local commands use the same underlying scripts.
- [ ] No required lane is skipped, retried into green, empty, or protected by an unapproved waiver.

### E009-S03 — Privacy, safety, and legal inventory

- [ ] No analytics, account, advertising, camera, microphone, location, or personal-data path is present.
- [ ] Parent gate and external-link boundaries are verified.
- [ ] Font, music, effect, voice, and art licenses/provenance are complete.
- [ ] Credits and parent-facing privacy summary are included.

### E009-S04 — Release documentation

- [ ] README describes build, test, preview, content validation, and known limits accurately.
- [ ] Architecture and ADRs match implementation.
- [ ] Content author guide can add a conforming sample mission without engine edits.
- [ ] Save compatibility and reset behavior are documented for maintainers.
- [ ] Product, base-pack, content-contract, save-schema, and specification versions are distinguished
      and release/tag mechanics match `docs/delivery/versioning.md`.

### E009-S05 — Final playthrough and sign-off

- [ ] Clean-save HU playthrough completes all progression.
- [ ] Clean-save EN playthrough completes all progression.
- [ ] Seeded all-complete shelter and replay flow pass.
- [ ] Every non-waivable release-checklist item passes; an eligible mechanical finding may be
      filtered only by an active exact entry in `quality-waivers.json` that passes `validate:waivers`.
- [ ] EPIC-009 records product/base-pack `0.10.0`, immutable `v0.10.0` release evidence, and release
      notes summarizing player-visible content and known limitations.

### E009-S06 — Package expansion seam evidence

- [ ] A non-shipping sample/test pack still validates without engine edits.
- [ ] Removing it leaves no runtime or build dependency.
- [ ] No remote delivery, pack browser, editor, or marketplace leaked into v1.

## Exit criteria

- Production artifact is reproducible and passes `validate:release`.
- Every non-waivable release-checklist item passes, and any eligible mechanical exception is active,
  exact, machine-validated, and explicitly recorded.
- Product is complete at the declared v1 scope.

## Verification

```text
npm ci
npm run validate:release
```

Inspect all retained quality, coverage, content, dependency/license, browser, visual, bundle, and
artifact reports; the clean HU and EN playthrough records; final visual/prompt provenance inventory;
the independent audit; and the `0.10.0` manifest, base-pack, release-note, build-metadata, artifact-
digest, and tag consistency. The later `1.0.0` promotion is verified under the
[GA promotion procedure](../../docs/delivery/ga-promotion.md), not this epic.

## Primary risks

- documentation and implementation drift;
- license/provenance gaps discovered too late;
- last-minute features bypassing scope and validation.
