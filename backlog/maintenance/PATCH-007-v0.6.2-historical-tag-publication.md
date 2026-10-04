# PATCH-007: Support historical release tag publication

- Status: In progress
- Target version: `0.6.3`
- Branch: `fix/PATCH-007-v0.6.2-historical-tag-publication`
- Commit type: `fix`
- Aggregate gate: `validate:full`
- Publishes release: `yes`
- Requires live inspection: `no`
- Policy transition: `publish`
- Type: Compatible release-governance correction
- ADRs: ADR-0013, ADR-0014, ADR-0016, ADR-0017, ADR-0019, ADR-0020

## Outcome

Allow the protected tag publisher to publish a missing immutable tag for an already qualified merged
release after protected `main` has advanced, without rewriting history, weakening evidence, executing
historical policy with publication credentials, or tagging the wrong tree.

## Acceptance criteria

- [x] Tag validation executes only policy pinned to the workflow dispatch SHA and proves that the
      workflow, every policy checkout, and the live provider `main` ref still match.
- [x] A separate read-only target checkout must equal the merged pull request's exact squash SHA, and
      that squash must be an ancestor of current protected `main`.
- [x] Work-item and release metadata come from the target checkout; approval, inspection, workflow,
      and publication rules come from current protected `main`.
- [x] Inspected historical releases reverify their retained qualified artifact against the exact
      target source and original qualification-policy parent.
- [x] Non-inspected historical releases build the exact target in a separate credential-free job;
      fresh trusted validation measures its artifact without executing candidate-controlled code.
- [x] The environment-scoped publication job consumes only the validated tag specification, checks
      out the exact target SHA, executes no repository package/script command, and cannot update or
      delete an existing protected tag.
- [x] Publication is globally serialized without dropping pending runs; the target squash's parent
      version determines the predecessor, and the final write boundary rechecks it as the latest
      stable tag alongside the absent target ref and current policy head.
- [x] Governance fixtures reproduce the EPIC-005 historical-tag case and every fail-closed identity,
      ancestry, ordering, and credential-boundary case.
- [x] Root product, bundled base-pack, and materialization-lock versions are `0.6.3`.
- [x] `validate:quick`, `validate:full`, and the independent audit pass on the exact candidate.
- [ ] Merge and immutable `v0.6.0`, `v0.6.1`, `v0.6.2`, and `v0.6.3` publication occur only under the owner's
      direct authorization and as separate provider records in that order.

## Verification

```text
npm run test:governance
npm run validate:quick
npm run validate:full
```

This patch changes release tooling, governance tests, normative delivery documentation, backlog
state, and release metadata only. It has no player-visible runtime, content, or production-media
effect, so ADR-0012 live product inspection does not apply.
