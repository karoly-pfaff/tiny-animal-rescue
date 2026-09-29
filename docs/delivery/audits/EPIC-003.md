# EPIC-003 independent audit and evidence index

This record retains the High and Medium audit findings, their dispositions, and the local
prequalification evidence for M3. The authoritative ADR-0012 pass record is the provider-backed
pull-request comment and its non-expired qualification artifact because that record can bind the
immutable pull-request head without changing it.

## Canonical story commits

| Story    | Commit                                     | Outcome                              |
| -------- | ------------------------------------------ | ------------------------------------ |
| E003-S01 | `f1803c6c9a8a41304769a718d9c027f8ce461c45` | Mission-step lifecycle               |
| E003-S02 | `098fceeb5924b2a7ae6189de694a29ebda451cc0` | Production tap/remove                |
| E003-S03 | `5e26fafcc78ac7a83e910ad7496c8c2dd783e45c` | Production drag-to-target            |
| E003-S04 | `62e590ff379cb3fd878772685d0586a3469ece2d` | Production wipe/clean                |
| E003-S05 | `423aeba481751de843b3a2b34ab6b3fc7b492aa2` | Production match                     |
| E003-S06 | `5873fd7988a5cb33912b4fb373eb7c14d01ffffe` | Production trace                     |
| E003-S07 | `a320e3fcc785361261d36760fa27ce31e1eafd63` | Shared guidance ladder               |
| E003-S08 | `f6b9c63038117e8e79589fe1bc9508fc7cca2d39` | Primitive demonstration and evidence |
| E003-S09 | `707af7f1ba64824079a9084d1bdc8c66ce459cb7` | Exact owner-session merge execution  |

## Independent audit disposition

- The engine/interactions review found one High issue: an active drag, tap, or match pointer could
  remain captured across a lifecycle pause. The shared pointer-capture contract now releases active
  capture, rejects paused pointer and keyboard completion, and accepts fresh input after resume. Unit
  and real-browser regressions cover the mid-pointer pause/resume boundary. Round two verified the fix
  and found no new High issue.
- The UI/audio/accessibility review found one High issue: Mimi disappeared during the 650 ms reward
  persistence interval. Mimi now remains visible as a non-interactive rescue animation throughout the
  wait. Unit, browser, and four-viewport visual regressions cover the state. Round two verified the fix
  and found no new High issue.
- The visual-contract review found one High issue: a global downsampled perceptual hash could accept a
  material visual regression. The gate now compares reviewed decoded-pixel signatures with explicit
  mean-difference and changed-channel limits, while the generator requires the complete enumerated
  52-contract screenshot matrix. Negative tests prove that material and unreviewed changes fail. Round
  two verified the fix with no unresolved High or Medium finding and no new High issue.
- The cross-domain review found two High issues and one Medium issue: the production player did not yet
  own the exhaustive five-primitive renderer seam; the backlog claimed `Done` before qualification;
  and trace movement reset guidance without progress, ignored escalated tolerance, and did not classify
  a no-progress release as a wrong action. The candidate now routes the Rescue mission and contract
  fixture through one exhaustive renderer, keeps the epic in progress until qualification passes, and
  applies trace tolerance, activity, and wrong-action behavior through the shared guidance contract.
  Round two verified the renderer and status fixes and caught one remaining unconditional trace
  activity notification. That notification was removed and the focused trace suite passed 6/6. The
  independent loop ended at its two-round policy limit, so no third self-audit is claimed.
- The owner-session merge review found three High issues in round one: a dirty candidate checkout could
  change evidence metadata; caller-supplied evidence could be trusted without independent provenance;
  and a bypass-capable merge was not protected by an atomic provider guard. The implementation now
  requires clean trusted and candidate checkouts, downloads and independently verifies the exact
  provider artifact, removes all main-ruleset bypass actors, and uses the required authorization status
  as the provider-enforced merge lease. Round two verified all three remedies and found one new High:
  the non-inspected owner path could run candidate package scripts with the owner's authenticated
  environment. Owner-session execution is now restricted to the already inspected/provider-qualified
  path; non-inspected work remains hosted-executor-only. Governance fixtures cover dirty, fabricated,
  stale, unverified, race, and non-inspected-owner rejection. Per policy, this new High was fixed after
  round two without starting a prohibited third round.

## Local prequalification

- Provider reproduction exposed evidence-harness portability faults rather than product regressions:
  a substring role locator could match two tap targets, while Windows and Linux rendered runtime text
  glyphs differently under one platform-neutral baseline name. The locator is now exact. The Windows
  required-quality job owns the cropped interaction-surface baseline; the Linux media job still
  exercises every primitive state and viewport assertion without re-comparing that OS-owned fixture.
  Media-complete signatures suppress runtime text glyphs and hide the text-sized celebration controls
  while preserving the complete production-art scene. The ordinary Windows visual suite plus
  localization and accessibility checks retain runtime-text coverage. The four-viewport trace
  regression passed 4/4, and the reviewed media-complete signature generator accepted the exact
  52-contract matrix before the complete gates ran.
- `npm run validate:media` passed on the post-audit product tree: 52/52 reviewed media-complete visual
  contracts passed across 1024x768, 1280x800, 1366x1024, and touch 768x1024 projects. Artifact
  validation covered 22 files with SHA-256
  `1fd380a2a76c5637cf09e74f9da5a09edf2fe4844ab216ba36fb2f59e9ab7c61`.
- The nine inherited base-pack production images were present only in the ignored
  `content/base/assets/` tree and matched their materialization lock. No production media binary is
  committed.
- The production preview was opened in headed Chromium. The Hungarian first-rescue journey was
  completed with mouse input at 1024x768 through start, map, ladder placement, Mimi rescue,
  celebration, and shelter. The English touch layout and guidance journey was inspected at 768x1024.
  The 1280x800 and 1366x1024 mission and shelter states were inspected full-size from the same
  production build output. Browser console errors and warnings were both zero.
- Inspection found no unexpected placeholder or fallback, watermark, baked text, clipping, overlap,
  obscured target or drag path, loading failure, console error, or unhandled rejection. The localized
  guidance and reduced-motion alternatives remained visually clear.

The final pull-request qualification reruns the complete gate on the immutable pushed head and records
the exact candidate SHA, `v0.4.0`, browser, full matrix, artifact digest, asset-inventory digest,
evidence paths, inspector, timestamp, findings, and result outside the candidate tree.

## Accepted carry-forward

- The localized browser-voice fallback remains until E006-S07 supplies production music, effects, and
  Hungarian/English voice files. M3 does not claim production audio complete.
- Under ADR-0013, wipe/clean, match, and trace use the production lifecycle in the contract-only fixture
  but have no hidden shipped mission. E007-S08 must inspect all five primitives through real localized
  content before EPIC-007 can close.
