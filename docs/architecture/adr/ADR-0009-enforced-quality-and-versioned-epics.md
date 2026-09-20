# ADR-0009: Enforced quality gates and versioned epics

- Status: Accepted
- Date: 2026-09-20

## Context

Tiny Rescue is deliberately small, but its child-facing input, audio/localization parity, declarative
content, and persistent progress make correctness failures consequential. General promises such as
"strict quality" or "tests pass" are not reproducible unless contributors share concrete commands,
thresholds, CI requirements, exception rules, and review evidence.

The backlog also needs checkable progress claims. Grouping several epics into an informal milestone
would make the product version describe elapsed work rather than a demonstrated outcome.

## Decision

Adopt a mandatory engineering gate stack from EPIC-000 onward:

- strict TypeScript and type-aware ESLint with zero warnings and structural limits;
- Prettier check mode;
- zero-tolerance jscpd clone detection over authored production/tool source;
- Knip dead-file, dead-export, dependency, unresolved-import, and cycle detection;
- deterministic unit, integration, content, coverage, production-preview, Playwright E2E, and visual
  regression gates;
- frozen dependency installation plus dependency, license, asset-provenance, and release-artifact
  checks;
- the same repository scripts locally and in required CI checks.

The detailed operational contract and thresholds live in
[`docs/delivery/quality-gates.md`](../../delivery/quality-gates.md); design expectations live in
[`docs/delivery/code-quality.md`](../../delivery/code-quality.md). Those documents may clarify or
tighten enforcement without a new ADR. Weakening/removing a gate family, normalizing an exception,
or changing enforcement ownership requires an explicit product decision and an amending or
superseding ADR.

Every non-trivial implementation, gate, schema/contract, or normative-document change receives a
fresh-context independent audit under `AGENTS.md`. Mechanical gates and the audit are complementary;
neither substitutes for the other.

Each epic is exactly one milestone and one pre-1.0 product minor: EPIC-000 produces `0.1.0` through
EPIC-009 producing `0.10.0`. Exit criteria, not dates or merges, earn the version. After the final
candidate passes release sign-off without behavioral change, it is promoted to `1.0.0`. The detailed
mapping, patch policy, compatibility lines, and immutable-tag rules live in
[`docs/delivery/versioning.md`](../../delivery/versioning.md).

## Rationale

Greenfield enforcement prevents a permanent "temporary" debt baseline. Separate tools cover
different failure classes: types and lint catch local defects, Knip and jscpd inspect repository
shape, contract tests protect content, and real-browser/visual checks protect the touch-first player
experience. A fresh reviewer addresses ownership, coupling, scope, and test meaning that a mechanical
tool cannot decide.

One epic per milestone/version makes every release name a concise, auditable claim and keeps the
backlog, tags, release notes, and implemented capability synchronized.

## Consequences

- EPIC-000 must establish the entire gate skeleton before feature work can claim completion.
- Required checks run continuously on pull requests and `main`; E2E is narrow by design but not
  deferred to the end of the project.
- Tool suppressions and test skips are exceptional, narrow, owned, and expiring.
- Strict structural limits may require small named functions and components; a local documented
  exception is preferred only when extraction would obscure a declarative unit.
- CI takes longer and retains more artifacts, but failures are found near the change that caused them.
- Parallel implementation remains possible, but milestone tags are recorded in numeric order.
- A product fix after an epic release uses a patch; it does not claim the next epic's minor.

## Rejected alternatives

- **Adopt gates after the first vertical slice:** creates legacy debt before the standard exists and
  makes later thresholds negotiable against already-merged code.
- **Lint, unit tests, and build only:** misses dead code, duplication, content drift, touch/browser
  behavior, and visual regressions.
- **Run E2E only at release:** makes failures hard to attribute and encourages brittle late fixes.
- **Use coverage percentage as the quality definition:** rewards execution without proving useful
  assertions or the correct contract boundary.
- **Let each contributor choose tools and exceptions:** produces non-reproducible quality claims and
  configuration drift.
- **Group multiple epics into one milestone/version:** hides which exit criterion a release actually
  satisfies.
- **Version on calendar or merge count:** communicates activity rather than player-visible evidence.

