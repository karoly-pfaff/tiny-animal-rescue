# Codex delivery workflow

## Purpose

This workflow keeps implementation incremental, reviewable, and aligned with the fixed product scope.

## Starting an epic

1. Read the epic, its dependencies, and referenced ADRs.
2. Confirm that dependency exit criteria are met in the current repository.
3. Confirm its milestone and target product version against
   [versioning](versioning.md); the target is staged only in the two-phase closure and is not earned
   until the validated squash merge and tag.
4. Create a working plan from the epic's ordered stories and verification commands.
5. Identify the smallest end-to-end behavior that can be demonstrated.
6. Record any ambiguity before coding; do not silently invent a new system.
7. Create or continue the single epic branch defined by the
   [story commit workflow](story-commit-workflow.md).

## Story execution

For each story:

1. Write or identify a failing test/validation case.
2. Implement the behavior behind the intended domain boundary.
3. Keep content examples and schemas synchronized with runtime types.
4. Run story-level checks.
5. Run `validate:quick` before handoff and `validate:full` before merge.
6. Dispatch the independent review required by `AGENTS.md`; fix High findings and fix or explicitly
   decline Medium findings.
7. Update the backlog checkbox only after acceptance criteria pass.
8. Note any deliberate deferral in the story rather than hiding it in code comments.
9. Fold WIP/fixup work into exactly one canonical commit for the story before starting the next one,
   and update the epic pull-request story/commit map.

## Two-phase epic close

After all story commits satisfy their criteria at the previous authoritative version, run their
focused checks, audits, and `validate:quick`. Then create the metadata-only closure commit with the
candidate target version/status and run the complete applicable aggregate gate on that exact head.
Only the validated squash merge and immutable tag earn/publish the version; the closure commit alone
does not advance the milestone.

## Vertical-slice rule

EPIC-001 and EPIC-002 must produce a deliberately narrow but real first rescue. Avoid extracting general-purpose frameworks until the kitten mission has exercised them. When EPIC-003 generalizes interactions, preserve the first slice as a regression test.

## Prompt pattern for implementation turns

```text
Implement <story ID and title> from <epic file>.

Read AGENTS.md, the epic, its dependency epics, and all referenced ADRs.
Stay within the story scope. Preserve existing user changes.
Add tests and update contract documentation when necessary.
Run the story checks and the epic quality gate.
Audit the completed diff in a fresh-context subagent under AGENTS.md.
Do not create a new interaction type or executable content behavior.
Report changed files, verification, and unresolved risks.
```

## Prompt pattern for content turns

```text
Add <mission/animal/pack> using the existing content contracts.
Do not modify the engine unless a concrete contract defect blocks the content.
Use only the five accepted interaction primitives.
Provide HU and EN localization keys and audio inventory entries.
Validate schema, references, ownership, shelter capacity, and catalog consistency.
```

## Completion evidence

An epic is complete only when its exit criteria have evidence in the repository: a clean-install
applicable aggregate gate (`validate:full`, or `validate:release` from M7), independent-audit
disposition, validation/coverage reports, approved baselines/playthrough screenshots where relevant,
the production artifact, updated status, and the version/release note required by
[versioning](versioning.md). The epic branch has one canonical commit per accepted story, at most one
non-behavioral closure commit, and is squash-merged according to the
[story commit workflow](story-commit-workflow.md). If a required run failed before passing, retain and disposition its trace,
failure screenshots/video/diffs. “Implemented” without reproducible verification is not complete.

## Independent audit handoff

The implementing context does not review its own reasoning. Give a fresh read-only reviewer the diff,
the active contracts, and verification output without explaining intent. Findings follow the severity
and two-round convergence rules in `AGENTS.md`. After fixes, rerun the smallest affected checks and
then the required aggregate gate. Do not convert an unresolved finding into a silent lint suppression,
test skip, screenshot update, or backlog checkbox.

## Scope control

If an implementation idea is useful but not necessary for the active acceptance criteria:

- place it in the Icebox section of `backlog/README.md`;
- do not add infrastructure for it;
- do not expand the current epic to accommodate it.
