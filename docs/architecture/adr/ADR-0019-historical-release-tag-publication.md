# ADR-0019: Publish qualified historical release tags from current policy

- Status: Accepted
- Date: 2026-10-04
- Amends: ADR-0009, ADR-0013, ADR-0014, ADR-0016

## Context

EPIC-005 was qualified and squash-merged as `0.6.0`, but its immutable tag was not published before
the non-player-visible PATCH-006 squash advanced protected `main` to `0.6.1`. The protected tag
workflow assumed that its trusted policy checkout and the requested release squash were the same
commit. That assumption is safe only when tag publication immediately follows merge; it prevents a
fully qualified, already merged release from receiving its missing immutable tag after `main` moves.

Rewinding `main`, pushing a tag locally, running historical scripts with the release deploy key, or
retagging a newer commit would break the repository's evidence and credential boundaries. Recovery
therefore needs a governed distinction between the policy commit that authorizes publication and the
historical squash that the tag identifies.

## Decision

The protected tag publisher may publish a missing tag for a historical merged release when all of the
following conditions hold:

- the workflow dispatch SHA, every policy checkout, every validation executable, and the provider's
  live protected `main` ref all identify the same commit; a later `main` advance fails closed;
- the requested pull request is merged, its provider-reported squash is an ancestor of that policy
  head, and a separate read-only target checkout equals that exact squash;
- the target squash tree equals the approved pull-request head tree and its deterministic squash
  history, exact-squash seven-check `main` run, merge approval, tag approval, inspection policy, and
  artifact evidence all pass the current trusted validators;
- product version, base-pack version, work-item metadata, asset inventory, and release notes are read
  from the target checkout, while approval, inspection, workflow, and publication policy are read
  from current protected `main`;
- inspected releases reverify their retained qualification artifact against the target source and
  original qualification-policy parent; non-inspected releases execute candidate install/build/test
  only in a separate credential-free job, then a fresh trusted job measures the uploaded product
  without executing candidate-controlled code;
- publication uses one repository-wide workflow concurrency group with the maximum pending queue and
  no cancellation. The target squash's parent product version determines the exact predecessor,
  including the latest patch before a new minor. Stable releases follow that product sequence.
  Supported prereleases are `alpha.N`, `beta.N`, and `rc.N` with a positive integer: a phase starts at
  `.1`, a same-phase revision increments by one, a later phase restarts at `.1`, and the stable
  release may follow any prerelease of the same core version. Validation requires the predecessor to
  be the latest supported stable or prerelease tag, no equal/newer product tag to exist, and every
  existing `v*` product tag to use the supported grammar. The final write boundary compares the
  complete immutable tag-ref history measured during validation before requiring the predecessor ref
  and absent target ref; and
- the release deploy key remains unavailable to validation. The environment-scoped publication job
  receives only the validated tag specification, checks out its exact target SHA, runs no repository
  script or package command, and creates the absent annotated tag without update or deletion power.

The resolver and final validator both bind their current policy checkout to the workflow dispatch SHA
and live provider `main` ref. A concurrent `main` advance invalidates the run instead of silently
changing its authority. The ordinary immediate-after-merge case is the same protocol with target SHA
equal to policy SHA.

## Rationale

Separating current policy from historical release content keeps enforcement repairable without
letting old candidate code decide today's publication rules. Requiring ancestry, exact checkout and
tree identity preserves the meaning of the original squash. Reusing the original exact-squash checks
and retained artifact evidence recovers the missed publication step without manufacturing new
qualification evidence or changing the released bytes.

## Consequences

- A qualified merged release can receive its missing immutable tag after later compatible governance
  patches land.
- Historical target code may execute only in the isolated credential-free build job; the trusted
  validation job receives the resulting product artifact and never runs candidate package commands.
- A stale policy checkout, non-ancestor target, mismatched target checkout, missing predecessor tag,
  or later existing tag fails closed.
- Prerelease review builds remain publishable without weakening historical stable-release ordering.
- Tag approval and tag-triggered verification remain distinct provider records under ADR-0014.
- This decision does not authorize moving, replacing, deleting, or locally pushing a protected tag.

## Rejected alternatives

- **Reset or rewrite `main` to the historical squash:** destroys already merged PATCH history and the
  protected-main invariant.
- **Tag current `main` as `v0.6.0`:** assigns the EPIC-005 version to a different tree and includes
  PATCH-006 changes in the wrong release.
- **Push the historical tag from the owner shell:** bypasses the protected publisher, exact approval,
  artifact verification, and tag-triggered audit trail.
- **Run the historical workflow and scripts with the deploy key:** lets obsolete candidate policy
  control a current protected write.
- **Drop the exact-checkout requirement:** permits a tag message and artifact to describe one release
  while the ref targets another commit.
