# EPIC-000: Repository and engineering foundation

- Status: Planned
- Milestone: M0
- Target version: `0.1.0`
- Dependencies: none
- ADRs: ADR-0001, ADR-0009

## Outcome

Create a reproducible React/TypeScript/Vite repository with the agreed source layout, strict quality gates, and a responsive application shell that later epics can extend safely.

## Stories

### E000-S01 — Bootstrap application

As a developer, I want a minimal application that starts, builds, and previews so product work has a reliable host.

Acceptance criteria:

- [x] React, TypeScript, and Vite are configured.
- [x] Strict TypeScript options are enabled.
- [x] Authored code lives under `sources/`; build output goes to `build/`.
- [x] Start, Map, Mission, Celebration, Shelter, and Parent Settings routes/screens have typed route definitions and simple placeholders.
- [x] The application works with a relative production base path.

### E000-S02 — Establish code quality commands

- [x] Exact Node and npm versions are pinned and enforced by preflight/CI; `package-lock.json` is
      committed and `npm ci` is the frozen CI/release install.
- [x] Prettier check, typed ESLint with zero warnings/structural limits, jscpd at zero tolerance, and
      Knip dead-code/dependency/cycle checks implement `docs/delivery/quality-gates.md`.
- [x] Strict TypeScript includes the additional indexed-access, optional-property, override, catch,
      fallthrough, and unused-code settings required by the gate contract.
- [x] Every stable script named in the quality-gate contract exists, exits non-zero on findings, and
      runs non-interactively on Windows and CI.
- [x] Narrow lint/import rules enforce the architecture boundaries that already exist at this epic.
- [x] A clean frozen install followed by `validate:quick` succeeds with no warning or suppression.

### E000-S03 — Establish test harnesses

- [ ] Vitest runs a representative unit and DOM component test.
- [ ] Playwright runs a start-screen smoke test against production preview.
- [ ] Browser/preview ports are configurable and cleaned up after tests.
- [ ] Pointer-event helpers exist for mouse and touch-emulated tests.
- [ ] Coverage thresholds start at 90% statements/lines/functions and 85% branches; a deliberate
      critical pure-policy fixture demonstrates the 100% branch override.
- [ ] Empty test/content/browser collection fails instead of reporting a vacuous pass.
- [ ] Required test lanes retain machine-readable coverage, trace, screenshot, and visual-diff
      artifacts on failure.

### E000-S04 — Establish visual and responsive shell

- [ ] A 1024×768 design surface scales without distortion.
- [ ] Safe-area handling exists for landscape and portrait.
- [ ] Reference viewport screenshots are generated deterministically.
- [ ] No player-facing string is hard-coded outside the temporary localization adapter.

### E000-S05 — Add repository guidance

- [ ] `AGENTS.md`, ADR index, document map, and backlog links are correct.
- [ ] A contributor can locate scope, contracts, and quality gates from the root README.
- [ ] Dependency/license policy is documented before production assets are added.
- [ ] The repo-local mission-authoring, validation, and visual-production skills point to the same
      normative contracts rather than restating incompatible rules.
- [ ] Prompt templates, approved prompts, visual QA, and provenance records are versioned authored
      inputs; example screens are explicitly classified as presentation-only references.

### E000-S06 — Establish continuous integration and review governance

- [ ] Pull requests, merge-queue candidates when enabled, and pushes to `main` run the required
      `quality`, `tests`, `browser`, `visual`, `supply-chain`, and `security` checks without skippable
      path filters.
- [ ] Local aggregate commands and CI jobs invoke the same underlying scripts.
- [ ] Branch/ruleset policy forbids direct/force pushes and merging stale, absent, or failing checks.
- [ ] Repository settings permit squash merge only; merge-commit and rebase-merge paths are disabled,
      and automation uses the exact prevalidated squash title/body without interactive editing.
- [ ] A required `history` check enforces one Conventional Commit per accepted story, at most one
      epic closure commit, one canonical PR per epic, the PR story/SHA map, deterministic squash/tag
      crosswalks, and squash-only epic merge structure in explicit branch/PR/queue/main/tag modes.
- [ ] Automated validators reject known AI, agent, editor, tool, metadata, textual, OCR, visual/audio
      fixture, and promotional watermark patterns while preserving required legal notices and internal
      provenance evidence; full-size visual and listening QA own non-mechanical media cases.
- [ ] A fixture proves each non-obvious gate can fail for its target defect.
- [ ] The fresh-context independent-audit protocol in `AGENTS.md` is exercised once and its finding
      disposition is recorded.

## Exit criteria

- `npm ci`, `validate:quick`, and `validate:full` pass from a clean checkout.
- Production preview renders the shell at all supported viewports.
- Required CI checks and retained reports demonstrate the same result as local commands.
- No product system beyond what the epic needs has been prebuilt.

## Verification

```text
npm ci
npm run validate:quick
npm run validate:full
```

Inspect the required CI check set, retained reports, production-preview screenshots at the supported
viewports, and the independent-audit disposition. No EPIC-000 gate may be marked not applicable at
exit.

## Primary risks

- over-scaffolding abstractions before the vertical slice;
- viewport scaling assumptions that later conflict with touch geometry.
