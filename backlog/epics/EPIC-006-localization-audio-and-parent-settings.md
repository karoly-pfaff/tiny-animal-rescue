# EPIC-006: Localization, audio, and parent settings

- Status: Planned
- Milestone: M6
- Target version: `0.7.0`
- Inspection journeys: `start,map,content-loading,rescue,celebration,shelter,replay,reload,localization,audio,parent-settings`
- Dependencies: EPIC-001, EPIC-002
- ADRs: ADR-0005, ADR-0006, ADR-0011, ADR-0012

## Outcome

Provide a complete HU/EN audio-first experience, self-hosted typography, deterministic audio behavior, and child-safe parent settings.

## Stories

### E006-S01 — Runtime localization service

- [ ] Locale bundles load by semantic key.
- [ ] HU and EN key parity is validated.
- [ ] Missing keys fail development/release builds visibly.
- [ ] Locale changes update active UI and future narration without restart.
- [ ] Formatting APIs do not assume English word order.

### E006-S02 — Typography and text fitting

- [ ] Baloo 2 and Nunito are self-hosted with license files.
- [ ] Hungarian accented glyphs are covered in every shipped subset.
- [ ] Large labels use content-sized containers and tested fitting limits.
- [ ] HU/EN screenshots show no clipping or accidental all-caps problems.

### E006-S03 — Audio service

- [ ] Separate music, effects, and narration channels exist.
- [ ] Narration ducks music and can replace prior narration cleanly.
- [ ] Browser audio unlock is handled through the first user gesture.
- [ ] Pause/background/visibility transitions are safe.
- [ ] Asset decode failure has a visual fallback and logged diagnostic.

### E006-S04 — Localized narration contract

- [ ] Mission intro, each step, success, resident name, and core navigation prompts have HU/EN inventory entries.
- [ ] Locale-specific audio remains pack-owned and validates with the declaring key.
- [ ] Shared effects/music are not duplicated per locale.
- [ ] Prompt replay is available consistently in missions.

### E006-S05 — Parent settings and gate

- [ ] Parent gate does not collect data and is difficult to trigger accidentally.
- [ ] Language, music, effects, narration, and reduced-motion controls persist.
- [ ] Reset progress delegates to EPIC-005 behavior.
- [ ] External/legal/credits links, if present, cannot be opened directly by the child flow.

### E006-S06 — Text-free asset enforcement

- [ ] Art specifications require blank signs/buttons and no glyphs.
- [ ] Asset review checklist records text inspection.
- [ ] UI labels are always separate runtime elements.
- [ ] Deliberately invalid baked-text fixture demonstrates the release gate or manual review workflow.

### E006-S07 — Produce and integrate the bounded first-rescue audio set

- [ ] A generated inventory lists every music, effect, and HU/EN voice runtime ID exercised by the
      inherited first-rescue journeys (`start,map,content-loading,rescue,celebration,shelter,replay,reload`),
      with no unrelated full-game audio scope.
- [ ] The owner produces, edits, and approves every inventoried file using the repository prompt pack;
      production exports contain no audible watermark, branding, signature, or authorship credit.
- [ ] Every asset has approved prompt, provenance/license, mastering, duration/format, channel, and
      repeated/overlapping playback QA evidence plus an exact R2 object key and digest lock.
- [ ] Verified R2 media materializes only into the ignored `content/base/assets/audio/` tree and the
      packaged product resolves local pack paths without a browser-time R2 request.
- [ ] Music, effects, and voice use separate channels; narration replaces the current line and ducks
      music without depending on wall-clock audio duration for mission progression.
- [ ] HU and EN voice coverage is equivalent, code-native speech is absent from the media-complete
      candidate, and mute/replay/background-resume behavior passes integration and browser checks.
- [ ] The exact candidate passes asset/audio gates, the complete supported viewport/input journey
      matrix, listening QA, and ADR-0012 live production-preview inspection.

## Exit criteria

- First rescue and shelter flow are complete and equivalent in HU and EN.
- Muted play remains understandable through visual guidance.
- Audio channels, prompt replay, pause, and settings pass integration tests.

## Verification

```text
npm run test:content
npm run test:assets:materialized
npm run test:integration
npm run test:e2e
npm run test:visual
npm run validate:full
```

Inspect the inherited start, map, content-loading, rescue, celebration, shelter, replay, and reload
journeys plus HU/EN key, narration, glyph, and layout parity; mute/reduced-motion behavior; audio
unlock/duck/replay/pause; and parent-gate/reset boundaries.

## Primary risks

- late narration production blocking content complete;
- font subset accidentally omitting `ő`/`ű`;
- browser autoplay behavior causing silent first prompts.
