# Git and pull-request workflow

The repository uses one protected long-lived branch, short-lived epic branches, one pull request per
epic, and squash merges. `main` is always releasable; it is not an integration scratchpad. The exact
story-commit history contract is defined in the
[story commit workflow](story-commit-workflow.md).

## Branches

- Nothing reaches `main` by direct push, force push, merge commit, or unreviewed administrator bypass.
- Start each epic from current `main` and use `epic/<three-digit-id>-<short-kebab-title>`. A
  non-epic patch or contract correction uses `fix/`, `docs/`, `chore/`, `refactor/`, or `test/` and a
  separately scoped backlog item. That item declares its exact branch, target/related version, commit
  type, aggregate gate, release intent, live-inspection requirement, and inspection journeys when
  applicable so the same history validator can resolve it without an `epic/*` exception. Trusted
  base-branch parser code reads this metadata from the exact read-only candidate checkout; it never
  executes candidate code with authorization credentials.
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
- Squash merge only after the final work-item head has all seven quality checks and exact owner
  approval. The dedicated merge App or the ADR-0016 owner-session command validates live provider
  records and performs the exact squash. Neither executor has a ruleset bypass; raw provider merge
  and direct push remain outside the supported path.

## Pull-request contract

The epic pull-request description is exactly the deterministic squash crosswalk defined by the
[story commit workflow](story-commit-workflow.md). It contains the epic/milestone/version, canonical
PR identity, every story's full commit SHA, optional closure SHA, aggregate gate, evidence digest,
and release footer. Acceptance criteria, ADR/compatibility impact, commands, manual/visual evidence,
audit disposition, and known risks live in the linked backlog/audit records, check summaries, and PR
conversation. Keeping those outside the description lets merge automation use the already validated
description unchanged and append only the immutable merge-approval comment identity to the squash
commit.

Review the complete diff before opening the pull request. Resolve unrelated changes and accidental
generated/build output rather than asking a reviewer to ignore them. A draft epic PR may open after
the first canonical story commit; this final-diff review is required before marking it ready.

## Required checks and merge safety

The stable required checks are defined in [quality gates](quality-gates.md#continuous-integration-contract).
They run for pull requests, merge-queue candidates when enabled, and `main`. A required check is valid
only for the latest reviewed commit.

- Required workflows are not skipped by path or commit-message filters.
- Review approval is dismissed when code changes after approval.
- Merge requires the branch head to contain the current protected-base tip. The shared merge
  validator verifies the GitHub comparison and refetches the exact open PR and `main` ref immediately
  before the squash call. The hosted App path additionally serializes its own writes in one
  non-cancelling concurrency group; both paths rely on the bypass-free, strict current-check ruleset
  to reject an atomic ref update when `main` moved.
- Merge evidence must prove root product and base-pack versions are identical and equal the target
  version declared by the trusted base-branch backlog item; a later tag failure is not a substitute.
- A green branch, completed audit, or passing live product inspection is not merge authority. Obtain
  the user's explicit approval after presenting the final evidence and before invoking merge
  automation or publishing a version tag. One direct instruction may authorize both operations; the
  agent then materializes their distinct exact provider records under ADR-0014.
- Repository settings enable squash merge only. Both sanctioned executors generate the exact linted
  title and deterministic body plus one verified merge-approval comment footer from validated
  history; interactive message editing, raw `gh pr merge`, merge commits, and rebase merges are
  forbidden.
- A cancellation, timeout, neutral result, empty test collection, or retry-only pass does not satisfy
  the evidence contract even if the host UI labels it successful.
- There is no generic failed-gate bypass. After two identical failures on one unchanged head, stop
  blind retries and diagnose the gate. A defective enforcement rule is repaired in a separate
  non-player-visible PATCH under ADR-0013; the frozen epic resumes qualification only after that patch
  lands. Tags are never moved or replaced.

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
2. for every epic and player-visible patch, materialize every required production asset, run
   `validate:media`, build and open the production preview, complete the ADR-0012 live walkthrough,
   and retain the inspection record on that exact candidate; a non-player-visible PATCH instead binds
   a clean rebuilt artifact under ADR-0013;
3. validate the proposed squash title/body, present all evidence, and wait for explicit user approval;
4. after approval, merge through the hosted App workflow or `npm run merge:approved` under ADR-0016;
5. verify protected `main` contains the exact candidate tree and a valid squash crosswalk;
6. verify requested SemVer equals root `package.json` and bundled base-pack version and the annotated
   `vX.Y.Z` tag does not already exist;
7. prove the exact squash has the approved candidate tree, verify either the immutable
   media-qualified build/receipt or the non-inspected PATCH rebuild as applicable, and wait for the
   complete canonical exact-squash `main` workflow run
   before creating a tag specification;
8. generate and lint release notes and the proposed annotated-tag message including the inspection
   identity or explicit `none`, artifact digest, and asset-inventory digest, then materialize a
   distinct exact-target tag-approval record when the owner's direct instruction covers publication;
9. after that authorization record exists, dispatch the protected tag-publication workflow; its
   unprivileged job validates the exact squash and qualified artifact before the environment-scoped
   publishing job can obtain the sole write
   deploy key, which may create but cannot update or delete `v*` tags; then verify the remote annotated
   tag identity and tag-triggered checks, including independent revalidation of the retained
   qualification artifact or rebuilt non-inspected artifact evidence.

A failed or withdrawn release is followed by a new patch. Tags and published artifacts are never
mutated in place.
