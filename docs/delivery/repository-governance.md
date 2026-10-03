# Repository governance operations

The checked-in GitHub policy is authoritative for the hosted repository. It turns the quality and
history contracts into reproducible provider settings rather than relying on remembered UI choices.

## Authoritative files

- [repository settings](../../deploy/github/repository-settings.json) allow squash merge only, use
  the already validated pull-request title/body as the default, and delete the merged epic branch;
- [main ruleset](../../deploy/github/main-ruleset.json) blocks deletion and non-fast-forward updates,
  requires a pull request, rejects stale heads, and requires the seven quality checks plus an
  `authorization` status; it has no bypass actor, so strict current checks provide the atomic merge
  lease for both the dedicated App and the authenticated owner-session executor under ADR-0016;
- [release-tag creation ruleset](../../deploy/github/tag-ruleset.json) blocks direct creation of
  `v*` tags; its sole bypass class is the dedicated release deploy key;
- [release-tag immutability ruleset](../../deploy/github/tag-immutability-ruleset.json) blocks update
  and deletion of `v*` tags with no bypass actor, including the release deploy key;
- [approval policy](../../deploy/github/approval-policy.json) names the repository owner whose exact
  provider comment can authorize a candidate and records that an agent may materialize it only from a
  direct owner instruction;
- [release-publisher policy](../../deploy/github/release-publisher.json) names the protected
  environment, its private-key secret, the absence of duplicate manual review, and the only allowed
  write deploy key;
- [required CI](../../.github/workflows/ci.yml) runs without path filters for pull requests,
  merge-queue candidates, `main`, and milestone tags;
- [merge automation](../../.github/workflows/merge-epic.yml) builds source-only work without secrets
  or consumes and revalidates the exact qualified-media artifact for inspected work, then uses a fresh
  runner, trusted `main` policy checkout, protected environment, and dedicated App token to recheck the
  seven quality statuses, exact-head inspection where required, and owner approval; it proves the PR
  head contains the current `main` tip, refetches the open PR and `main` ref immediately before passing
  the validated title and body plus the immutable merge-approval comment footer to the squash API,
  and runs under one repository-wide merge concurrency group; the bypass-free strict ruleset still
  rejects the ref update atomically if another writer advances `main`;
- [authorization-publisher policy](../../deploy/github/authorization-publisher.json) names the
  protected environment and the only App credentials allowed to perform the hosted merge;
- [media-qualification policy](../../deploy/github/media-qualification.json) and
  [workflow](../../.github/workflows/qualify-media.yml) isolate read-only R2 credentials from all
  candidate-controlled execution, keep the original media/receipt handoff in a different job, and use
  a third candidate-free finalizer to remeasure and watermark-scan original and packaged bytes,
  require pack-local runtime references, reject remote media URLs, bind product/base-pack version, and
  retain the receipt-bound build/visual artifact;
- [tag publication](../../.github/workflows/publish-tag.yml) consumes that exact qualified artifact,
  validates the actual squash subject/body/tree, waits for every exact-SHA trusted `main` check,
  validates inspection and separate tag approval against both digests, uploads a tag specification,
  and only then lets a second environment-scoped job obtain the dedicated deploy key.

`npm run validate:repository` parses every required workflow as YAML and rejects any semantic drift
from its exact reviewed definition, including extra commands/actions and `continue-on-error`.
`npm run test:governance` executes
positive and negative fixtures for the non-obvious repository, history, and watermark cases.

## Bootstrap or reconcile GitHub

Authenticate as the repository owner, grant a token repository administration and ruleset access,
then run from a clean checkout:

```text
GITHUB_REPOSITORY=karoly-pfaff/tiny-animal-rescue
GITHUB_TOKEN=<short-lived-owner-token>
AUTHORIZATION_APP_ID=<dedicated-github-app-id>
npm run governance:apply
```

Before applying governance, provision exactly one write-enabled deploy key named
`tiny-rescue-release-tag-publisher`. Store its private key only as the
`RELEASE_TAG_DEPLOY_KEY` secret of the `release-tag-publication` environment; never store it as a
repository secret, local project file, or shell argument. The public half is registered as the deploy
key. No other write-enabled deploy key is allowed.

Also create and install a dedicated merge-authorization GitHub App. Give it repository metadata read,
Actions read, checks read, contents write, issues read, pull requests read, and commit statuses write
permissions. GitHub's pull-request merge endpoint requires contents write; the workflow requests that
permission explicitly and does not request administration, deployments, environments, workflows, or
any other write scope. Store its App ID and private key only as
`MERGE_AUTHORIZATION_APP_ID` and `MERGE_AUTHORIZATION_APP_PRIVATE_KEY` secrets of the
`merge-authorization` environment. The checked-in `$AUTHORIZATION_APP_ID` sentinel is materialized by
`governance:apply`; it is never sent to GitHub as a literal ruleset value.

Create bucket-scoped, object-read-only Cloudflare R2 S3 credentials for the production-media bucket.
Store the account ID, bucket, access-key ID, and secret access key only as `R2_ACCOUNT_ID`,
`R2_BUCKET`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` secrets of the `media-qualification`
environment. They are never repository secrets. The trusted materializer derives the HTTPS S3 origin
from the account ID, signs direct S3 GETs for region `auto`, rejects redirects, and never emits
credentials or signed URLs.

None of these protected secret names may also exist as a repository secret or as an organization
secret exposed to this repository. Environment scoping is the authorization boundary, not merely a
name-precedence convention. Reconciliation paginates and rejects repository-level duplicates. Because
the repository endpoint cannot enumerate inherited organization-secret exposure, the owner must also
verify the organization Actions-secret access list in GitHub whenever governance is bootstrapped or
credentials are rotated, and retain that provider-side review with the governance evidence.

The command patches repository merge settings, creates or updates the branch and both tag rulesets,
configures all three environments for protected branches, keeps owner review on media qualification,
removes duplicate manual review from merge/tag publication, and reads the result back. It paginates
the complete deploy-key and repository-secret collections
before proving there is exactly one writer, no protected secret name is duplicated at repository
scope, and every required environment secret exists. It fails closed when credentials, permissions,
identity isolation, or provider retention are missing.
Never commit the token or place it in a command-line argument.

After initial application, create the first pull request so GitHub records all check contexts, then
inspect the ruleset UI and run `npm run validate:repository` again from the exact branch head. Hosted
run URLs and retained artifacts become the provider evidence; checked-in JSON is configuration
evidence, not proof that the provider accepted it.

## Pull request, queue, main, and tag sequence

The pull-request body is exactly the deterministic crosswalk generated by `npm run generate:squash`.
Acceptance discussion, audit disposition, screenshots, and other human evidence remain in linked
backlog/audit records, check summaries, and the PR conversation. Merge automation uses that body
unchanged and appends exactly one `Merge-Approval-Comment: #<id>` footer after validating the immutable
approval record.

After direct owner authorization, the hosted merge App workflow and `npm run merge:approved` are both
sanctioned executors. Run the owner-session command from a clean trusted `main` checkout and pass the
pull-request, inspection, approval, qualification, and candidate-checkout arguments. The candidate
checkout must also be clean. For inspected work, the command downloads and independently verifies the
provider qualification. For non-inspected work, it downloads the newest canonical exact-head quality
run's browser artifact and independently recomputes its artifact and inventory digests with trusted
`main` policy; it does not execute candidate commands. Caller-supplied evidence JSON is not accepted.
The command then uses the configured owner's GitHub CLI session and constructs the squash payload from
validated history. Raw `gh pr merge` is forbidden because it can silently omit the approval footer.

The required `history` job uses trusted provider event data and fails when it cannot query canonical
PR identity. It resolves epic and declared maintenance branches from backlog metadata and validates
explicit pull-request, merge-queue, `main`, and tag modes; local
`npm run lint:history` validates complete branch mode. The merge workflow resolves the canonical
active CI workflow ID and accepts only its newest exact SHA/branch/event run number and attempt, with
every required check tied to that run's check-suite ID. The provider adapter explicitly requests every
paginated attempt with `filter=all`; an older canonical run may be superseded, but duplicate results
inside the selected run and same-name jobs from another workflow remain invalid. Trusted `main`
policy also validates the candidate governance files before authorization. `main` then proves a
single non-merge squash and tree identity. The
annotated milestone tag adds the squash SHA, artifact digest, and asset-inventory digest to the same
crosswalk before publication. Tag preparation also validates the actual squash subject/body/tree and
requires exactly one successful instance of all seven checks in the newest canonical exact-squash
workflow run. For inspected releases, tag-triggered history resolves the retained qualification from
the recorded inspection, downloads it by exact run/name, and independently verifies it. For a
non-player-visible PATCH, it instead rebuilds the exact squash and compares its artifact and
asset-inventory digests; it never invents an inspection record.

Each sanctioned executor posts `pending` before validation and replaces it with `success` only for the
exact validated head immediately before requesting the squash. Because main has no bypass actor, the
provider requires this status and every strict current quality check at the atomic ref update; a base
race rejects the merge. Its contents-write token exists
only in the fresh protected-environment job, after candidate validation. That job runs parser and
authorization policy from protected `main` while reading backlog metadata from the exact read-only
candidate checkout; it never executes candidate code. The initial adoption of this
contract is a one-time bootstrap: before the trusted workflow exists on `main`, the complete diff and
gates are presented for explicit user approval and merged under the preceding protection; only then is
the App/ruleset reconciliation applied. This bootstrap is not reusable for later work items.

The ADR-0016/ADR-0017 owner-session executor revalidates the same seven-check trusted run and immutable
provider records, verifies local `main` equals `origin/main`, authenticates GitHub CLI as the
configured owner, and publishes the same required authorization status. It has no ruleset bypass. The
command verifies the returned base parent and candidate tree, and the post-merge `main` history check
verifies the exact squash body and tree again. This is a normal sanctioned path, not an administrator
exception.

## Live inspection record

The inspection comment has an exact ordered schema. The merge and tag paths fetch this comment from
GitHub, require the exact comment identity and canonical pull request, rebuild both digests, and reject
a missing, failed, stale, wrong-head, wrong-version, wrong-PR, or incomplete record. Evidence must be
the non-expired, non-empty GitHub Actions artifact from the trusted media-qualification workflow. Its
provider run and canonical workflow endpoint must identify the active checked-in workflow path; the
documented run path must equal the active workflow path returned by the provider; the protected ref is
bound separately through the run's event, branch, head SHA, and canonical workflow ID. Its exact artifact name and independently
verified contents bind the inspected candidate head and both digests. A free-form URL, ordinary visual artifact, or
workflow-run page is not evidence.

```text
Tiny-Rescue-Inspection: pass
Pull-Request: #<number>
Head: <full-pr-head-sha>
Version: <semver>
Artifact-Digest: sha256:<64-lowercase-hex>
Asset-Inventory-Digest: sha256:<64-lowercase-hex>
Browser: <browser and version>
Locales: hu,en
Inputs: mouse,touch
Viewports: 1024x768,1280x800,1366x1024,768x1024
Journeys: <exact-comma-separated-backlog-journey-list>
Evidence: https://github.com/<owner>/<repository>/actions/runs/<run-id>/artifacts/<artifact-id>
Inspector: <name-or-agent-identity>
Timestamp: <UTC-ISO-8601>
Findings: none
```

The exact head is the inspected pre-squash commit. Provider history validation proves that the squash
has the same tree; the independently rebuilt artifact and inventory digests prove that tag publication
still represents that inspected content.

## Explicit approval records

The owner authorizes the operation directly. The exact provider record is then added to the canonical
pull request by the owner or, under ADR-0014, by the implementation agent using the owner's
authenticated session. The merge approval body is:

```text
Tiny-Rescue-Approval: merge
Pull-Request: #<number>
Head: <full-pr-head-sha>
Version: <semver>
Inspection-Comment: #<provider-comment-id>
```

After merge, exact-SHA history/check validation, and qualified-artifact verification, tag approval is
a separate comment:

```text
Tiny-Rescue-Approval: tag
Pull-Request: #<number>
Target: <full-squash-sha>
Version: <semver>
Inspection-Comment: #<provider-comment-id>
Artifact-Digest: sha256:<64-lowercase-hex>
Asset-Inventory-Digest: sha256:<64-lowercase-hex>
```

Whitespace and fields are exact. The configured owner's ordinary `User` comment with repository-owner
association is accepted; bot, app, wrong-user, wrong-PR, wrong-head, wrong-target, edited-field, edited
timestamp, or missing comments fail. `created_at` and `updated_at` must be identical. The merge
approval ID is bound into the squash commit; tag publication refetches and revalidates that comment,
and the tag approval must have a different comment ID. A head change invalidates merge approval. A
rebuilt artifact or asset-inventory change invalidates tag approval. Agents and automation may display
the required template. Under ADR-0014, an implementation agent may also create the exact comment with
the owner's authenticated GitHub session after a direct, unambiguous owner instruction covers that
operation. It must not infer authority, edit the comment, or reuse a stale record. One instruction may
cover both merge and tag, but their comments and workflow runs remain distinct.

Merge workflow dispatch supplies the PR, optional inspection-comment, qualification-run, and
merge-approval-comment IDs.
The inspection ID is required exactly when backlog metadata says `Requires live inspection: yes`;
documentation work and a qualifying non-player-visible PATCH instead use `Inspection-Comment: none`
in the exact approval body. Tag
workflow dispatch supplies the same PR/inspection/qualification identity and the separate
tag-approval-comment ID.
Raw provider merge, local tag push, auto-merge, and hand-edited release tags are forbidden even for
an administrator. The App workflow and `npm run merge:approved` are the only sanctioned merge
executors. The publication workflow's SSH push is the sole allowed tag write. Its private
deploy key becomes available only after the validation job succeeds, without a duplicate manual
environment review. That key can
create a new approved tag but cannot update or delete an existing `v*` tag.

## Watermark evidence boundary

`npm run scan:watermarks` covers authored text, JSON metadata, known binary strings, built output,
commit/PR/tag text, OCR transcripts, visual fixture descriptions, and audio transcript fixtures.
Required legal notices and internal provenance fields remain allowed. This deterministic scan cannot
prove the absence of an unknown logo, subtle signature, spoken tag, or steganographic payload;
full-size human visual inspection and listening QA remain required for production media.
