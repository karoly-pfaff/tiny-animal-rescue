# EPIC-008: Quality, accessibility, and polish

- Status: Planned
- Milestone: M8
- Target version: `0.9.0`
- Dependencies: EPIC-003 through EPIC-007
- ADRs: all accepted ADRs

## Outcome

Turn content-complete v1 into a child-ready release candidate through responsive QA, accessibility and sensory review, performance work, visual consistency, and observed play feedback.

## Stories

### E008-S01 — Supported viewport certification

- [ ] Every screen and mission is reviewed at 1024×768, 1280×800, 1366×1024, and 768×1024.
- [ ] No target, path, prompt control, or resident is clipped or obscured.
- [ ] Portrait layout is deliberately rearranged where needed.
- [ ] Visual regression baselines are approved in HU and EN.

### E008-S02 — Motor and interaction accessibility

- [ ] Target sizes and effective hit regions are audited.
- [ ] Drag, wipe, match, and trace tolerances are tuned from actual use.
- [ ] Pointer cancellation, second-touch, edge-of-screen, and interrupted-input behavior pass.
- [ ] No mission requires precision beyond the documented age target.

### E008-S03 — Guidance and cognitive load review

- [ ] Each step has one dominant next action.
- [ ] Guidance timings and repetitions are consistent.
- [ ] No instruction relies on text or color alone.
- [ ] Wrong actions are neutral and recoverable.
- [ ] Opening prompts do not compete with transition motion or music.

### E008-S04 — Sensory and audio polish

- [ ] No rapid flash or high-frequency full-screen motion exists.
- [ ] Loudness is consistent across narration, effects, and music.
- [ ] Reduced-motion mode covers transitions, pulses, ghost hints, and celebration.
- [ ] Celebration intensity and duration are child-appropriate.

### E008-S05 — Performance and resilience

- [ ] Startup, location transition, and mission interaction budgets are defined and measured on representative hardware.
- [ ] Images/audio are preloaded selectively without exposing locked content.
- [ ] Memory remains stable across repeated missions and shelter navigation.
- [ ] Background/resume, offline start, and asset-decode failure paths are tested.

### E008-S06 — Observed child-flow sessions

- [ ] A lightweight, privacy-preserving observation plan is approved by caregivers.
- [ ] First action, drag discoverability, prompt comprehension, adult intervention, and shelter recognition are recorded without identifying data.
- [ ] Findings are triaged into blocker, v1 polish, and post-v1.
- [ ] Blockers and approved v1 findings are resolved and rechecked.

### E008-S07 — Final visual and copy pass

- [ ] Art, animation, UI depth, shadows, highlights, and transitions feel like one product.
- [ ] Runtime labels align with blank sign/button assets.
- [ ] Parent-facing HU/EN wording is reviewed for clarity.
- [ ] No placeholder, debug overlay, test ID, or accidental glyph appears visually.

## Exit criteria

- Release candidate passes full automated validation and manual viewport review.
- No unresolved child-flow blocker remains.
- Performance and sensory behavior meet documented budgets/checks.

## Verification

```text
npm run validate:release
```

Inspect the full HU/EN viewport baseline, touch/mouse and cancellation matrix, performance/bundle
reports, reduced-motion and audio evidence, visual diffs, privacy-preserving child-flow findings, and
resolution of every release-candidate blocker.

## Primary risks

- late polish revealing content composition rework;
- testing only on developer-class hardware;
- treating automated accessibility checks as proof of preschool usability.
