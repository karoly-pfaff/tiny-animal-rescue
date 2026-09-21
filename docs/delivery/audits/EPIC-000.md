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
- Local focused evidence after the fixes: ESLint, Knip, jscpd, documentation links, 44 governance
  fixtures, repository-policy validation, and the authored/build watermark scan pass.
- Hosted application evidence is currently blocked: GitHub accepted the squash-only repository
  settings but returned HTTP 403 for the active private-repository ruleset because the account needs
  GitHub Pro or the repository must be public. This is recorded as an external completion blocker,
  not treated as a passing ruleset.
- Round 2 verified every Round-1 code correction and found no new implementation High. It reported
  that the audit section was not yet visible during its parallel read and one remaining Medium:
  adapter fixtures did not directly exercise main-range derivation, tag artifact-report ingestion,
  or the final pre-merge policy composition. The audit section is this retained record; shared pure
  adapters now drive the production paths, and negative fixtures cover multi-commit main pushes,
  rebuilt-artifact mismatch, post-check PR metadata edits, and changed required-check results.
- Disposition: no unresolved code High or Medium after the bounded second round. E000-S06 and
  EPIC-000 remain externally blocked on hosted ruleset capability and hosted run evidence; this log
  does not waive either acceptance criterion.
