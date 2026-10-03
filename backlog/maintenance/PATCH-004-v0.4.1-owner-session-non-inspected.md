# PATCH-004: Support non-inspected owner-session merge

- Status: In progress
- Target version: `0.4.1`
- Branch: `fix/PATCH-004-v0.4.1-owner-session-non-inspected`
- Commit type: `fix`
- Aggregate gate: `validate:full`
- Publishes release: `yes`
- Requires live inspection: `no`
- Type: Compatible release-governance correction
- ADRs: ADR-0013, ADR-0014, ADR-0016, ADR-0017, ADR-0018

## Outcome

Remove the unconfigured GitHub App as a release blocker for non-player-visible work without running
candidate code with the owner's credentials or weakening any exact-head quality, approval, history,
artifact, or protected-branch check.

## Acceptance criteria

- [x] Owner-session merge accepts non-inspected work only with evidence from the newest successful
      canonical exact-head required-quality run.
- [x] The command downloads the exact browser artifact and independently recomputes its production
      artifact digest with trusted `main` policy.
- [x] Candidate commands and candidate JavaScript do not execute while owner evidence is prepared.
- [x] A local rebuild, caller-authored evidence, candidate workflow or policy drift, stale or
      mismatched quality run, malformed digest, dirty checkout, stale base, missing check, or invalid
      approval remains rejected.
- [x] Inspected work continues to require its protected media-qualification and inspection evidence.
- [x] Raw provider merge, ruleset bypass, and direct tag push remain forbidden.
- [x] Full and provider browser validation execute the non-visual E2E matrix once, while the unchanged
      Trace performance budgets use three fixed reported measurements without conditional retries.
- [x] Documentation linting uses the direct `markdownlint` API and repository-owned deterministic
      file discovery, removing the unpatched `braces` glob dependency reported by
      `GHSA-vfj7-8cjw-p6xm` without weakening the Markdown rule set.
- [x] Root product, bundled base-pack, and materialization-lock versions are `0.4.1`.
- [ ] Governance fixtures, `validate:quick`, `validate:full`, and the independent audit pass on the
      exact candidate.
- [ ] Merge and immutable `v0.4.1` publication occur only after direct owner authorization; one
      instruction may cover both operations while provider records remain distinct.

## Verification

```text
npm run test:governance
npm run validate:quick
npm run validate:full
```

This patch changes release-governance policy, validation tooling and tests, the documentation-lint
dependency graph, and version metadata. It has no player-visible runtime, content, or production-media
change, so ADR-0012 live product inspection does not apply.
