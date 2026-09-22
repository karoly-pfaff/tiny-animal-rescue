# ADR-0012: Require live product inspection before epic closure

- Status: Accepted
- Date: 2026-09-22
- Amends: ADR-0009

## Context

Automated E2E and screenshot regression tests prove repeatability against known assertions and
baselines. They do not prove that a baseline is attractive, that production assets rather than
fallbacks are visible, or that the assembled product feels coherent. EPIC-001 passed its automated
gates while displaying a code-native Mimi placeholder and without a materialized Mimi production
asset. The evidence proved behavior but was incorrectly reported as complete product evidence.

The project needs a non-automated, recorded gate that inspects the actual production build a player
would receive. This review must occur before requesting merge approval, not after merge or tagging.

## Decision

Every epic and every patch with player-visible impact requires a live product inspection on the exact
candidate commit after the applicable automated aggregate gate and independent audit pass. Audit fixes
rerun their affected gates before inspection.

The implementer must:

1. synchronize and verify every production asset required by the changed journeys;
2. create the production build and start its static preview;
3. open that preview in a real browser rather than inspecting source, isolated components, or stored
   screenshots alone;
4. complete the exact journey set declared by the epic or patch in both Hungarian and English with
   mouse and touch input;
5. inspect the complete supported viewport matrix at full size: 1024x768, 1280x800, 1366x1024, and
   768x1024;
6. confirm that real production media loaded, no placeholder or fallback is visible, composition and
   hierarchy are coherent, required targets and safe paths remain clear, and no watermark, baked text,
   clipping, overlap, loading failure, console error, or unintended visual state appears;
7. record findings, correct them, rebuild, and repeat the affected inspection before sign-off; and
8. add a retained inspection record before asking the user to approve merge.

The final inspection record is retained outside the candidate Git tree as a provider-backed pull
request comment and a non-expired, non-empty GitHub Actions visual artifact produced from the exact
inspected head. It identifies the epic or patch, exact commit SHA and
product version, build and preview commands, browser, locale/input/viewport matrix, journeys
inspected, asset-inventory and artifact digests, evidence paths, findings and dispositions, inspector,
timestamp, and final result. Screenshots support this record but never replace the live walkthrough.
The later explicit approval names the inspection-comment identity and exact candidate SHA. This avoids
changing the commit after inspecting it while leaving a provider-verifiable evidence chain.

An epic cannot be marked Done, its pull request cannot be presented as merge-ready, and its version
cannot be tagged unless this inspection passes. Automated checks, a subagent audit, green screenshot
comparison, or user interface DOM assertions cannot waive it. After the inspection passes, merge and
tagging still require the user's explicit approval; completion of this gate is not merge authority.

## Rationale

The player experiences one assembled product, not individual tests or manifests. Opening the exact
candidate makes missing media, accidental fallbacks, poor composition, stale builds, and integration
defects visible at the point where they can still block closure.

## Consequences

- Epic completion includes a small manual cost and cannot be fully delegated to CI.
- A visual baseline may pass while live product inspection fails; the live finding blocks closure.
- Evidence must distinguish behavioral automation, regression baselines, asset delivery, and live
  product judgment instead of presenting one as proof of another.
- Fixes made after inspection invalidate that sign-off for every affected journey and require a new
  candidate build and focused reinspection.
- The versioned audit document may define the planned matrix and summarize historical findings, but
  the final pass record for an exact candidate lives in the pull-request conversation/artifacts so it
  does not create a new, uninspected commit.
- Non-player-facing documentation-only changes state that live inspection is not applicable with a
  reason; they do not fabricate a walkthrough record.

## Rejected alternatives

- **Treat Playwright screenshots as visual approval:** only proves equality with the stored baseline,
  including a bad or placeholder baseline.
- **Inspect generated screenshots without opening the product:** misses interaction, transitions,
  loading, focus, animation, audio/visual timing, and stale preview state.
- **Inspect only at v1 release:** allows several milestone claims to accumulate on an unreviewed
  player experience.
- **Perform the inspection after merge:** discovers blockers after the immutable milestone history was
  already advanced.
