# DOC-001: Local assets and live epic inspection contract

- Status: Done
- Type: Architecture and delivery correction
- Related release: `0.2.0`
- Branch: `docs/adr-0011-local-asset-materialization`
- Commit type: `docs`
- Aggregate gate: `validate:quick`
- Publishes release: `no`
- Requires live inspection: `no`
- ADRs: ADR-0011, ADR-0012

## Problem

EPIC-001 produced strong behavioral and regression evidence, but its closure treated code-native Mimi
fallbacks and screenshot baselines as sufficient proof of a complete visual product. The repository
also described R2 as a runtime asset host even though the intended workflow downloads verified media
into the ignored local content asset tree before build.

## Acceptance criteria

- [x] A superseding ADR defines R2 as the external download origin and the ignored local pack asset
      tree as the verified build input.
- [x] Runtime production media has no direct R2/network dependency.
- [x] A separate ADR requires live production-preview inspection before epic closure.
- [x] The operational, quality, testing, Git, story, versioning, and release contracts all reference
      the new rules and require explicit user approval before merge/tag publication.
- [x] Merge automation rejects absent, stale, wrong-user, and wrong-head provider approval, while
      protected release tags can be created only by the validated publication workflow after separate
      exact-target approval.
- [x] Inspection automation fetches and validates the provider record against the canonical PR,
      inspected head, version, artifact digest, asset-inventory digest, required matrix, and pass
      result.
- [x] Protected tags grant no shared GitHub Actions bypass; only the environment-scoped release deploy
      key may create them after owner review.
- [x] Documentation validation passes.
- [x] An independent fresh-context audit finds no unresolved High or Medium issue.

## Audit status

Round 1 findings were corrected. Round 2 verified those corrections but found two new High issues in
the enforcement added by the fixes: a shared Actions tag bypass and an unvalidated inspection-comment
ID. Both received code, provider-policy, and negative-fixture corrections. Additional audit rounds
explicitly requested by the user hardened asset closure, artifact traversal, workflow fingerprints,
secret isolation, immutable approval evidence, idempotent materialization, and tag-publication
documentation. The final fresh-context Round 10 audit passed with no unresolved High or Medium issue.

## Verification

```text
npm run lint:docs
npm run format:check
npm run lint:code
npm run lint:dead-code
npm run lint:duplicates
npm run test:governance
npm run validate:repository
npm run validate:quick
npm run test:artifact
npm run test:e2e
npm run test:visual
npm run validate:waivers
npm run audit:dependencies
npm run audit:licenses
npm run scan:static
```

The aggregate quick gate passed with 100 unit and integration tests. Browser verification passed
40/40 E2E and 40/40 visual cases. The governance suite passed 127 fixtures, artifact verification
passed 12 files, duplicate detection found zero clones, and the dependency audit found zero known
vulnerabilities. `validate:full` passed on the canonical DOC-001 commit, including its history,
dependency, license, static-security, preview, E2E, visual, and artifact gates.

Live product inspection is not applicable because this item changes non-player-facing governance,
release tooling, and normative documentation only; it does not change the built player experience.
