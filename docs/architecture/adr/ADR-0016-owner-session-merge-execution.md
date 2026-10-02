# ADR-0016: Support exact owner-session merge execution

- Status: Accepted
- Date: 2026-10-02
- Amends: ADR-0009, ADR-0013, ADR-0014

## Context

The original publication design made a dedicated GitHub App workflow the only accepted squash-merge
writer. That path preserves a useful credential boundary, but it also makes a single-owner project
depend on separately provisioned App credentials and an environment even after the owner has directly
authorized an already qualified candidate. During PATCH-002 the owner used the authenticated provider
session to merge the exact approved head, but the raw command copied the pull-request body without the
required immutable `Merge-Approval-Comment` footer. The tree was correct while the resulting `main`
history evidence was incomplete.

GitHub's pull-request merge API accepts an exact head SHA, squash title, and squash body. Strict
required checks require the topic branch to remain current with the base branch at the provider's
atomic ref update. These provider capabilities allow a deterministic owner path without a bypass
actor. See the GitHub documentation for
[pull-request merge parameters](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request),
[strict required checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks),
and [ruleset status checks](https://docs.github.com/en/rest/repos/rules#update-a-repository-ruleset).

## Decision

Tiny Rescue supports two merge executors after a direct, unambiguous owner instruction:

1. the dedicated merge-authorization App workflow; and
2. the authenticated owner-session command `npm run merge:approved`.

Both executors use the same `merge-epic.mjs` validation and provider API call. They refetch the open
pull request and protected `main`, require the exact candidate head and base, validate the canonical
pull-request crosswalk, current trusted quality run, approval comment, inspection or non-player-visible
evidence, target version, artifact digests, and final provider snapshot. The executor then publishes
the required `authorization` status and submits one squash payload with the exact head SHA. The
provider, with no ruleset bypass actor, atomically rejects the update if `main` moved or another strict
check ceased to be current. The payload is generated from validated history rather than hand-edited
text and appends exactly one `Merge-Approval-Comment: #<id>` footer.

The owner-session path additionally requires all of the following:

- execution from a clean, checked-out local `main` whose `HEAD` equals `origin/main`;
- GitHub CLI authentication as the configured repository owner;
- a separate clean candidate checkout matching both the pull-request head and validation evidence;
- the same immutable approval, qualification, and inspection inputs as the App path; and
- inspected work with fresh evidence produced inside the command by downloading and independently
  verifying its provider qualification artifact.

Protected `main` has no bypass actor. The seven quality checks and the shared `authorization` status
remain provider-enforced for both executors. Candidate-supplied evidence JSON is not accepted by the
owner path. After merge, the command also verifies that the squash has the authorized base parent and
the candidate tree; the ordinary `main` history check independently verifies the exact body and tree.

Raw `gh pr merge`, the provider merge button, interactive merge-message editing, and any custom API
call that does not use the shared authorized-message generator remain unsupported. If the sanctioned
command cannot prove the candidate or construct the exact message, it stops without merging.

## Rationale

The owner decides whether publication happens. The repository should automate exact evidence and
message construction, not require an unrelated credential installation before carrying out that
decision. Sharing one validator and one payload generator prevents the omission that caused the
PATCH-002 history failure while retaining the App path for unattended or hosted execution.

## Consequences

- A missing GitHub App no longer blocks an explicitly authorized, provider-qualified inspected merge;
  non-inspected work remains hosted-executor-only so candidate code never runs with owner credentials.
- The checked-in main ruleset has no bypass actor; strict current checks are the provider-side merge
  lease for both executors.
- Merge tooling, governance fixtures, and `main` history validation share the same deterministic
  approval-footer contract.
- Operator execution still needs immutable provider evidence; direct instruction is authority, not a
  substitute for candidate qualification.
- Tag publication remains unchanged and may use only the protected release publisher; this ADR does
  not authorize a local tag push.

## Rejected alternatives

- **Keep the App as the sole writer:** preserves the original boundary but makes missing provider
  setup a release blocker with no corresponding product-quality benefit in the single-owner workflow.
- **Allow raw `gh pr merge`:** repeats the exact path that omitted the required history footer.
- **Remove the approval footer from history policy:** hides the defect instead of making the merge
  producer conform to the validated crosswalk.
- **Grant either executor a ruleset bypass:** defeats the provider's atomic strict-check/base lease and
  permits a merge onto a base different from the qualified snapshot.
- **Relax or skip quality checks for the owner:** confuses publication authority with technical
  evidence and is not permitted.
