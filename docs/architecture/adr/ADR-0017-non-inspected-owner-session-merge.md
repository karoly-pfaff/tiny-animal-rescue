# ADR-0017: Support non-inspected owner-session merge

- Status: Accepted
- Date: 2026-10-03
- Amends: ADR-0013, ADR-0016

## Context

ADR-0016 added a deterministic owner-session merge executor but limited it to inspected work. A
non-player-visible PATCH therefore still depended on separately provisioned merge-authorization
GitHub App credentials. PATCH-003 exposed that this exception made the governance repair lane depend
on an unrelated credential installation even after the owner had authorized an exact, fully green
candidate.

The restriction attempted to prevent candidate code from running with the owner's GitHub credentials.
The canonical required-quality workflow already produces a retained browser artifact from a clean
install on the exact pull-request head. Trusted `main` policy can download and independently measure
that artifact without executing candidate commands in the owner session.

## Decision

The authenticated owner-session executor supports inspected and non-inspected work after direct owner
authorization. All ADR-0016 requirements remain in force: clean trusted `main`, a separate clean
candidate checkout, exact pull-request head and base, the newest canonical seven-check quality run,
immutable approval, target-version equality, final provider snapshot, strict protected-branch checks,
and post-merge base-parent and candidate-tree verification.

For inspected work, the command continues to download and verify the protected media-qualification
artifact bound by the inspection record.

For non-inspected work, the command:

1. validates the candidate's workflow and repository-policy files with trusted `main` validator code;
2. identifies the newest successful canonical exact-head required-quality run using the same trusted
   workflow identity and check-suite validation as merge authorization;
3. downloads that run's exact `browser-<run-id>-<run-attempt>` artifact;
4. executes only trusted `main` policy code to inspect the artifact and candidate metadata;
5. recomputes the production-artifact and tracked asset-inventory digests; and
6. binds the evidence to the exact quality-run ID, candidate head, and target version.

It does not run `npm`, build commands, package scripts, or candidate JavaScript while preparing this
evidence. Candidate-authored evidence JSON, a local rebuild, an artifact from another run, or a stale
run ID is rejected. The provider's strict checks remain the atomic merge lease. Raw merge commands and
ruleset bypasses remain forbidden.

## Rationale

The canonical CI artifact preserves the credential boundary that motivated the restriction without
making a single-owner repository depend on a second merge identity. Reusing the exact trusted quality
run also avoids a local rebuild whose environment could differ from the provider evidence already
required for the candidate.

## Consequences

- A missing merge-authorization GitHub App no longer blocks an explicitly authorized non-inspected
  PATCH.
- The owner-session command needs the canonical browser artifact to remain available and non-empty.
- Non-inspected evidence is tied to the newest exact-head quality run and is invalidated by a new head
  or a newer canonical run.
- Hosted App execution remains supported when its credentials are configured.
- Tag publication remains unchanged and continues to use the protected release publisher.

## Rejected alternatives

- **Keep non-inspected work hosted-only:** retains the unrelated credential dependency that blocked
  the governance repair lane.
- **Rebuild candidate source in the owner session:** executes candidate-controlled build code in the
  same user context as the owner's credentials.
- **Trust the artifact's own integrity report:** allows candidate-produced metadata to substitute for
  an independent measurement by trusted policy.
- **Use a raw owner merge for governance repairs:** bypasses deterministic message construction and
  repeats the history defect ADR-0016 fixed.
