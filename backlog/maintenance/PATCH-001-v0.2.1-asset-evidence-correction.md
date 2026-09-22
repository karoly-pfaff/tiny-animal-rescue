# PATCH-001: Correct v0.2 asset and visual evidence

- Status: Planned
- Target version: `0.2.1`
- Branch: `fix/PATCH-001-v0.2.1-asset-evidence-correction`
- Commit type: `fix`
- Aggregate gate: `validate:full`
- Publishes release: `yes`
- Requires live inspection: `yes`
- Inspection journeys: `start,rescue,reload,replay,celebration,shelter`
- Type: Compatible post-release correction
- Dependencies: DOC-001
- ADRs: ADR-0011, ADR-0012

## Outcome

Replace the EPIC-001 visual fallbacks with the reviewed production Mimi experience, implement verified
R2-to-local asset materialization, and qualify the corrected vertical slice through a live browser
walkthrough without rewriting `v0.2.0`.

## Acceptance criteria

- [ ] The complete first-rescue visual asset matrix is declared, including Mimi's canonical resident,
      mission, celebration, and shelter states plus every required scene/prop/background owned by the
      patch.
- [ ] Approved prompt, provenance/license, dimensions, transparency, QA, immutable digest, and R2
      object-key metadata exist for every production asset.
- [ ] A repository-owned sync command downloads exact R2 objects into the ignored
      `content/base/assets/` tree, verifies them atomically, emits a secret-free local receipt, and
      fails on missing, stale, mismatched, unsafe, or unexpected objects.
- [ ] The production build packages and resolves only verified local assets and performs no direct R2
      fetch at player runtime.
- [ ] Asset validation fails when any required first-rescue media is absent, pending, unverified, or
      replaced by a code-native fallback.
- [ ] HU and EN rescue, reload, replay, celebration, and shelter flows pass automated tests with the
      corrected asset set.
- [ ] The exact candidate passes independent audit and affected aggregate gates, then the ADR-0012
      live locale/input/viewport walkthrough with provider-retained evidence.
- [ ] Merge and the immutable `v0.2.1` tag occur only after separate explicit user approval tied to
      the final PR head and evidence.

## Verification

```text
npm run validate:full
```

Also inspect the exact production preview under ADR-0012 and retain the verified asset receipt,
artifact digest, asset-inventory digest, and live walkthrough record.
