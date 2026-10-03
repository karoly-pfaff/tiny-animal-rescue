# EPIC-005 independent audit and evidence index

This record retains the material High and Medium audit dispositions and the planned exact-head
inspection matrix for M5. The final ADR-0012 pass record remains outside the candidate Git tree in the
provider-backed pull-request conversation and its non-expired visual artifact.

## Canonical story commits

| Story    | Commit                                     | Outcome                              |
| -------- | ------------------------------------------ | ------------------------------------ |
| E005-S01 | `cb78ad9d117d16159fde9470f337d133ba4a70ba` | Final save repository contract       |
| E005-S02 | `acf335740bc6d5f7e5ef894a1a07e04fc1cf1915` | Migration and recovery framework     |
| E005-S03 | `f1a4e5201d3b6329dfd12f56b44d86bb596c6c19` | Atomic completion and resume         |
| E005-S04 | `dda98e0ea35bc688ec4159d7ea6a078a3d27cd07` | Three content-declared shelter areas |
| E005-S05 | `bdb217a7697c0e55bbf77892070bfa54f406bca7` | Resident presentation and reactions  |
| E005-S06 | `47380143118480f83e7e04db4085e3829bc47956` | Protected reset flows                |
| E005-S07 | `a99fdd92057cad9d44206fe8265b0d667e511d5e` | Complete shelter proof               |

## Independent audit disposition

- Persistence round one found two High issues: persistence completion could be discarded while the
  mission was paused by page visibility, and the save migration module was outside the explicit 100%
  coverage threshold. Completion is now queued until resume with checkpoint and reward regressions;
  the migration module has its own 100% threshold. Round two verified both findings resolved with no
  new High.
- Content round one found one High and two Medium issues: shelter voice fallback lacked exact future
  owners, omitted shelter slots were normalized in presentation code rather than the content boundary,
  and the Garden/Pondside prompt zones disagreed with runtime slot geometry. The epic and future owners
  now enumerate every deferred cue and inherited journey; content assembly exposes required normalized
  slots; both prompt briefs use the runtime row-major resident layout and visible water for Habi. Round
  two verified every original finding resolved with no new High.
- UI/audio/accessibility round one found one High and four Medium issues: expansion shelter-name cues
  failed closed in materialized builds, raw PNG hashes crossed renderer platforms, pointer capture used
  unchecked double assertions, parent settings lacked locked/unlocked accessibility coverage, and
  Garden/Kert voice copy disagreed with the visible name. The final stories provide safe localized
  speech fallback for content-owned names, use reviewed Playwright baselines with a bounded
  cross-platform rasterization tolerance, call typed DOM pointer APIs, exercise
  locked/unlocked/modal axe states, and align Garden/Kert copy. Round two verified every original
  finding resolved with no new High.
- The first aggregate run after round two exposed only a progression test fixture that copied Mimi's
  explicit slot onto all twelve synthetic residents. The fixture now omits that authored slot so the
  production content normalizer assigns deterministic compatibility slots. The affected 36 focused
  tests and subsequent quick gate passed. This test-only gate repair occurred after the bounded two
  audit rounds; no third self-audit is claimed.
- The first media-complete exact-head visual run then proved that four Indoor Room signature
  contracts still represented the pre-M5 single-resident positioning. The rendered production
  background and Mimi asset correctly used the intended M5 two-by-two content slot grid and new area
  controls at every supported viewport. All four images were inspected at original size with no
  clipping, overlap, baked text, or watermark finding; only those four decoded-pixel signatures were
  regenerated. That real contract repair invalidated the first frozen head, so exact-head media and
  aggregate qualification restart from the updated candidate.
- The first hosted exact-head visual runs exposed two test-only portability defects in the new
  shelter evidence: navigation could race the first-run locale transaction, and Linux font
  rasterization differed from the reviewed Windows fallback images by 251 pixels in the largest
  complete English Garden frame. The shelter helper now waits for locale persistence before
  navigation, while those two fallback screenshots permit at most 300 differing pixels (less than
  0.04% even at the smallest viewport). This bounded budget covers the observed cross-platform glyph
  rasterization without accepting a layout-scale change. The repair changes no production code or
  reviewed image; affected local and hosted gates restart on the new head. It occurred after the
  bounded audit rounds, so no third self-audit is claimed.
- No Medium finding is declined. The remaining production-media gaps are explicit bounded deferrals,
  not completed-media claims.

## Pre-closure automated and visual evidence

- The final story head passed the complete quick gate: 55 test files and 411 tests passed; statement,
  branch, function, and line coverage were 95.37%, 89.85%, 96.52%, and 95.34%.
- ESLint, localization boundaries, jscpd, Knip, Markdown/link checks, repository governance,
  TypeScript, content and asset contracts, 230 localized voice prompts, twelve accessibility tests,
  secret scanning, watermark scanning, and the production build passed.
- The affected production-preview suite passed 20/20 cases across 1024x768, 1280x800, 1366x1024,
  and touch 768x1024. It covers shelter navigation, non-overlapping resident/control targets,
  empty/partial/complete HU/EN shelter states, and locked/unlocked/confirmation reset accessibility.
- The shelter visual suite passed 8/8 HU/EN partial/complete Garden cases across the same viewport
  matrix. All sixteen generated baseline images were inspected at original size with no clipping,
  overlap, baked text, or watermark finding.
- Qualified production media remains only in the ignored `content/base/assets/` materialization tree
  and is bound by the tracked lock. No production media binary is committed.

The evidence above predates the closure commit and is not final qualification evidence for the
v0.6.0 candidate. The exact-head aggregate gate, media-complete build, and live walkthrough below
must pass before merge approval; none is implied by this record.

## Exact-head live inspection matrix

### Carried media inventory

| Dependency                                 | State in M5                  | Exact future owner | Required inherited evidence                                                    |
| ------------------------------------------ | ---------------------------- | ------------------ | ------------------------------------------------------------------------------ |
| Garden/Pondside shelter backgrounds        | deterministic fallback       | E007-S06           | HU/EN `shelter`; empty/partial/complete; mouse/touch; every supported viewport |
| Morzsi and Breki resident media            | deterministic fallback       | E007-S02           | HU/EN resident tap and full shelter placement                                  |
| Süni, Csipi, Makk, and Rozi resident media | deterministic fallback       | E007-S03           | HU/EN resident tap and full shelter placement                                  |
| Pipi and Pamacs resident media             | deterministic fallback       | E007-S04           | HU/EN resident tap and full shelter placement                                  |
| Totó, Kiki, and Habi resident media        | deterministic fallback       | E007-S05           | HU/EN resident tap and full shelter placement                                  |
| Three shelter-area names and Mimi name     | code-native localized speech | E006-S07           | HU/EN listening, repeat, mute/channel, mouse/touch, every supported viewport   |
| Eleven remaining resident names            | code-native localized speech | E007-S07           | HU/EN listening for all residents after production art materialization         |

These dependencies are absent from the M5 media-complete claim. Their future owning stories must
replace each fallback with approved, digest-locked, locally materialized production media and retain
the specified inherited evidence.

- Journeys: `shelter`, `persistence`, and `reload`.
- Seeded states: empty shelter, partial Garden, all twelve residents, saved in-progress mission,
  corrupt save recovery, progress-only reset, and full reset.
- Locales: Hungarian and English.
- Input: mouse and touch.
- Viewports: 1024x768, 1280x800, 1366x1024, and 768x1024.
- Required M5 production media: every object in the base-pack materialization lock. The carried
  dependencies above are explicitly excluded from M5 qualification and remain mandatory for their
  named owning stories.
- Visual checks: no unexpected placeholder, watermark, baked scene text, clipping, overlap, obscured
  target, loading failure, console error, or unhandled rejection.

The passing provider record must name the exact candidate SHA, v0.6.0, browser, full matrix, artifact
digest, asset-inventory digest, evidence paths, inspector, timestamp, findings, and final result. The
epic remains `In progress` until that retained record, required hosted checks, and explicit user merge
approval exist.
