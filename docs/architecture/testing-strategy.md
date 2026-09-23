# Testing strategy

## Goals

Testing protects the small set of engine behaviors, the large set of content references, and the touch-first player flow. The suite should make content additions routine without making harmless visual iteration painful.

## Test pyramid

### Unit

- mission reducer and step transitions
- interaction geometry and tolerance calculations
- hint-state timing
- progression selectors
- reward idempotency
- audio channel arbitration and ducking
- save migrations
- content normalization
- semantic validators

### Content contract

- JSON Schema for every record
- registry assembly
- ID uniqueness and reference resolution
- dependency cycles
- shelter capacity
- localization parity
- asset existence, ownership, type, and metadata
- exact v1 catalog count and required IDs

### Integration

- load pack → select mission → complete steps → persist reward
- restart mid-mission
- unlock resident → render correct shelter area
- switch locale → load correct text and narration
- mute/duck/replay behavior
- invalid save migration and safe recovery

### E2E

Keep a narrow, valuable suite:

1. first launch and HU tutorial rescue
2. EN tutorial rescue
3. reload after rescue and find Mimi in shelter
4. unlock Pond through progression
5. complete one mission for each interaction primitive
6. navigate all shelter areas with 12 seeded residents
7. reset progress through parent gate
8. smoke flow at every supported viewport

### Visual QA

Reference screenshots cover Start, Map, each location style, every interaction primitive, Celebration, and all shelter areas in HU and EN. Mask deliberately animated regions where needed, but never mask primary controls or targets.

At every epic and every player-visible patch closure, the implementer also opens the exact production
preview in a real browser and walks through the affected assembled journeys under ADR-0012. This live
inspection verifies real materialized media and visual coherence; screenshot comparison alone cannot
approve the product.

## Input coverage

Every interaction primitive is tested using Pointer Events. E2E includes touch emulation and mouse fallback. Tests cover cancellation, pointer leaving bounds, secondary pointer input, and navigation/background pause.

## Determinism

- fake clock for hints and animation milestones
- seeded randomness for decorative variation
- no tests depend on narration wall-clock duration
- animations expose stable completion events
- test IDs are reserved for stable domain elements, not styling details

## Coverage and test hygiene

Coverage is a backstop, not a substitute for scenario quality. Global authored-source thresholds and
the 100% branch requirement for critical pure policy modules are defined in the
[quality-gate contract](../delivery/quality-gates.md#unit-and-integration). Every defect fix adds a
regression test that fails without the fix.

Committed focused tests are forbidden. A skip or quarantine must have an owner, tracked removal
milestone, and explicit effect on the active epic; it cannot make an epic gate green. Required browser
checks run without retries, arbitrary sleeps, shared saves, network dependence, or wall-clock audio
assumptions.

## Quality commands

The single authoritative command surface, composition, thresholds, CI job names, exception policy,
and tool references live in [quality gates](../delivery/quality-gates.md#required-commands).
`validate:quick` is the story-development gate; `validate:full` is the merge and ordinary epic gate;
`validate:release` adds exact-catalog and release-artifact rules from M7 onward. CI invokes those same
repository scripts, with the documented provider-hosted CodeQL exception.

## Continuous execution

- Every pull request and push to `main` runs format, typed lint, duplication, dead-code, typecheck,
  unit, integration, coverage, content/assets/accessibility, production build/preview, E2E, visual,
  supply-chain, secret, and static-security lanes.
- Story work runs the smallest affected suite first, then `validate:quick` before handoff.
- Epic completion runs the applicable aggregate gate from a clean frozen install and retains success
  reports, approved screenshot baselines/playthrough evidence, and the production artifact. If a
  required run failed before passing, retain its trace, failure screenshots/video/diffs, and recorded
  disposition as diagnostic evidence.
- After the aggregate gate passes, epic completion synchronizes required production assets, rebuilds
  the exact candidate, opens the production preview, performs the recorded live walkthrough, and fixes
  or explicitly blocks on every visual finding before merge approval is requested.
- A gate that collected no applicable tests or files fails rather than reporting a vacuous success.
- Scheduled or release runs may add browsers/hardware and longer journeys; they never replace the
  pull-request matrix.

## Manual child-flow checklist

Automated tests cannot establish age appropriateness. Before v1.0, observe play with representative children and record:

- whether the first action is discoverable;
- whether drag targets are sufficiently forgiving;
- whether narration is understandable and paced well;
- where adult help is needed;
- whether celebrations are pleasant rather than overstimulating;
- whether a child recognizes rescued residents in the shelter.

Do not record identifiable child data in the project repository.
