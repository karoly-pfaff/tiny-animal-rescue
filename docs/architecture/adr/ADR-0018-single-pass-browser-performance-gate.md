# ADR-0018: Use a single-pass repeatable browser performance gate

- Status: Accepted
- Date: 2026-10-03
- Amends: ADR-0009, ADR-0013

## Context

The `browser` CI job and `validate:full` both ran `test:preview` and then `test:e2e`. Every current
non-visual E2E test carries the `@preview` tag, while `test:e2e` excludes only `@visual`, so the two
commands executed the same 84-test viewport and input matrix twice on one candidate. This doubled the
slowest ordinary gate without adding scenario coverage.

The duplicate execution also exposed a measurement defect in the Trace tablet proxy. One pass met the
unchanged 50 ms p95 frame-interval budget; the immediate duplicate observed 50.1 ms. A single
wall-clock sample on a shared host cannot reliably distinguish a persistent rendering regression from
one scheduler outlier, while blind reruns can conceal a real defect.

## Decision

The ordinary aggregate and the canonical `browser` provider job execute the non-visual production
preview E2E matrix exactly once. `test:preview` and `test:e2e` may remain available as explicit entry
points, but an aggregate may not invoke both while they select the same tests.

The throttled Trace performance assertion keeps the existing budgets unchanged: p95 frame interval at
most 50 ms, p95 pointer-to-paint latency at most 100 ms, and at least 12 pointer samples. One declared
performance run consists of exactly three independent, clean-page measurements:

1. every measurement must satisfy the minimum sample count;
2. every measurement is retained in the test report;
3. the median of the three per-measurement p95 values must satisfy each unchanged time budget; and
4. the attempt count is fixed before execution, with no conditional retry or pass-until-green path.

The canonical workflow semantic fingerprint binds the single E2E invocation. Governance fixtures must
reject replacing that invocation with candidate-controlled artifact fabrication.

## Rationale

One canonical matrix run preserves all scenario, viewport, touch, mouse, and artifact coverage while
removing duplicate cost. Three fixed measurements make the performance decision repeatable enough for
a shared CI host and still fail a persistent regression in at least two measurements. Retaining every
attempt keeps the evidence auditable.

## Consequences

- Ordinary full validation runs 84 non-visual browser cases once instead of twice.
- The Trace touch-profile case performs three fixed journeys inside that one matrix run.
- The 50 ms and 100 ms budgets are not relaxed.
- A failed fixed sample set fails the gate; operators may not add an ad hoc retry to change the result.
- Physical-device release qualification remains separate and may strengthen this proxy.

## Rejected alternatives

- **Raise or round the 50 ms threshold:** weakens an accepted performance contract after observing a
  failure.
- **Retry only after failure:** makes pass/fail depend on an unbounded or conditional retry path.
- **Keep both aggregate invocations:** preserves duplicate cost and doubles exposure to host jitter
  without adding coverage.
- **Remove the performance assertion:** loses the only repeatable tablet performance proxy before the
  release hardware matrix is available.
