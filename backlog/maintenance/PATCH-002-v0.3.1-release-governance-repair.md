# PATCH-002: Repair release qualification governance

- Status: In progress
- Target version: `0.3.1`
- Branch: `fix/PATCH-002-v0.3.1-release-governance-repair`
- Commit type: `fix`
- Aggregate gate: `validate:full`
- Publishes release: `yes`
- Requires live inspection: `no`
- Type: Compatible post-release governance correction
- ADRs: ADR-0013, ADR-0014

## Outcome

Correct the release-policy defects exposed while closing EPIC-002 without changing player behavior,
content, or production media. The patch makes visual evidence semantic, artifact ownership explicit,
candidate closure bounded, and future policy repairs possible through the governed workflow.

## Acceptance criteria

- [ ] Media-complete visual tests compare every declared state through one reviewed decoded-pixel
      signature while retaining full screenshots outside Git; no OS-specific byte-hash allowlist,
      multiple accepted digest, or non-empty-only state remains.
- [ ] Trusted artifact closure accepts an exactly referenced application-owned favicon/font while
      still rejecting unreferenced application media, unlocked pack media, missing objects, remote
      production-media URLs, substitutions, and watermark markers.
- [ ] `npm run validate:media` reproduces the media-complete build, visual, artifact, packaged-object,
      and runtime-closure checks locally without claiming a trusted R2 receipt.
- [ ] A policy-only PATCH may explicitly decline live inspection, while player-visible patches and all
      epics remain bound to protected media qualification and ADR-0012.
- [ ] Merge authorization reads work-item metadata from the exact read-only candidate with trusted
      base-branch parser code; candidate code never receives the authorization credential.
- [ ] Non-inspected release tags bind a clean rebuilt artifact and asset inventory, separate immutable
      merge/tag approvals, and tag-triggered independent revalidation instead of fabricated inspection
      evidence.
- [ ] The final-candidate freeze and two-identical-failure stop rule are normative in the delivery
      contract; evidence-only edits after freeze are forbidden.
- [ ] Hosted qualification installs only the required Chromium browser on the prepared runner and no
      longer repeats the unbounded operating-system dependency install.
- [ ] Root product and bundled base-pack versions are `0.3.1`, and the patch contains regression
      fixtures for each corrected enforcement defect.
- [ ] `validate:full`, `validate:media`, and the required independent audit pass on the final candidate.
- [ ] Merge and immutable `v0.3.1` publication occur only after direct owner authorization; one
      instruction may cover both operations, while the agent materializes distinct exact provider
      records without duplicate manual comments or environment reviews.

## Verification

```text
npm run validate:full
npm run validate:media
```

This patch has no player-visible runtime, content, or production-media change. Under ADR-0012 and
ADR-0013 it therefore has no live product-inspection journey.
