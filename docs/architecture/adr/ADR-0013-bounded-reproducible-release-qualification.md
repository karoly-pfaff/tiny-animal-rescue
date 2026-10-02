# ADR-0013: Bound and reproduce release qualification

- Status: Accepted
- Date: 2026-10-01
- Amends: ADR-0009, ADR-0011, ADR-0012

ADR-0014 amends the authorization mechanics: a direct owner instruction may cover merge and tag, and
the agent may materialize their distinct provider records without duplicate manual owner actions.

## Context

The EPIC-002 candidate passed its product, browser, accessibility, content, and visual journeys, but
release closure still consumed repeated full runs without increasing confidence. Three policy defects
were responsible:

- media-complete screenshots were compared by encoded PNG SHA-256, so harmless encoder or
  operating-system differences failed even when decoded pixels were equivalent;
- the trusted artifact finalizer treated a Vite-owned favicon as unlocked R2 content media; and
- every evidence or crosswalk correction created a new candidate head and invalidated the evidence it
  was trying to record.

The existing emergency sentence was not an executable recovery path. In particular, a broken trusted
qualification policy could block the patch that repaired that policy, while all PATCH items were
incorrectly forced through player-visible inspection.

## Decision

### Measure the rendered product, not PNG encoding

Media-complete visual regression captures full screenshots into retained test artifacts, decodes them
in Chromium, and compares a reviewed 64×48 RGB visual signature. The checked-in signature is a compact
derivative, not a production asset or screenshot. Its mean channel difference may not exceed 1, and
no more than 1% of channels may differ by more than 6. Every declared state is compared; digest
allowlists, multiple accepted byte hashes, and states that merely assert a non-empty PNG are forbidden.
Updating a signature is an explicit local command after full-size screenshot review and never a CI
side effect.

### Separate external content media from application-owned static assets

Files under `content/<pack-id>/assets/` are external pack media and must match the R2 materialization
lock and receipt exactly. Build-owned assets outside that tree, including the generated favicon and
bundled fonts, are accepted only when the production HTML, CSS, or JavaScript references the exact
artifact path. An unreferenced application media file, any unlocked pack asset, a missing referenced
asset, or a remote production-media URL still fails closure.

`npm run validate:media` is the local preflight for the same materialized build, visual suite,
artifact scan, packaged-object verification, and runtime closure rules. It consumes already
materialized ignored assets and grants no hosted trust. Player-visible closure still requires the
protected R2 workflow and ADR-0012 inspection.

### Freeze one candidate

The work-item commits, backlog status, version, release notes, audit dispositions, and deterministic
pull-request crosswalk are completed before final qualification starts. The resulting Git head and PR
body form the frozen candidate.

- Automated gates, independent audit, media qualification, and live inspection bind that exact head.
- Provider comments and artifacts record final evidence; they do not amend the candidate tree.
- A retry of unchanged infrastructure may rerun the same head without creating a commit.
- A production, test, policy, or documentation fix unfreezes the candidate and creates one new head;
  all affected evidence is then rerun. The audit remains bounded by `AGENTS.md`.
- Repeatedly changing baselines, tolerances, evidence files, or the closure commit merely to make a
  failing run green is forbidden.

### Repair a broken gate without bypassing product quality

There is no generic epic bypass. If a trusted gate is defective, the epic remains frozen and a
separate governance PATCH repairs the gate. A PATCH may declare `Requires live inspection: no` only
when its diff has no player-visible runtime, content, or production-media effect. It still requires
`validate:full`, an independent audit, all seven exact-head required checks, immutable merge approval,
artifact and asset-inventory digests, a squash merge, a distinct tag approval, and tag-triggered
reverification.

Trusted merge automation parses candidate-authored backlog metadata with trusted base-branch code from
a read-only candidate checkout. Before parsing metadata, it proves that checkout commit, the provider
PR head, and the validation-evidence head are identical. Candidate code never executes with merge
credentials. A non-player-visible PATCH uses a clean rebuilt artifact instead of inventing a media
qualification or live inspection. An epic or player-visible patch continues to require protected
media qualification and ADR-0012 evidence.

Two consecutive failures of the same unchanged hosted step are the stop condition for blind retries.
The next action is diagnosis and, when the gate is defective, the separate PATCH above. Administrator
merge, weakening a threshold, adding another accepted hash, or silently marking the failed gate green
is not the recovery mechanism.

## Rationale

Pixel comparison tests the observable contract while ignoring PNG container bytes. Ownership-aware
artifact closure preserves the strict R2 boundary without confusing source-owned UI resources with
content-pack media. Freezing one head prevents evidence from invalidating itself. The separate repair
lane keeps player-facing releases strict while making the enforcement system repairable through its
own governed workflow.

## Consequences

- Media-complete signature changes require review of the retained full-size screenshots that produced
  them; production screenshots and R2 media remain outside Git.
- A non-player-visible PATCH can be merged and tagged without pretending that a product walkthrough
  occurred, but misclassifying a player-visible change is a High audit finding.
- Local media preflight catches finalizer defects before consuming protected-environment runs, while
  hosted receipts remain authoritative for player-visible closure.
- Final audit and inspection evidence lives primarily in immutable provider records; the candidate
  does not receive an evidence-only tail of commits.
- The first adoption patch may require the already authorized administrative bootstrap because the
  previous trusted policy cannot parse a candidate-owned repair item. Later repairs use this ADR's
  governed lane.

## Rejected alternatives

- **Keep exact PNG hashes per operating system:** tests encoder behavior, encouraged multiple accepted
  hashes, and already proved flaky on an unchanged candidate.
- **Exclude the favicon by filename:** fixes one symptom while leaving ownership classification wrong.
- **Require live product inspection for every PATCH:** spends product-review effort on policy-only
  diffs and makes a broken media gate capable of blocking its own repair.
- **Allow an owner to bypass any failing epic gate:** turns explicit approval into a substitute for
  evidence and weakens child-safety, product, and data guarantees.
- **Commit production R2 assets so qualification is easier:** violates ADR-0011 and duplicates the
  delivery authority in Git.
