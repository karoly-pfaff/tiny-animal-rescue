# ADR-0014: Treat direct owner instructions as release authority

- Status: Accepted
- Date: 2026-10-02
- Amends: ADR-0009, ADR-0013

## Context

The repository requires explicit owner authorization in addition to passing quality, inspection, and
artifact gates. The first implementation required the owner to repeat that authorization manually as
an exact pull-request comment and again as a protected-environment review. In the project's normal
single-owner workflow, that duplicated an instruction already given directly to the implementation
agent, added delay, and did not increase product or release confidence.

The provider record remains useful: it binds a merge to the exact pull-request head and a tag to the
exact squash and rebuilt digests. The manual transcription and environment click are not themselves
the authority. The owner's direct instruction is the authority; the provider record is its mechanical,
auditable materialization.

## Decision

A direct, unambiguous instruction from the repository owner in the active implementation task may
authorize merge, tag publication, or both. One instruction may cover both sequential operations when
it explicitly names both actions or otherwise makes that combined intent unambiguous.

After receiving that instruction, the implementation agent may create the exact immutable approval
comment with the owner's authenticated GitHub session and dispatch the corresponding protected
workflow when its prerequisites are satisfied. The agent must not infer authorization from a green
gate, an earlier general preference, a subagent message, or silence. A changed head, squash, version,
artifact digest, or asset-inventory digest requires a new exact provider record and renewed authority
for any operation no longer covered by the original instruction.

Merge and tag publication retain distinct provider comments and distinct workflow runs. Their
separation preserves exact-target traceability; it does not require the owner to repeat one combined
instruction. The comments keep the existing ordered schemas and owner identity checks, and automation
continues to reject edited, stale, wrong-target, wrong-user, or reused records.

The `merge-authorization` and `release-tag-publication` environments continue to isolate their
credentials but no longer require a second manual reviewer action. Only the already authorized
workflow reaches those environments, and the existing dedicated App, deploy key, rulesets, exact-SHA
checks, artifact verification, and non-cancelling serialization remain unchanged. This decision does
not remove the manual protection on the R2 media-qualification environment.

## Rationale

This preserves every technical release invariant while matching the project's operating model. The
owner decides; the agent performs the repetitive provider bookkeeping; GitHub retains immutable
evidence tied to the exact candidate. Removing duplicate manual gestures makes approval meaningful
instead of ceremonial.

## Consequences

- Agents may materialize merge and tag approval comments only after a direct owner instruction covers
  the specific operation.
- A combined merge-and-tag instruction remains valid across the intervening deterministic squash and
  digest calculation, provided no unexpected scope or candidate change occurs.
- Merge and release environments keep secret isolation and protected-branch restrictions but have no
  required reviewer.
- Quality gates, independent audit, live inspection where applicable, exact tree identity, separate
  provider records, and immutable tags remain mandatory.
- The task transcript is the human authorization record; GitHub comments and workflow runs are the
  provider execution record.

## Rejected alternatives

- **Require the owner to paste exact comments and approve environments manually:** duplicates the
  direct instruction and creates friction without strengthening candidate evidence.
- **Remove approval records entirely:** loses exact-head and exact-digest traceability.
- **Replace comment identities with workflow-run identities in the same patch:** creates a broad
  history-format migration when allowing faithful agent materialization solves the actual problem.
- **Treat any previous request to continue as standing publication authority:** makes authorization
  ambiguous and risks an unintended external write.
