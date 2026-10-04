# PATCH-006: Stabilize release qualification

- Status: In progress
- Target version: `0.6.1`
- Branch: `fix/PATCH-006-v0.6.1-release-qualification-stability`
- Commit type: `fix`
- Aggregate gate: `validate:full`
- Publishes release: `yes`
- Requires live inspection: `no`
- Type: Compatible test- and release-governance correction
- ADRs: ADR-0013, ADR-0014, ADR-0016, ADR-0018

## Outcome

Remove three non-player-visible defects exposed by EPIC-005 qualification: the shelter visual
suite's race with asynchronous locale bootstrap, the provider adapter's inability to bind checks to
an exact GitHub workflow rerun attempt, and Node 24 loading the commitlint ESM configuration as an
empty ruleset. Player behavior, screenshot tolerances, production content, and media remain
unchanged.

## Acceptance criteria

- [x] Shelter test setup waits for locale bootstrap instead of using an instantaneous visibility
      check.
- [x] First-run setup waits for the chosen locale to be persisted and the localized start action to
      become enabled before continuing.
- [x] Already-bootstrapped setup continues without reopening or bypassing the language chooser.
- [x] The affected Hungarian 1280×800 and 1366×1024 visual cases pass five consecutive focused runs.
- [x] Trusted quality evidence obtains the exact provider job IDs for the newest `run_id` and
      `run_attempt`, excluding retained jobs from an older attempt in the same check suite.
- [x] A duplicate required job inside the selected attempt remains rejected.
- [x] Governance fixtures reproduce the provider's same-suite rerun shape with an older failed visual
      job and a newer successful visual job.
- [x] Trusted quality evidence ignores newer workflow runs that do not match the required workflow,
      branch, event, and commit identity.
- [x] Commitlint loads the unchanged repository rules under the pinned Node 24 runtime.
- [x] Screenshot baselines, tolerances, production code, content, and media remain unchanged.
- [x] Root product, bundled base-pack, and materialization-lock versions are `0.6.1`.
- [x] `validate:quick`, `validate:full`, and the independent audits pass on the exact candidate.
- [ ] Merge and immutable `v0.6.1` publication occur only after direct owner authorization; one
      instruction may cover both operations while provider records remain distinct.

## Verification

```text
node scripts/run-playwright.mjs test --project=chromium-1280x800 --grep "reviews hu partial and complete Garden fallback states" --repeat-each 5
node scripts/run-playwright.mjs test --project=chromium-1366x1024 --grep "reviews hu partial and complete Garden fallback states" --repeat-each 5
npm run test:governance
npm run validate:quick
npm run validate:full
```

This patch changes only test setup, provider-evidence selection, governance and commit-lint
configuration, backlog state, and release metadata. It has no player-visible runtime, content, or
production-media change, so ADR-0012 live product inspection does not apply.
