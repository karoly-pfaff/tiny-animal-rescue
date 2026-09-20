# AGENTS.md

This file is the operational contract for Codex and other implementation agents working on Tiny Rescue.

## Mission

Build a small, complete, kind, reliable game for children aged 3–4. Prefer a polished, understandable core loop over breadth. The v1.0 content list is fixed unless the user explicitly changes it.

## Read before changing code

For any non-trivial task, read:

1. `README.md`
2. `docs/intent.md`
3. `docs/product/v1-scope.md`
4. `docs/architecture/overview.md`
5. the ADR index and every ADR relevant to the task
6. the target epic and its dependency epics
7. `docs/delivery/code-quality.md`
8. `docs/delivery/quality-gates.md`
9. `docs/delivery/git-workflow.md`
10. `docs/delivery/story-commit-workflow.md`

For content work, also read `docs/architecture/content-contracts.md`, `docs/product/content-catalog.md`,
and the repo-local `tiny-rescue-mission-authoring` skill.
For any generated or edited asset, also read the asset prompt pack at `prompts/README.md`. For visual
asset or presentation work, additionally read the repo-local visual-production skill and
`screens/README.md`. For music or effect production, additionally read `prompts/catalog.md` and
`prompts/integration.md`.
For validation, review, milestone closure, or release qualification, also read the repo-local
`tiny-rescue-validation` skill.
For milestone, compatibility, or release work, also read `docs/delivery/versioning.md`.

## Non-negotiable product rules

- Target age is 3–4; the main flow must not require reading.
- No timer, score, lives, game over, punishment, streak, loot box, advertisement, or manipulative retention mechanic.
- A wrong action is reversible: reject gently, return the object, and provide a clearer hint after repeated hesitation.
- Every required instruction must be available as audio and must not rely on color alone.
- Text inside generated or painted scene assets is forbidden. UI text is rendered at runtime.
- Hungarian and English must remain feature-equivalent.
- The player can repeat completed missions.
- Shelter interactions never create obligation, decay, illness, hunger, or guilt.
- v1.0 is complete at 16 missions and 12 residents. Expansion capability does not authorize extra scope.

## Architecture rules

- Use React, TypeScript, and Vite for the application shell.
- Use DOM/SVG for menus, map, shelter, and ordinary drag/tap interactions.
- Use a small canvas layer only for interactions that truly require per-pixel input, initially wipe and trace.
- Keep content data outside engine code and validate it at build time.
- Engine packages may not import a concrete base-game mission or animal by ID.
- Content packs may declare content but may not register arbitrary executable code.
- Runtime state stores identifiers and progress, never duplicated content definitions.
- Resolve all asset paths through the content resolver; do not hard-code public URLs in components.
- Persist only versioned, migration-capable save data.
- Prefer explicit discriminated unions and exhaustive switches over loosely typed maps.
- A new interaction type requires an ADR or an explicit amendment to ADR-0003.

## Suggested source layout

```text
sources/
  app/                 # application bootstrap and routes
  engine/              # mission runtime and step orchestration
  interactions/        # reusable interaction primitives
  content/             # discovery, validation, normalization, resolver
  shelter/             # shelter presentation and resident interactions
  audio/               # narration/effects orchestration
  i18n/                # locale loading and runtime strings
  persistence/         # save schema, repository, migrations
  ui/                  # shared accessible presentation components
  styles/
content/
  base/
    pack.json
    animals/
    missions/
    locations/
    shelter-areas/
    assets/
tests/
  unit/
  integration/
  content/
  e2e/
```

Repository convention: generated output belongs in `build/`; authored source belongs in `sources/`; packaging/deployment material belongs in `deploy/`.

## Execution protocol

1. Identify the backlog item and restate its acceptance criteria in the working plan.
2. Inspect existing implementation and tests before modifying files.
3. Implement the narrowest complete vertical behavior.
4. Add or update automated tests at the same time as production code.
5. Run the smallest relevant test suite, then `validate:quick`; run `validate:full` before merge or
   an ordinary epic completion, and `validate:release` for M7, M8, M9, and GA promotion.
6. Update docs, schemas, examples, backlog status, and version evidence if the contract changed.
7. Dispatch the independent audit required below and resolve its actionable findings.
8. Before starting the next story, normalize the epic branch to exactly one canonical commit for the
   completed story and update the pull-request story/commit map.
9. Report what changed, what was verified, and any remaining risk or declined finding.

Do not silently reinterpret acceptance criteria. If two documents conflict, precedence is:

1. accepted ADR
2. product v1 scope
3. epic acceptance criteria
4. architecture narrative
5. examples

Raise the conflict instead of choosing whichever interpretation produces less work.

## Independent self-audit

Before handing over a non-trivial change, dispatch a fresh-context, read-only subagent to review the
diff. The implementing agent may not substitute its own same-context review.

An audit is required for production/test code, tool or CI configuration, schemas, content contracts,
non-trivial content, and normative product/architecture/delivery documents. Typo-only or link-only
documentation changes may skip it. If a change materially spans independent domains, use one reviewer
per domain when concurrency permits; relevant review domains are engine/interactions, content/i18n,
persistence/progression, and UI/audio/accessibility.

Give the reviewer only:

- the diff under review;
- the applicable epic, dependency epics, ADRs, and contracts in full;
- `docs/delivery/code-quality.md` and the review checklist at its end;
- the relevant verification output.

Do not prime the reviewer with implementation intent or a defense of decisions. The reviewer reports
findings only, each with severity, exact file/line, violated rule, consequence, and concrete remedy.

- **High** means incorrect, unsafe, scope-breaking, contract-breaking, data-losing, or unverified
  behavior. Fix it or stop and escalate to the user.
- **Medium** means likely rework or misleading ownership, coupling, abstraction, naming, test, or
  documentation. Fix it or explicitly decline it with a one-line rationale in the handoff/PR.
- **Low** is taste and is omitted entirely.

The loop is bounded to two rounds. Round one reviews the diff; round two may only verify that round-one
High/Medium findings were resolved, except for a new High introduced by a fix. If the actionable count
does not fall, stop and escalate rather than starting a third round. Rerun affected gates after fixes.
If no independent agent is available, disclose that the required audit is outstanding; do not
self-certify it as complete.

## Definition of done for every backlog item

- Acceptance criteria are demonstrably satisfied.
- `validate:quick` passes; `validate:full` passes when the change is merge- or ordinary
  milestone-ready; `validate:release` passes for M7, M8, M9, and GA promotion.
- The independent audit has no unresolved High finding and every Medium is fixed or explicitly
  declined.
- New content passes schema, reference, ownership, localization, and asset validation.
- Required interactions work with touch and mouse simulation.
- The 1024×768 reference viewport remains usable; the supported viewport matrix is not regressed.
- No unlocalized player-facing string is introduced.
- No new console error or unhandled promise rejection occurs in the happy path.
- Documentation is updated when public behavior or a contract changes.
- Scope outside the item is not bundled in as speculative infrastructure.
- No warning, skipped/focused test, unexplained suppression, dead export, qualifying duplicate, or
  unowned TODO is introduced.

## Testing expectations

- Unit test pure state transitions, validators, hint timing, and persistence migrations.
- Integration test content loading, mission progression, completion rewards, and reload.
- E2E test only high-value player flows and critical viewport/touch behavior.
- Content validation is a release gate, not a best-effort warning.
- Use deterministic clocks and seeded randomness in tests.
- Do not approve visual changes solely from DOM assertions; capture and inspect reference screenshots.

## Content authoring rules

- IDs use lower-case kebab-case and never change after release.
- Names, narration, and text use localization keys, not inline strings.
- Every mission has 2–4 required steps in v1.0, except the ADR-0003-approved single continuous
  trace-only mission.
- Each step uses one of the accepted interaction types.
- A Rescue mission unlocks exactly one resident and is the only mechanism that does so.
- Help and World missions do not increase shelter capacity.
- An animal belongs to exactly one shelter area.
- Base content must not reference assets owned by another content pack.
- Decorative objects must never obscure a required target or safe drag path.
- Do not add generated text to backgrounds, signs, buttons, or mission art.

## Change control

Create or amend an ADR before implementing any change to:

- the technology baseline
- executable content policy
- interaction type set
- persistence shape or migration policy
- content pack boundaries
- localization asset rules
- child-safety or privacy posture
- the required quality-gate families, their enforcement ownership, or the independent-audit policy
- the one-epic/one-milestone/one-minor version sequence

Record rejected alternatives and consequences. Do not mark an ADR accepted retroactively after implementation.
