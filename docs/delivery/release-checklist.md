# v1 release-candidate checklist

This checklist qualifies the M9 `0.10.0` artifact as the candidate that may later be promoted to
`1.0.0`. It does not perform that promotion. Product, safety, privacy, compatibility, exact content,
localization/audio, and release-blocker items are non-waivable. Only an eligible mechanical finding
may be filtered, and only by an active exact `quality-waivers.json` entry that passes
`validate:waivers`. The post-M9 transition is governed by the
[GA promotion procedure](ga-promotion.md).

## Product completeness

- [ ] 4 locations are present and visually distinct.
- [ ] 12 Rescue missions unlock 12 unique residents.
- [ ] 2 Help and 2 World missions are complete.
- [ ] 3 shelter areas each contain no more than 4 residents.
- [ ] Every mission is replayable.
- [ ] The child flow contains no timer, score, failure, currency, or obligation mechanic.

## Content integrity

- [ ] All pack, animal, location, shelter-area, and mission records validate.
- [ ] All IDs and references resolve and are unique.
- [ ] The prerequisite graph is acyclic.
- [ ] Every required asset exists, has correct ownership, and is not a placeholder.
- [ ] No production-resolved or shippable visual asset contains baked or pseudo text.
- [ ] Every approved visual has its final prompt/reference record, tool/date when known, dimensions,
      production-safe or presentation-only classification, full-size QA result, and provenance/license.
- [ ] Presentation concepts under `screens/` are absent from production asset resolution.
- [ ] Content catalog counts and required IDs match.

## Localization and audio

- [ ] HU and EN localization key parity passes.
- [ ] Every prompt and success line has HU and EN narration.
- [ ] Every final music/effect asset has a semantic runtime ID, source prompt, generator/date when
      known, edit/mastering history, duration/format, repeat/loop/overlap QA, pack path, and
      provenance/license record.
- [ ] Baloo 2 and Nunito Hungarian glyphs render correctly.
- [ ] No layout overflow exists at supported viewports.
- [ ] Mute, volume controls, replay, and ducking work.
- [ ] Visual guidance remains sufficient while muted.

## Persistence

- [ ] Mission steps resume according to policy.
- [ ] Completion and resident unlock are atomic and idempotent.
- [ ] Relaunch preserves completed missions and shelter residents.
- [ ] Migration tests pass from every previous supported schema.
- [ ] Progress reset is parent-gated and confirmed.

## Interaction and usability

- [ ] All primitives pass pointer cancellation and touch tests.
- [ ] Hit targets and drag tolerances meet the design rules.
- [ ] Hints escalate without punishment.
- [ ] No primary action depends on reading or color alone.
- [ ] Reduced motion and sensory checks pass.
- [ ] Manual child-flow observation findings have been triaged.

## Engineering

- [ ] `npm ci` succeeds with the committed lockfile and pinned Node/npm line.
- [ ] `validate:release` passes from a clean checkout and includes `validate:quick` and
      `validate:full`.
- [ ] ESLint/format/typecheck report no warning; Knip reports no dead/unresolved/cyclic code or
      dependency; jscpd reports no qualifying clone.
- [ ] Coverage remains at or above the repository thresholds, including 100% branch coverage for
      critical pure policy modules.
- [ ] No required test is skipped, focused, empty, flaky/retried into green, or covered by an
      unapproved/expired waiver.
- [ ] Production build and static preview work.
- [ ] No unexpected console errors occur in critical E2E flows.
- [ ] Reference screenshots are approved.
- [ ] Licenses and credits for fonts, audio, and art sources are present.
- [ ] No secret, personal data, or development-only endpoint is included.
- [ ] Secret scanning and static security analysis have no unresolved High/Critical finding.
- [ ] Required CI checks use the same scripts as local validation and retain coverage, browser,
      visual, dependency/license, bundle, and artifact reports.
- [ ] The independent fresh-context audit has no unresolved High finding; every Medium is fixed or
      explicitly declined with rationale in the release evidence.
- [ ] Candidate product/base-pack `0.10.0`, candidate release notes/build metadata, and immutable
      `v0.10.0` tag agree.
