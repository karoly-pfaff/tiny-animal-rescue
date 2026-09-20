---
name: tiny-rescue-validation
description: Validate Tiny Rescue implementation stories, content changes, visual assets, milestones, or release candidates against their acceptance criteria, contracts, ADRs, and quality gates. Use for explicit reviews and completion checks; do not use as permission to expand scope or silently repair unrelated findings.
---

# Tiny Rescue Validation

Produce evidence-backed validation tied to the requested scope.

## Establish the target

Identify whether the request concerns a story, epic, content item, visual asset, milestone, or release. Read:

1. `AGENTS.md`
2. the target backlog item and its dependencies;
3. every ADR referenced by that item;
4. the relevant contract or product document;
5. `docs/architecture/testing-strategy.md`;
6. `docs/delivery/quality-gates.md`.

For milestone or release validation, also read `docs/delivery/versioning.md`. For generated or edited
asset review, follow `prompts/README.md` and the matching branch QA guidance. For release validation,
also read `docs/delivery/release-checklist.md` and, for GA, `docs/delivery/ga-promotion.md`. For image
review, invoke or follow the Tiny Rescue visual-production QA reference rather than inventing separate
art rules.

## Validate in layers

Use [references/validation-matrix.md](references/validation-matrix.md) to select checks. Prefer the smallest set that proves the target, then run the epic or release gate when the request requires it.

1. Inspect the implementation and current changes before running commands.
2. Map every acceptance criterion to observable evidence.
3. Run deterministic contract and automated checks.
4. Inspect screenshots or rendered outputs when visual behavior matters.
5. Separate blockers from non-blocking risks and optional polish.
6. Do not mark work complete when a required check was skipped or could not run.

Do not change files during a review-only request. If the user asked to implement and validate, fixes may stay within the authorized story scope.

## Classification

- **Pass:** criterion is satisfied with evidence.
- **Fail:** criterion is contradicted by implementation or a failing required check.
- **Blocked:** required evidence cannot be obtained because a dependency, asset, environment, or decision is missing.
- **Not applicable:** criterion genuinely does not apply; explain why.

Warnings and optional improvements do not convert a pass into a failure unless a binding document makes them required.

## Guardrails

- Accepted ADRs outrank narrative examples.
- Do not weaken or delete a test merely to obtain a green result.
- Do not treat schema validity as proof of semantic or preschool usability.
- Do not treat DOM assertions as visual approval.
- Preserve user changes and report unrelated failures separately.
- Never invent results for commands, playtests, devices, or assets not inspected.

## Report

Use [references/report-template.md](references/report-template.md). Lead with the conclusion, cite failing acceptance criteria precisely, list commands/evidence, and state the smallest next action for every blocker.
