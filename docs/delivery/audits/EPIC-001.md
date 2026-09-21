# EPIC-001 independent audit log

This log retains every High and Medium finding, its disposition, and the bounded audit outcome required
by `AGENTS.md`.

## E001-S01 — Child-facing start and first-run flow

- Round 1 found seven issues: unversioned locale storage outside the persistence policy; an overly
  broad ARIA localization exemption; a production image outside pack inventory and validation; a
  deep-link bypass of first-run setup; incomplete first-run/English visual evidence; a touch test that
  activated an inert surface; and disabled contrast checking with weak button colors.
- The fixes introduced a versioned repository contract and IndexedDB adapter, narrowed the ARIA
  exemption with a failing `aria-label` fixture, added pack-owned asset inventory and negative policy
  fixtures, gated all routes on first-run setup, expanded the four-project visual matrix, activated the
  actual Play control under touch/mouse, and restored contrast checking with darker controls.
- User direction established that production media binaries must not enter Git and will later be
  delivered through R2. ADR-0010 records the boundary; Git retains logical object keys, ownership,
  prompt provenance, QA, and delivery status. The local production PNG is ignored and untracked;
  regression screenshots remain versioned test evidence.
- Round 2 verified the Round-1 corrections and found one High and two Medium issues: two files failed
  Prettier; the locale repository lived in the i18n domain instead of persistence; and write failures
  were swallowed after prematurely unlocking the child flow.
- The bounded post-audit fixes ran Prettier and moved the record/parser/IndexedDB adapter to
  `sources/persistence`. The first-run gate now unlocks only after a successful write, exposes a
  localized retryable alert after failure, and treats missing IndexedDB as an explicit write error.
  An application-level reject-then-retry regression test proves that Play remains blocked until the
  caregiver setting persists.
- Final affected-gate evidence after the Round-2 fixes: `format:check`, typecheck, lint, asset policy,
  unit, integration, accessibility, build, E2E, visual regression, and `validate:quick` pass. The full
  unit run has 39 tests and 96.92% statement, 89.83% branch, 98.11% function, and 96.87% line coverage;
  Playwright has 16/16 behavioral and 12/12 visual passes across the viewport/touch matrix.
- Disposition: the two-round audit is exhausted as required. Every Round-1 and Round-2 High/Medium
  finding is fixed with affected-gate evidence; no finding is declined or unresolved.
