# Git and pull-request workflow

The repository uses one protected long-lived branch, short-lived epic branches, one pull request per
epic, and squash merges. `main` is always releasable; it is not an integration scratchpad. The exact
story-commit history contract is defined in the
[story commit workflow](story-commit-workflow.md).

## Branches

- Nothing reaches `main` by direct push, force push, merge commit, or unreviewed administrator bypass.
- Start each epic from current `main` and use `epic/<three-digit-id>-<short-kebab-title>`. A
  non-epic patch or contract correction uses `fix/`, `docs/`, `chore/`, `refactor/`, or `test/` and a
  separately scoped backlog item.
- One epic branch owns only that epic. Split independent product, refactor, dependency, and formatting
  work instead of hiding it in a story.
- Keep the epic branch current by rebasing onto `main`; do not merge `main` into it. Force-push only
  the personal epic branch and only with lease, then rerun invalidated checks.
- Delete the branch after merge. Never reuse a merged branch for unrelated work.

## Commits and squash merge

Working commits may be incremental during a story, but before the next story begins they are folded
into exactly one canonical story commit. At epic completion, the pull-request title becomes the
single epic commit on `main`.

- Follow Conventional Commits 1.0.0 with the exact story or epic ID as mandatory scope, imperative
  lower-case description, no trailing period, and a subject no longer than 72 characters.
- The body explains the constraint, reason, rejected alternative, migration, or follow-up that cannot
  be reconstructed from the diff. Do not narrate the file list.
- Do not mix generated output without its source, a schema without its runtime type/test, or a version
  bump without its release evidence.
- Do not add any watermark or automated-authorship signature. This includes tool/agent/editor credit,
  promotional text, injected branding, or fabricated co-author/reviewer trailers in commits, pull
  requests, source, docs, release material, media, metadata, or artifacts. Required legal notices and
  internal provenance records are not attribution watermarks.
- Use subjects `<type>(E<epic>-S<story>): <imperative summary>` for story commits and
  `chore(EPIC-<id>): close milestone M<milestone>` for the optional non-behavioral closure commit.
- Squash merge only after the final epic branch head has every required status check and review.

## Pull-request contract

The epic pull-request description is exactly the deterministic squash crosswalk defined by the
[story commit workflow](story-commit-workflow.md). It contains the epic/milestone/version, canonical
PR identity, every story's full commit SHA, optional closure SHA, aggregate gate, evidence digest,
and release footer. Acceptance criteria, ADR/compatibility impact, commands, manual/visual evidence,
audit disposition, and known risks live in the linked backlog/audit records, check summaries, and PR
conversation. Keeping those outside the description lets merge automation copy the already validated
description verbatim into the squash commit.

Review the complete diff before opening the pull request. Resolve unrelated changes and accidental
generated/build output rather than asking a reviewer to ignore them. A draft epic PR may open after
the first canonical story commit; this final-diff review is required before marking it ready.

## Required checks and merge safety

The stable required checks are defined in [quality gates](quality-gates.md#continuous-integration-contract).
They run for pull requests, merge-queue candidates when enabled, and `main`. A required check is valid
only for the latest reviewed commit.

- Required workflows are not skipped by path or commit-message filters.
- Review approval is dismissed when code changes after approval.
- Merge requires the branch to be current with the protected base or validated through the merge
  queue.
- Repository settings enable squash merge only. Validated automation supplies the exact linted PR
  title and deterministic squash body; interactive message editing, merge commits, and rebase merges
  are disabled or forbidden.
- A cancellation, timeout, neutral result, empty test collection, or retry-only pass does not satisfy
  the evidence contract even if the host UI labels it successful.
- Emergency bypass requires explicit user authorization, a recorded reason, and an immediate follow-up
  patch that restores the normal gate. It never moves or replaces an existing release tag.

The checked-in provider configuration and reconciliation procedure are in
[repository governance](repository-governance.md).

## Dependency updates

Automated update pull requests are notifications, not auto-merge authority. A contributor reads the
upstream release/security notes, checks license and runtime/browser requirements, updates through the
package manager, inspects the lockfile diff, and runs `validate:full`.

- Security fixes are prioritized but do not bypass regression checks.
- Major updates are isolated from feature work and include migration notes.
- Overrides/forks record the affected transitive path, advisory or incompatibility, owner, and removal
  condition.
- A lockfile-only change with no reviewed manifest/reason is not merge-ready.

## Milestones and releases

Follow [versioning](versioning.md). Candidate qualification runs on the final epic branch; publication
runs only from protected `main` and must:

1. run a clean frozen install and the applicable aggregate gate on the exact closure head:
   `validate:full` through M6, and `validate:release` for M7, M8, M9, and GA promotion;
2. validate the proposed squash title/body, then merge only through squash automation;
3. verify protected `main` contains the exact candidate tree and a valid squash crosswalk;
4. verify requested SemVer equals root `package.json` and bundled base-pack version and the annotated
   `vX.Y.Z` tag does not already exist;
5. build once from the exact verified squash SHA and record artifact digest, reports, notes, and
   provenance without creating a tag;
6. generate and lint release notes and the complete annotated-tag message including that digest, then
   create the local unpushed tag targeting the same squash SHA;
7. run tag/history validation against those final inputs, push the immutable tag only after it passes,
   and verify the remote tag identity.

A failed or withdrawn release is followed by a new patch. Tags and published artifacts are never
mutated in place.
