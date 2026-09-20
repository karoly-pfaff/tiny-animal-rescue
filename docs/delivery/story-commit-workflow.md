# Story commits and epic squash workflow

Tiny Rescue uses one branch and one pull request per epic. On that branch, every completed story is
represented by exactly one canonical commit. The epic is squash-merged so protected `main` receives
one commit for the complete milestone.

This optimizes a solo project for fast iteration without giving up reviewable story boundaries:

- the epic branch explains how the work was built, one story at a time;
- the epic pull request holds the complete acceptance and verification record;
- `main` stays compact, bisectable at milestone granularity, and aligned with product versions.

## History invariants

1. Every epic has one branch named `epic/<three-digit-id>-<short-kebab-title>`, for example
   `epic/001-first-rescue`.
2. Every accepted story has exactly one non-merge commit on that branch.
3. Story commits follow dependency order unless the epic explicitly documents a safe parallel order.
4. An epic branch has one pull request and is merged to `main` with squash merge only.
5. The squash commit is the only epic implementation commit added to `main`.
6. `main`, release tags, and published milestone commits are never rewritten.

Non-epic security patches or maintenance use a separately scoped backlog item and pull request. They
must not be hidden inside an active epic merely to preserve the one-squash shape.

## Commit-message standard

All canonical story, closure, patch, maintenance, revert, and squash commits follow
[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>(<scope>): <imperative description>

<optional body>

<optional footer(s)>
```

Allowed types are `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`, `chore`, and
`revert`. Choose the type from the commit's primary intent; included tests and documentation do not
turn a feature into `test` or `docs`. Use lower-case type, exact upper-case backlog ID as the mandatory
scope, an imperative lower-case description, no trailing period, and a maximum 72-character subject.

- Story scope: exact story ID, for example `feat(E001-S03): implement ladder drag step`.
- Epic closure scope: exact epic ID, for example `chore(EPIC-001): close milestone M1`.
- Epic squash scope: exact epic ID, for example
  `feat(EPIC-001): deliver first rescue vertical slice`.
- Non-epic scope: exact maintenance/backlog ID defined before work begins.
- Breaking change: add `!` before the colon and a `BREAKING CHANGE:` footer explaining the contract,
  migration, and authorized ADR. Do not use a breaking marker to bypass version policy.
- Revert: use `revert(<scope>): <description>` and a `Refs:` footer naming the reverted commit.

Commitlint or an equivalent deterministic validator enforces the allowed types, mandatory scope,
known backlog ID, subject style/length, breaking-change footer, and prohibited watermark rules.

## Story commit contract

A story commit contains the narrowest complete change that satisfies that story:

- production behavior and its automated tests;
- required schema, content, fixture, and example changes;
- contract and public-behavior documentation changed by the story;
- no unrelated cleanup, dependency update, formatting sweep, or future-story scaffold;
- no generated reports or build output unless a binding delivery contract requires them in source.

Use this subject form:

```text
feat(E001-S03): implement ladder drag step
```

The optional body records a non-obvious constraint, compatibility effect, or decision; it does not
repeat the file list.

A story is ready for its canonical commit only when:

- every acceptance criterion is satisfied or explicitly marked not applicable with evidence;
- focused tests and `validate:quick` pass;
- required visual/manual evidence is inspected;
- documentation and backlog checkboxes reflect the result;
- the independent audit required by `AGENTS.md` has no unresolved High finding and every Medium is
  fixed or explicitly declined;
- the staged diff contains only that story.

If a story cannot form one coherent commit, split the backlog story before implementation. Do not use
multiple commits as an undeclared substitute for missing story decomposition.

## Work-in-progress and correction commits

Local WIP commits are allowed while a story is being developed, but they are not canonical history.
Before beginning the next story, combine them into the one story commit and rerun affected checks.

When a later story reveals a defect in an earlier story on the same unmerged epic branch:

1. create a targeted `fixup!` commit for the earlier story;
2. run the affected tests;
3. autosquash it into the earlier story commit;
4. resolve and retest every rewritten descendant story;
5. push the rewritten personal epic branch with force-with-lease, never plain force;
6. update the pull-request story/commit map and rerun invalidated checks and review.

The supported mechanisms are documented by Git's
[`commit --fixup`](https://git-scm.com/docs/git-commit),
[`rebase --interactive --autosquash`](https://git-scm.com/docs/git-rebase), and
[`push --force-with-lease`](https://git-scm.com/docs/git-push). Do not rewrite a branch another person
or automation is actively building on; stop and coordinate even though the normal project mode is
single-contributor.

After an epic is merged or tagged, history is immutable. A discovered defect becomes a new patch
backlog item and pull request with a regression test.

## Epic closure commit

Epic closure is deliberately two-phase so version policy and final-head validation are both true:

1. At the previous authoritative version, complete every story criterion, story-level audit, focused
   check, and `validate:quick`; review the combined behavioral diff. This qualifies behavior but does
   not close the epic.
2. Create one non-behavioral closure commit containing the candidate target version/status and the
   allowed evidence metadata below.
3. Run the complete applicable aggregate gate on that exact closure head. Any failure returns to the
   owning story or closure metadata and invalidates stale evidence.
4. The target version is earned and published only by the validated squash merge and immutable tag;
   creating the candidate bump does not itself advance the milestone.

The optional closure commit uses:

```text
chore(EPIC-001): close milestone M1
```

It may contain only:

- epic status and completed acceptance records;
- the candidate product/base-pack target-version bump;
- release notes, known limitations, and retained evidence indexes;
- generated integrity metadata that must encode the final version.

It must not add or repair product behavior, tests, dependencies, schemas, content, assets, tool
configuration, or CI. If such a change is needed, return it to the owning story commit, repeat that
story's checks/audit, and then rerun epic qualification. There is exactly zero or one closure commit;
it is omitted when no authored closure change is required.

## Epic pull request and squash merge

Open one draft pull request from the epic branch to protected `main` when the first canonical story
commit is ready. Reopen that same pull request if necessary; do not replace it with a second PR for
the same epic. Keep its description current with:

| Story | Canonical commit | Acceptance evidence | Verification |
|---|---|---|---|
| `E001-S01` | `<full SHA>` | `<backlog/doc links>` | `<commands/evidence>` |

The table is evidence, not permanent Git ancestry. A squash merge creates a new commit and the story
commits do not become ancestors of `main`. Update recorded SHAs after any autosquash.

The exact squash body is generated deterministically before merge and contains a machine-readable
crosswalk with epic ID, milestone, target version, canonical PR identity/URL, every story ID and full
SHA, optional closure SHA, applicable aggregate gate, evidence digest, and `Release: v<version>`
footer. The annotated milestone tag repeats that crosswalk and additionally records the resulting
squash SHA and artifact digest. These two Git-native records preserve traceability in a standalone
clone even when the hosting UI is unavailable.

Before merge:

1. verify one canonical commit per accepted story and at most one closure commit;
2. review the entire epic diff against current `main`;
3. run a clean frozen install and the applicable aggregate gate;
4. complete the epic-level fresh-context audit and disposition every finding;
5. verify milestone/version/release evidence and all required status checks on the final branch head;
6. validate the exact proposed PR title and deterministic squash body/crosswalk;
7. let the repository merge automation perform the squash with those exact validated inputs;
8. verify the resulting `main` subject/body, squash SHA, tree identity, and post-merge history check;
9. build the release artifact from the exact verified squash SHA and record its digest, reports, and
   provenance without creating a tag yet;
10. generate and lint the now-complete annotated-tag message including that digest, create the local
    unpushed tag targeting the same squash SHA, run tag/history validation, push the validated tag,
    verify its remote identity, and only then delete the epic branch.

Interactive merge-message editing is forbidden. Repository settings allow squash merge only; merge
commit and rebase-merge modes are disabled. The merge automation/provider API must use the validated
PR title and generated squash body verbatim. If it cannot guarantee this, stop rather than merging
and change the repository integration deliberately.

The applicable aggregate gate is `validate:full` through M6 and `validate:release` for M7, M8, M9,
and GA promotion. A failed, stale, cancelled, empty, or retry-only result does not authorize merge.

## No-watermark rule

No authored or generated deliverable may contain a watermark or automated-authorship signature.
This prohibition includes:

- commit subjects, bodies, footers, tags, and annotated-tag messages;
- pull-request titles/descriptions, review summaries, changelogs, and release notes;
- source, tests, comments, documentation, schemas, fixtures, and generated metadata;
- production or presentation images, audio, video, build output, and packaged artifacts.

Forbidden examples include “generated by”, “created with”, “written by AI”, agent/editor/tool badges,
bot signatures, model names used as attribution, promotional links, injected logos, audible tags,
visual watermarks, and fabricated `Co-authored-by`, `Reviewed-by`, or similar trailers. Do not hide a
watermark in metadata, Unicode, comments, or an encoded payload.

Necessary factual references are not watermarks: dependency/tool configuration, reproducible build
metadata, security scanner identity, legally required third-party notices, and the internal asset
provenance record may name a tool/model when the governing contract requires it. They must be
functional or legal evidence, not authorship credit, branding, or promotion. Production media remains
visually and audibly watermark-free regardless of its internal provenance record.

Evidence is split by what can actually be proven:

- automation rejects known text/trailer templates, suspicious Unicode/control payloads, forbidden
  metadata fields, known visual/audio signatures, OCR-detected markings, and maintained fixture cases;
- full-size human visual QA owns composition-level logos, signatures, subtle or unknown visual marks;
- listening QA owns spoken/sung generator tags and subtle or unknown audible marks;
- provenance/license review owns legally required notices and verifies they are stored in the proper
  non-player-facing record rather than embedded as promotion.

Automation never claims to prove the absence of every possible steganographic or previously unknown
watermark. Release approval requires both the automated evidence and recorded human media review.

## Automation checks

EPIC-000 adds one validator with explicit, fixture-tested modes; no mode silently skips a rule:

- `branch` mode is offline, takes an explicit base ref and epic file, and validates the local commit
  range, story coverage, closure count, Conventional Commits, and textual watermark patterns;
- `pull-request` mode receives trusted provider event data, title/body, base/head SHAs, and PR identity;
  it performs branch checks, validates the deterministic squash inputs and story map, and queries PR
  history to require one canonical PR per epic while allowing that same PR to be reopened;
- `merge-queue` mode applies the same PR contract to the queued candidate and proves its tree contains
  the approved epic head without unrelated changes;
- `main` mode validates the new squash subject/body/crosswalk and tree identity rather than expecting
  story commits in `main` ancestry;
- `tag` mode validates the unpushed annotated tag name/message/crosswalk, target squash SHA, release
  notes, version, artifact digest, and watermark rules before publication.

Local `validate:full` invokes offline `branch` mode with an explicit base. Hosted `history` checks use
the appropriate provider-backed mode and credentials; missing event data or credentials fail rather
than downgrade to branch mode. For an epic pull request, the validator:

- derives the expected story IDs from the target epic;
- requires exactly one canonical subject for every accepted story;
- rejects duplicate, missing, unknown, merge, or unassigned commits;
- permits at most one correctly named epic closure commit;
- enforces Conventional Commits type/scope/body/footer rules and subject length;
- rejects prohibited watermark/signature patterns across commit messages and authored output;
- verifies the pull-request story/commit map matches the final commit SHAs.

After merge, the deterministic squash body and annotated milestone tag are the immutable
machine-readable crosswalk. Branch deletion waits until both are verified and the remote tag exists.

This history check is a quality aid, not a substitute for acceptance, tests, or review.
