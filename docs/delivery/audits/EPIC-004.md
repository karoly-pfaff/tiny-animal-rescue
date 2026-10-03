# EPIC-004 independent audit and evidence index

This record retains the material High and Medium audit dispositions and the planned exact-head
inspection matrix for M4. The final ADR-0012 pass record remains outside the candidate Git tree in the
provider-backed pull-request conversation and its non-expired visual artifact.

## Canonical story commits

| Story    | Commit                                     | Outcome                          |
| -------- | ------------------------------------------ | -------------------------------- |
| E004-S01 | `cf520e3a9ff19b6e15230da8c34ce3006cb25b42` | Content-declared rescue map      |
| E004-S02 | `48044d9c4a0757b4ef34dfc5abf82392d5174fd7` | Deterministic progression        |
| E004-S03 | `016433820f693c94ff6b26709c1fec555b45d2f9` | Selectable rescue calls          |
| E004-S04 | `2fd125c8b33dccdf6b0f82deb3f88882b442ccc2` | Replay and completion state      |
| E004-S05 | `3f318b6d36849ef2d3fc01307f7cccea10ef13ad` | Seeded map and viewport evidence |

## Independent audit disposition

- The E004-S01 through E004-S03 story reviews completed their bounded independent loops with no
  unresolved High or Medium finding in their canonical commits.
- E004-S04's UI review closed without findings. Its navigation review retained one Medium issue in
  round two: a raw cross-pack record lookup bypassed the declared content-owner boundary. The final
  story commit resolves records through the owning pack and includes a cross-pack integration
  regression. The two-round limit was exhausted, so no third self-audit is claimed; the affected
  focused and quick gates passed after the fix.
- E004-S05 round one found five Medium issues: a concrete Pond-ID CSS exception, geometry assertions
  that ignored full call-sheet occlusion, English-only seeded sheet screenshots, inherited Mimi
  subjects on both World fixture missions, and a fixture that erased every resolved portrait. The
  story now reserves call-sheet space generically, measures landmarks against the entire panel,
  records all four seeds in Hungarian and English at every supported viewport, removes inherited
  World subjects, and exercises loaded resident and World subject images through the content asset
  resolver. Both round-two reviewers verified every original finding as resolved with no new High.
- The first exact-head aggregate visual run then exposed twelve stale first-rescue call-sheet and
  replay baselines affected by the audited generic map reflow. Their new HU/EN portrait and landscape
  renders were inspected at original size, accepted, and folded into the canonical E004-S05 commit.
  The two-round story-audit limit remains exhausted, so no third story audit is claimed; the fresh
  epic-level audit reviews the final combined tree.
- The media-complete preflight then exposed missing EPIC-004 signature contracts and an unsafe
  pending-media artifact boundary. Its fresh audit found one High and three Medium issues. Round two
  closed the marker-validation, signature-drift, and normative contract-count findings but proved the
  first pending-key exception remained bypassable from active JavaScript. The final story removes that
  exception: production builds rewrite pending declarations to extensionless ID placeholders, while
  media qualification rejects every file-like pending runtime reference. The two-round limit is
  exhausted, so no third audit is claimed; focused boundary, resolver, fixture, build, and exact-head
  media gates provide the remaining verification.
- The final epic-level UI/audio review found that the default browser effect service is intentionally
  silent and that six EPIC-004 background dependencies are not R2 locked. Neither dependency is
  claimed complete here. The exact owning stories and inherited inspection journeys are recorded in
  the epic's bounded media deferral and repeated in the inventory below.
- The post-PATCH-005 final audit round found dead no-call location controls, filename-derived call
  ordering, and an exhausted one-use landmark vocabulary. The final E004-S05 commit gives every
  unlocked landmark persistent selection feedback, orders calls by validated declarative priority,
  and permits reusable code-native shape/silhouette primitives through unique composite identities
  plus extensible validated ambience cues. Its bounded round-two verification is retained in the
  provider-backed pull-request conversation rather than claimed as candidate-tree evidence.
- The media-qualification repair audit found that the first host-muting fixture also replaced native
  speech and media methods, which could hide playback failures. The final E004-S05 fixture preserves
  native `speechSynthesis.speak()`, `speechSynthesis.cancel()`, and `HTMLMediaElement.play()` behavior;
  it sets only the test utterance volume to zero while Chromium mutes media output.
- No Medium finding is declined. The two final High findings are resolved as explicit bounded
  deferrals rather than being misrepresented as completed production media.

## Pre-closure automated and visual evidence

- `npm run validate:quick` passed after the final rebased audit fixes: 49 test files and 317 tests
  passed; statement, branch, function, and line coverage were 95.70%, 90.94%, 95.93%, and 95.70%.
- ESLint, localization boundaries, jscpd, Knip, Markdown/link checks, repository governance,
  TypeScript, content and asset contracts, 230 localized voice prompts, accessibility, secret
  scanning, watermark scanning, and the production build passed.
- The map interaction suite passed 28/28 cases across 1024x768, 1280x800, 1366x1024, and touch
  768x1024. It proves minimum target size, target separation, full call-sheet non-occlusion, loaded
  subject images, and distinct World `callSubjectAsset` resolution.
- The deterministic visual suite passed 36/36 cases across the same viewport matrix. Original-size
  review covered all four progression seeds, Hungarian and English call sheets, portrait and
  landscape composition, the formerly obscured Farm landmark, and dense all-complete call lists.
- Qualified production media remains only in the ignored `content/base/assets/` materialization tree
  and is bound by the tracked lock. No production media binary is committed. The six location
  backgrounds listed below remain deliberately outside that lock until their owning E007 stories.

The evidence above predates the closure commit and is not final qualification evidence for the
v0.5.0 candidate. The exact-head aggregate gate, fresh epic audit, media-complete build, and live
walkthrough below must pass before merge approval; none is implied by this record.

## Exact-head live inspection matrix

### Carried media inventory

| Dependency                              | State in M4                           | Exact future owner | Required inherited evidence                                                                                               |
| --------------------------------------- | ------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `effects.ambience.rescue-center`        | semantic cue; silent default service  | E006-S07           | HU/EN `map,progression,replay`; mouse/touch; every supported viewport; listening, mute/channel, unlock, repeat/overlap QA |
| `effects.ambience.garden`               | semantic cue; silent default service  | E006-S07           | same inherited map matrix and audio QA                                                                                    |
| `effects.ambience.forest`               | semantic cue; silent default service  | E006-S07           | same inherited map matrix and audio QA                                                                                    |
| `effects.ambience.farm`                 | semantic cue; silent default service  | E006-S07           | same inherited map matrix and audio QA                                                                                    |
| `effects.ambience.pond`                 | semantic cue; silent default service  | E006-S07           | same inherited map matrix and audio QA                                                                                    |
| `images/map/forest-map.png`             | `r2-pending`; candidate evidence only | E007-S03           | Forest `map,progression,replay` plus E007-S08 full playthrough                                                            |
| `images/missions/forest/background.png` | `r2-pending`; candidate evidence only | E007-S03           | Forest Rescue/replay plus E007-S08 full playthrough                                                                       |
| `images/map/farm-map.png`               | `r2-pending`; candidate evidence only | E007-S04           | Farm `map,progression,replay` plus E007-S08 full playthrough                                                              |
| `images/missions/farm/background.png`   | `r2-pending`; candidate evidence only | E007-S04           | Farm Rescue/replay plus E007-S08 full playthrough                                                                         |
| `images/map/pond-map.png`               | `r2-pending`; candidate evidence only | E007-S05           | Pond `map,progression,replay` plus E007-S08 full playthrough                                                              |
| `images/missions/pond/background.png`   | `r2-pending`; candidate evidence only | E007-S05           | Pond Rescue/replay plus E007-S08 full playthrough                                                                         |

These dependencies are absent from the M4 media-complete claim. Their future owning stories must
replace each `r2-pending`/silent state with an exact R2 object key and digest lock and retain the
specified evidence. The ignored image candidates under `artifacts/asset-candidates/epic-004/` are
review inputs only; they are not qualified production media.

- Journeys: `map`, `progression`, and `replay`.
- Seeded states: new save, post-tutorial, three Rescue completions, and all complete.
- Locales: Hungarian and English.
- Input: mouse and touch.
- Viewports: 1024x768, 1280x800, 1366x1024, and 768x1024.
- Required M4 production media: every object in the base-pack materialization lock. The carried
  dependencies above are explicitly excluded from M4 qualification and remain mandatory for their
  named owning stories.
- Visual checks: no unexpected placeholder or fallback, watermark, baked text, clipping, overlap,
  obscured target, loading failure, console error, or unhandled rejection.

The passing provider record must name the exact candidate SHA, v0.5.0, browser, full matrix, artifact
digest, asset-inventory digest, evidence paths, inspector, timestamp, findings, and final result. The
epic remains `In progress` until that retained record, required hosted checks, and explicit user merge
approval exist.
