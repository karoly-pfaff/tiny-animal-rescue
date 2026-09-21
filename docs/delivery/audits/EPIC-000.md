# EPIC-000 independent audit log

This log records the fresh-context review required by `AGENTS.md`. A later passing gate never erases a
finding; the disposition remains reviewable with the story history.

## E000-S01 — Bootstrap application

- Round 1 found an inline document title outside localization and unused route constants. Both were
  fixed in the story commit.
- Round 2 verified both fixes and found no new High issue.
- Disposition: passed with no unresolved High or Medium finding.

## E000-S02 — Establish code quality commands

- Round 1 found incomplete Knip issue coverage, incomplete jscpd scope/evidence, weak documentation
  link edge cases, excluded bootstrap coverage, and architecture-boundary gaps. All were fixed.
- Round 2 found that Knip namespace export/type checks remained disabled. The stable command now
  includes `nsExports` and `nsTypes`; debug output confirmed that every issue type is enabled as an
  error.
- Disposition: passed with no unresolved High or Medium finding after the bounded second round.

## E000-S03 — Establish test harnesses

- Round 1 found browser production code exposed to Node globals, swallowed Vite preview diagnostics,
  and platform-coupled visual baselines. Node globals were removed from the root type environment;
  preview warning/error diagnostics now fail teardown and have focused tests; snapshot paths no longer
  encode the host platform.
- Round 2 verified the first two fixes and found no new High issue. It retained one Medium concern:
  exact-pixel output can still vary because the temporary visual shell falls back to the host system
  font.
- Disposition: the remaining Medium is declined for E000-S03 because deterministic visual rendering
  is an explicit E000-S04 acceptance criterion. E000-S04 owns a bundled font or an equally reproducible
  renderer policy and may not close while this concern remains.

## E000-S04 — Establish visual and responsive shell

- Round 1 found that the initial bundled font choice did not meet the Baloo 2 child-label contract and
  that the first localization-boundary test could miss indirect text and TypeScript browser sinks.
- Both font families are now self-hosted and pinned; Baloo 2 ExtraBold-equivalent weight is verified
  for Hungarian glyphs and used for titles/actions. The localization validator scans production
  TypeScript and TSX, runs inside `lint:code`, and has negative fixtures for all reported bypasses.
- Round 2 verified both fixes and found no new High issue.
- Disposition: passed with no unresolved High or Medium finding.

## E000-S05 — Add repository guidance

- Round 1 found missing aggregate-gate evidence, ambiguity in ADR-0005's treatment of
  presentation-only mockups, a target-locale/template mismatch, and a validation matrix that could be
  read as replacing baseline story evidence with domain-only checks.
- `validate:quick` passed. ADR-0005 now explicitly separates text-free production candidates from
  non-authoritative HU/EN presentation references; the prompt template and visual skill use that same
  boundary. The validation matrix makes its story baseline cumulative with every domain row.
- The skill-creator validator passed all three repo-local skills; link, asset-prompt, presentation
  reference, and documentation gates passed.
- Round 2 verified all four fixes and found no new High issue.
- Disposition: passed with no unresolved High or Medium finding.

## E000-S06 — Establish continuous integration and review governance

- Round 1 found that mutable PR metadata was not revalidated immediately before merge; hosted
  governance read-back was incomplete; canonical PR lookup was branch-local; merge-queue and main
  evidence was partially asserted instead of derived; tag artifact identity was self-asserted;
  named-model watermark phrases and scheduled CodeQL were incomplete; adapter fixtures and policy
  example exclusions were too weak/broad. All code findings were fixed.
- The merge path now reruns the shared provider-backed pull-request policy against current metadata
  and exact head checks. Provider reconciliation compares the returned settings and full ruleset.
  Epic-wide PR enumeration, queue ancestry/binary-patch comparison, actual main push ranges, and a
  separately rebuilt artifact digest provide the history inputs. Named-model fixtures, scheduled
  CodeQL, adapter-level negative cases, and a single exact normative-example substitution strengthen
  coverage without blanket deliverable exemptions.
- Local focused evidence after the fixes: ESLint, Knip, jscpd, documentation links, 62 governance
  fixtures, repository-policy validation, and the authored/build watermark scan pass.
- The first hosted application attempt was blocked: GitHub accepted the squash-only repository
  settings but returned HTTP 403 for the active private-repository ruleset because the account needed
  GitHub Pro or a public repository. The user authorized public visibility; the versioned governance
  automation then applied and read back active `protected-main` ruleset `23751969` without findings.
- Round 2 verified every Round-1 code correction and found no new implementation High. It reported
  that the audit section was not yet visible during its parallel read and one remaining Medium:
  adapter fixtures did not directly exercise main-range derivation, tag artifact-report ingestion,
  or the final pre-merge policy composition. The audit section is this retained record; shared pure
  adapters now drive the production paths, and negative fixtures cover multi-commit main pushes,
  rebuilt-artifact mismatch, post-check PR metadata edits, and changed required-check results.
- Initial hosted candidate evidence on then-current head
  `6a0b7b8bdb746b53bfb7879435e1b85e5f28729a`: required jobs `quality`, `history`, `tests`, `browser`,
  `visual`, `supply-chain`, and `security` all passed in
  [run 35568217892](https://github.com/karoly-pfaff/tiny-animal-rescue/actions/runs/35568217892),
  including retained coverage, browser, visual, supply-chain, and history artifacts. Protected PR
  checks remain the authoritative final-closure-head evidence and are deliberately not self-recorded
  inside the commit they validate.
- Disposition: passed with no unresolved story-level code, hosted-governance, High, or Medium
  finding after the bounded second round and initial hosted qualification. Protected PR checks own
  the final exact-closure-head verification.

## EPIC-000 exit audit

- A fresh epic-level audit found that closure-subject validation had diverged between commitlint and
  history validation. Both paths now use one shared subject policy, with a valid single-closure
  fixture and case-policy fixtures.
- The same audit found that the documented secret gate covered authored files but not the Git history
  available to CI. The gate now fails closed if history cannot be inspected and scans all available
  refs, with adapter fixtures for clean and retained-secret histories.
- The audit also found an overstatement of hosted closure evidence and inconsistent backlog status
  vocabulary. The evidence boundary now assigns exact-head verification to protected PR checks, and
  both backlog views use the defined `Done` state.
- The corrected closure candidate passed the independent exit re-audit with no unresolved High or
  Medium finding. The exact-head full gate passed with 62 governance fixtures, zero dependency
  vulnerabilities, 8/8 preview tests, 8/8 E2E tests, 4/4 visual tests, and a 12-file artifact digest
  of `sha256:5e1d7bc003b0e5470dc3bacc5370e4afd2334ed9bc51c505b44b66daafe34553`.
- Disposition: implementation audit passed. Milestone exit remains pending until the amended closure
  head is uploaded and all seven protected PR checks pass; merge is forbidden before then.
- The first live merge attempt exposed a provider edge case after a legitimate metadata-triggered
  rerun: the merge gate treated required checks from an older check suite as duplicates of the newest
  suite. The gate now selects only the newest exact-head suite, still rejects same-suite retry
  duplicates, and has positive and negative adapter fixtures for both cases.
- The independent audit then found that GitHub's default `filter=latest` response hid earlier
  attempts inside one suite. The production adapter now requests `filter=all`, follows every 100-item
  page, and has an adapter-level regression fixture for the exact query and pagination.
- Round 2 verified the production adapter, exact URLs, pagination, newest-suite selection, and
  same-suite retry rejection. The exact-head full gate passed again with no unresolved High or Medium
  finding and no new High introduced by the fix.
- Final disposition: implementation exit audit passed. Milestone exit still requires all seven
  protected PR checks on the amended closure head before merge.
