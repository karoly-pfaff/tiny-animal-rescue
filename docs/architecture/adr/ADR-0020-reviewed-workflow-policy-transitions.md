# ADR-0020: Admit reviewed workflow policy transitions

- Status: Accepted
- Date: 2026-10-04
- Amends: ADR-0009, ADR-0013, ADR-0016, ADR-0017

## Context

Repository workflow semantics are pinned by a normalized YAML fingerprint and validated by trusted
`main` code before an owner-session merge. This prevents a candidate from silently replacing the
workflow that produced its evidence. It also creates a bootstrap deadlock when a governance PATCH
intentionally changes a workflow: the candidate can pass all seven exact-head checks and its own
updated policy, while trusted `main` rejects the expected fingerprint change before the sanctioned
merge executor can authorize it.

ADR-0013's one-time adoption bootstrap is not reusable, and ADR-0016 forbids a raw provider merge.
The repository therefore needs a narrow transition protocol that preserves the old policy as the
authority while admitting an explicitly reviewed successor definition.

## Decision

A non-player-visible governance PATCH may declare one `Policy transition` value. The initial allowed
value is `publish`; absence or `none` keeps the ordinary exact-fingerprint policy. A transition may be
merged only through the authenticated owner-session executor. The hosted executor continues to
require an exact current-policy fingerprint and therefore fails closed for transition candidates.

Trusted `main` parses the transition declaration from the exact read-only candidate backlog item and
then validates the candidate without executing candidate code. The transition is accepted only when:

- the ordinary trusted repository validator reports exactly the declared workflow's semantic
  fingerprint mismatch and no structural or unrelated finding;
- exactly the declared workflow changes among `.github/workflows/` files;
- the candidate changes the repository-policy definition and its declared fingerprint equals the
  SHA-256 of the normalized candidate YAML document;
- every non-transition workflow fingerprint remains byte-identical to trusted `main` and the trusted
  fingerprints still match their checked-in workflows;
- the CI workflow, merge workflow, merge executor, transition validator, backlog parser, repository
  validator entry point, rulesets, and credential/approval policy files are unchanged from trusted
  `main`; and
- the normal exact-head quality run, independent audit, immutable owner approval, strict current-base
  lease, deterministic squash message, and post-merge verification all pass.

Changing the workflow-specific structural validator alongside its workflow remains reviewable source
inside the governance PATCH. It is not executed with owner credentials before merge; the old trusted
validator must still find no structural defect other than the declared fingerprint transition. A
fresh independent audit reviews the successor policy and workflow together.

## Rationale

The old policy remains the enforcement authority and grants one precisely described semantic
transition rather than a generic bypass. Binding the candidate fingerprint to normalized YAML
prevents an arbitrary accepted hash, while freezing the merge and authorization boundary prevents a
candidate from changing the mechanism that grants the exception. Owner-session execution avoids
changing the hosted merge workflow merely to teach it how to admit its own replacement.

## Consequences

- A reviewed tag-publication workflow can evolve without an administrator merge or direct push.
- Workflow-transition PATCHes are intentionally owner-session-only.
- A transition declaration does not waive any quality check, audit, version, approval, artifact, or
  tag-publication requirement.
- Supporting another workflow kind requires a later reviewed extension of the trusted transition
  allowlist and its negative fixtures; a candidate cannot opt itself into a new transition kind.
- After the governance PATCH lands, subsequent merges use the successor workflow fingerprint as the
  ordinary exact policy.

## Rejected alternatives

- **Use the provider merge button or raw API call:** bypasses the deterministic approval footer and
  the sanctioned executor required by ADR-0016.
- **Accept any fingerprint mismatch for governance PATCHes:** turns a narrow transition into a generic
  workflow-policy bypass.
- **Run the candidate validator with owner credentials:** allows the code being admitted to decide
  whether it is safe.
- **Remove semantic fingerprints:** loses exact reviewed-workflow identity for every ordinary change.
- **Reuse ADR-0013's adoption bootstrap:** that exception was explicitly one-time and is not a repair
  protocol.
