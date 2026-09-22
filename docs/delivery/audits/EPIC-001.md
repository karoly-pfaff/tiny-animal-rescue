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

## E001-S02 — Minimal Garden map entry

- Round 1 found five Medium issues: the shelter control opened an unfinished dead end; protected exit
  did not fully distinguish pointer identity or provide keyboard and assistive-technology activation;
  the Garden marker lacked a recognizable animal portrait; mission and hold-state visual evidence was
  missing; and the approved prompt cited a nonexistent reference filename.
- The fixes made the shelter a truthful, non-interactive landmark until its story is implemented;
  limited hold-to-exit to one primary pointer with cancellation and pointer capture; preserved an
  explicit keyboard/assistive-technology path; added a code-native kitten portrait; added Hungarian
  mission and English hold-state baselines across all four viewport projects; and corrected the prompt
  reference to `screens/02-map-screen-en.png`.
- Unit coverage exercises successful hold, early release, cancellation, right-click, second-pointer,
  keyboard, and assistive-technology activation. Browser coverage proves the map-to-mission journey and
  protected exit in mouse and touch projects. The twelve new Map/Mission baseline images were inspected
  at full size.
- Production map and start PNGs remain ignored and untracked under ADR-0010. Git retains the logical
  inventory entry, approved prompt provenance, code-native fallback, and visual-regression evidence.
- Final gate evidence: `npm test` passes 45/45 with 96.15% statement and 90.24% branch coverage;
  `npm run test:e2e` passes 20/20; `npm run test:visual` passes 24/24; and `npm run validate:quick`
  passes formatting, lint, duplication, dead-code, documentation, repository policy, type checking,
  content, asset, accessibility, secret, watermark, and build checks.
- Round 2 verified all five corrections and found no High or Medium regression.
- Disposition: every finding is fixed; no finding is declined or unresolved.

## E001-S03 — Ladder drag step

- Round 1 found four Medium issues: the decorative ghost hand could intercept pointer input; target
  pulsing began before the idle guidance state and normal-motion movement lacked browser evidence;
  pointer cancellation, lost capture, and active multi-pointer branches lacked regressions; and the
  localization validator's temporary `style` exemption was too broad.
- The fixes made the ghost hand pointer-transparent and proved drag completion while guidance is
  active. Target pulsing is now gated by the four-second guidance state. A normal-motion Playwright
  flow uses the fake clock for the idle threshold and deterministic Web Animations timeline samples
  to prove start-to-target motion, while the reduced-motion visual matrix remains in place.
- Unit regressions now cover pointer cancel, lost pointer capture, release, and rejection of a second
  pointer while the primary pointer remains authoritative. The localization gate no longer exempts
  `style`; a failing `style-copy` fixture proves CSS-generated player copy is rejected.
- The generic drag primitive uses normalized coordinates, a visible 48-pixel finger offset, pointer
  capture, a large target, one-shot completion, and a transition back to its start point without
  negative feedback. The code-native ladder and guidance visuals require no production media binary.
- Final gate evidence: `npm test` passes 54/54 with 96.32% statement and 92.5% branch coverage;
  `npm run test:e2e` passes 28/28 across mouse and touch projects; `npm run test:visual` passes 32/32;
  and `npm run validate:quick` passes all formatting, lint, duplicate/dead-code, documentation,
  repository, type, content, asset, accessibility, secret, watermark, and build gates.
- Round 2 verified every Round-1 correction and found no High regression.
- Disposition: every finding is fixed; no finding is declined or unresolved.

## E001-S04 — Mimi tap and rescue completion

- Round 1 found three High and two Medium issues: the second step lacked audio-first guidance; the
  celebration used the wrong semantic cue and had no R2 narration path; Mimi-specific content IDs
  lived inside the engine layer; the completion lifecycle could navigate after unmount; and the
  auditor treated the user's untracked future voice-pack files as story scope.
- The fixes narrate the localized `help-mimi-down` instruction as soon as the ladder unlocks Mimi,
  use the mission-success cue for celebration, and resolve both cues to locale-specific R2 object
  keys. Browser speech remains an explicit development fallback while the externally delivered
  voice assets are pending; no production media binary enters Git.
- Mimi-specific reward composition now lives at the application boundary instead of the reusable
  engine layer. Mission completion cancels its motion lifecycle on unmount and ignores late reward
  success or failure, with a regression test proving that stale navigation cannot occur.
- The voice-pack scope finding is declined: `prompts/voice/**` is user-authored, untracked work that
  predates and remains outside this story's staged diff. It is preserved unchanged for a later
  dedicated integration story.
- Round 2 found one High issue: React StrictMode's setup-cleanup-setup probe left the completion
  lifecycle inactive, so successful development-mode rescues could omit celebration. Effect setup
  now reactivates the lifecycle, and a StrictMode-wrapped regression proves completion still calls
  celebration exactly once. The two-round audit limit is exhausted; the post-audit fix passes the
  affected lint, type, and unit gates.
- Final story-gate evidence: `npm test` passed 69 tests with 95.28% statement and 89.41% branch
  coverage; `npm run test:e2e` passed 32/32; `npm run test:visual` passed 36/36;
  and `npm run validate:quick` passed formatting, lint, duplication, dead-code, documentation,
  repository, type, content, asset, accessibility, secret, watermark, and build gates. The bounded
  post-audit StrictMode fix additionally passes 7/7 focused mission unit tests.
- Disposition: every in-scope Round-1 finding and the Round-2 High are fixed. The only declined item
  concerns preserved user-owned files outside the story diff; no production media is tracked.

## E001-S05 — Minimal persistence and shelter proof

- Round 1 found one High issue: any IndexedDB load rejection was treated as corrupt data, while the
  repository could still create a new empty save. A transient storage failure could therefore allow
  the next rescue to overwrite a valid but temporarily unreadable save.
- The fix separates recoverable corrupt content from unavailable storage. The repository marks itself
  non-writable before every load and permits updates only after a successful valid, missing, migrated,
  or deliberately recovered load. Storage failures block the child flow behind a localized HU/EN
  screen with an explicit retry action; corrupt records are still quarantined atomically on the next
  successful write.
- Regression coverage proves that unavailable storage and failed reads reject writes without changing
  the existing record, retry restores the player route after a transient error, corrupt data recovers
  safely, completion survives reload, replay rewards remain idempotent, and Mimi appears and reacts in
  the Indoor Room. The storage-failure screen is included in accessibility checks.
- Round 2 verified the storage-authority fix and found no remaining High or Medium issue.
- Final story-gate evidence: `npm test` passed 92 tests with 95.19% statement and 87.86% branch
  coverage; `npm run test:e2e` passed 36/36; `npm run test:visual` passed 40/40; and
  `npm run validate:quick` passed formatting, lint, duplication, dead-code, documentation, repository,
  type, content, asset, accessibility, secret, watermark, and build gates.
- The user-owned `prompts/voice/**` pack remains untracked and outside S05. No production media binary
  is included; the four new shelter PNGs are versioned visual-regression evidence only.
- Disposition: the Round-1 High is fixed and the bounded Round-2 audit passed. No finding is declined or
  unresolved.

## E001-S06 — Vertical-slice E2E proof

- Round 1 found one Medium issue: the touch project used touch for the ladder drag and Mimi action, but
  Play, mission selection, and subsequent navigation still used Playwright's generic click. The tests
  therefore did not prove an entirely pointer-driven touch journey.
- The shared HU/EN rescue helper and both full happy paths now use the primary touch or mouse pointer for
  every child action: Play, mission selection, Mimi, Shelter, the shelter reaction, Map, and replay.
  The ladder continues to use the matching touch or mouse drag implementation.
- Both locales complete the rescue in all four viewport projects, reload the persisted celebration, and
  show Mimi in the Indoor Room. Browser console warnings/errors and page errors are collected for each
  full journey and remain empty.
- The reviewed 1024×768 baselines cover Start, Map, the initial ladder step, the placed-ladder/Mimi step,
  Celebration, and Shelter. The same visual suite passes in the touch portrait and both larger landscape
  projects.
- Round 2 verified the pointer-driven correction and found no new High or Medium issue.
- Final story-gate evidence: `npm test` passed 92 tests with 95.19% statement and 88.23% branch coverage;
  `npm run test:e2e` passed 40/40; `npm run test:visual` passed 40/40; and
  `npm run validate:quick` passed formatting, lint, duplication, dead-code, documentation, repository,
  type, content, asset, accessibility, secret, watermark, and build gates.
- Disposition: the Round-1 Medium is fixed and the bounded Round-2 audit passed. No finding is declined or
  unresolved.

## E001-S07 — Voice prompt and runtime contract

- Round 1 found two High and three Medium issues. The bilingual pack omitted the required
  `farm-piglet-mud-wash` basin-fill instruction while spending two cues on a trace-only turtle step;
  the gate trusted matching locale inventories without an external canonical ID contract or complete
  R2-key collision check; first-rescue runtime records lacked ownership, role, narrator, duration,
  license, and provenance metadata; clean-output validation inspected policy prose but not exact
  spoken text; and the first tightened policy regex falsely rejected valid Markdown-wrapped bans.
- The prompt inventory now keeps 115 lines per locale by treating the turtle trace as one continuous
  `follow-path` step and adding the piglet's distinct `fill-wash-basin` step before `wash-piglet`.
  `canonical-ids.json` fixes the complete ordered semantic contract independently of localized text.
  Every HU and EN line derives a safe locale-specific R2 object key and the gate rejects collisions.
- Runtime metadata now records base-pack ownership, required-instruction or mission-success role,
  primary narrator role, 0.4–2.5 second duration bounds, approved prompt QA, explicitly not-produced
  audio QA, pending production license/provenance, and `r2-pending` delivery. No recording or other
  production media binary is tracked; manifests and prompt/provenance inputs alone enter Git.
- Clean-output validation normalizes Markdown whitespace before proving that every governing document
  forbids audible watermarks and generator/service branding. It separately rejects obvious generator,
  service, promotional, watermark, and URL preambles in exact spoken inventory text. Negative fixtures
  prove coherent two-locale ID drift, R2-key collisions, energy parity drift, fallback drift, missing
  metadata, spoken branding, and permissive policy prose all fail.
- The first mission reads localized fallback text and R2 keys from one metadata-only runtime manifest.
  Entering the mission narrates the ladder action, placing it narrates the Mimi action, and celebration
  narrates the mission-success cue. Production recordings will later occupy the declared R2 keys; the
  browser voice remains a development fallback.
- Round 2 verified every correction and found no remaining High or Medium issue. Final evidence:
  `npm run test:voice-prompts` validates 230 localized prompts and three runtime cues;
  `npm test` passes 94/94 with 95.08% statement and 87.59% branch coverage;
  `npm run validate:quick` passes; and `npm run test:e2e` passes 40/40 across the full viewport/input
  matrix.
- Disposition: every Round-1 finding is fixed, the bounded Round-2 audit passed, and no finding is
  declined or unresolved.

## EPIC-001 release audit

- Round 1 found two High and two Medium issues: the hosted history check rejected a non-canonical PR
  body; save migrations had neither their required per-file 100% branch threshold nor two negative
  branches covered; the voice manifest claimed hint pausing and music ducking that M1 did not
  implement; and the schema example, rather than a real base-pack manifest, carried the product
  release version.
- The PR body was replaced by the exact generated squash crosswalk, including full story SHAs and the
  evidence digest. The save schema now has a hard 100% statements, branches, functions, and lines
  threshold, with corrupt v0 and invalid v1 settings regressions proving 37/37 branches.
- The runtime voice contract now declares only the implemented single-voice replacement behavior;
  unknown runtime fields fail a negative fixture. A schema-validated `content/base/pack.json` is the
  bundled pack authority, must match the root product version, and has a version-independent failing
  drift fixture that remains valid before and after the closure version bump.
- Round 2 inspected the rebuilt epic tree and found no remaining High or Medium issue. Focused gates
  passed with 96/96 unit and integration tests, 230 voice prompts plus three runtime cues, exact
  content/base version parity, and 100% save-schema coverage. The complete final-head local and hosted
  gates remain mandatory immediately before merge.
- Disposition: every release-audit finding is fixed; no finding is declined or unresolved. Production
  media remains external and untracked, with only R2 object keys, prompt/provenance inputs, and QA
  metadata versioned in Git.

## Post-release correction — 2026-09-22

The original automated and independent audit results above remain accurate for the behavior and files
they examined, but their visual-completion conclusion is superseded. The `v0.2.0` candidate had no
materialized Mimi production media: the asset inventory covered only the start and Garden map
backgrounds, while mission, celebration, and shelter screens used code-native Mimi fallbacks. Stored
Playwright baselines proved regression stability for those fallbacks, not production-asset
completeness, and no live real-browser product walkthrough was retained on the exact candidate.

[PATCH-001](../../../backlog/maintenance/PATCH-001-v0.2.1-asset-evidence-correction.md), ADR-0011,
and ADR-0012 correct the governing contract and track the product correction as one patch. The
immutable `v0.2.0` tag is not rewritten. Until PATCH-001 supplies the missing Mimi asset set, passes
live qualification, and receives explicit merge/tag approval, `v0.2.0` is behavioral vertical-slice
evidence rather than a visually complete asset-backed milestone.
