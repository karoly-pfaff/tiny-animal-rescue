# PATCH-001: Correct v0.2 asset delivery and visual evidence

- Status: In progress
- Target version: `0.2.1`
- Branch: `fix/PATCH-001-v0.2.1-asset-evidence-correction`
- Commit type: `fix`
- Aggregate gate: `validate:full`
- Publishes release: `yes`
- Requires live inspection: `yes`
- Inspection journeys: `start,rescue,reload,replay,celebration,shelter`
- Type: Compatible post-release correction
- ADRs: ADR-0011, ADR-0012

## Outcome

Correct the asset and release-evidence defect discovered after EPIC-001 without rewriting `v0.2.0`.
The patch establishes verified R2-to-local materialization and live-inspection enforcement, then
replaces the visual fallbacks with the reviewed production Mimi experience before publishing the
immutable `v0.2.1` release.

## Acceptance criteria

- [x] ADR-0011 defines R2 as the external download origin and the ignored local pack asset tree as
      the verified build input; production runtime media has no direct R2/network dependency.
- [x] ADR-0012 requires live production-preview inspection on the exact release candidate.
- [x] Merge and tag automation bind immutable, distinct owner approvals, trusted quality checks,
      inspected-head evidence, artifact digests, and asset-inventory digests.
- [x] Materialization, artifact traversal, workflow fingerprints, secret isolation, watermark
      rejection, and release-history enforcement have adversarial regression coverage.
- [x] A final fresh-context audit found no unresolved High or Medium issue in the enforcement layer.
- [x] The complete first-rescue visual asset matrix is declared, including Mimi's canonical resident,
      mission, celebration, and shelter states plus every required scene/prop/background owned by the
      patch.
- [x] Approved prompt, provenance/license, dimensions, transparency, QA, immutable digest, and R2
      object-key metadata exist for every production asset.
- [x] A repository-owned sync command downloads exact R2 objects into the ignored
      `content/base/assets/` tree, verifies them atomically, emits a secret-free local receipt, and
      fails on missing, stale, mismatched, unsafe, or unexpected objects.
- [x] The production build packages and resolves only verified local assets and performs no direct R2
      fetch at player runtime.
- [x] Asset validation fails when any required first-rescue media is absent, pending, unverified, or
      replaced by a code-native fallback.
- [x] HU and EN rescue, reload, replay, celebration, and shelter flows pass automated tests with the
      corrected asset set.
- [ ] The exact candidate passes independent audit and affected aggregate gates, then the ADR-0012
      live locale/input/viewport walkthrough with provider-retained evidence.
- [ ] Merge and the immutable `v0.2.1` tag occur only after separate explicit user approval tied to
      the final PR head and evidence.

## Verification

```text
npm run validate:full
```

The enforcement layer passed `validate:full`, including 100 unit and integration tests, 40/40 E2E,
40/40 visual cases, 128 governance fixtures, artifact verification, dependency/license/static
security checks, and zero duplicate clones. The materialized first-rescue candidate also passed exact
validation of 9 production images, 40/40 E2E, 40/40 visual cases, and 21-file artifact verification
with artifact SHA-256 `312358ad481b22da290683e467a6c5a400825c2a8dfc3808c04d402390ec563f`.
The final fresh-context visual and tooling audit verification passed with no unresolved High or
Medium finding. Release qualification remains open until trusted R2 qualification and ADR-0012
provider-retained live inspection complete on the exact candidate SHA.

Also inspect the exact production preview under ADR-0012 and retain the verified asset receipt,
artifact digest, asset-inventory digest, and live walkthrough record.
