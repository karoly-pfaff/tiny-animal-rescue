# Repository governance operations

The checked-in GitHub policy is authoritative for the hosted repository. It turns the quality and
history contracts into reproducible provider settings rather than relying on remembered UI choices.

## Authoritative files

- [repository settings](../../deploy/github/repository-settings.json) allow squash merge only, use
  the already validated pull-request title/body as the default, and delete the merged epic branch;
- [main ruleset](../../deploy/github/main-ruleset.json) blocks deletion and non-fast-forward updates,
  requires a pull request, rejects stale heads, and requires the seven quality checks plus an
  `authorization` status pinned to a dedicated GitHub App; that least-privilege app is the ruleset's
  only bypass actor so normal users and the generic GitHub Actions app cannot merge without it;
- [release-tag creation ruleset](../../deploy/github/tag-ruleset.json) blocks direct creation of
  `v*` tags; its sole bypass class is the dedicated release deploy key;
- [release-tag immutability ruleset](../../deploy/github/tag-immutability-ruleset.json) blocks update
  and deletion of `v*` tags with no bypass actor, including the release deploy key;
- [approval policy](../../deploy/github/approval-policy.json) names the repository owner whose exact
  provider comment can authorize a candidate;
- [release-publisher policy](../../deploy/github/release-publisher.json) names the protected
  environment, its required owner reviewer, its private-key secret, and the only allowed write deploy
  key;
- [required CI](../../.github/workflows/ci.yml) runs without path filters for pull requests,
  merge-queue candidates, `main`, and milestone tags;
- [merge automation](../../.github/workflows/merge-epic.yml) builds source-only work without secrets
  or consumes and revalidates the exact qualified-media artifact for inspected work, then uses a fresh
  runner, trusted `main` policy checkout, protected environment, and dedicated App token to recheck the
  seven quality statuses, exact-head inspection where required, and owner approval; it proves the PR
  head contains the current `main` tip, refetches the open PR and `main` ref immediately before passing
  the validated title and body plus the immutable merge-approval comment footer to the squash API,
  and runs under one repository-wide merge
  concurrency group so no other authorized writer can advance `main` between that snapshot and merge;
- [authorization-publisher policy](../../deploy/github/authorization-publisher.json) names the
  protected environment and the only App credentials allowed to perform that merge;
- [media-qualification policy](../../deploy/github/media-qualification.json) and
  [workflow](../../.github/workflows/qualify-media.yml) isolate read-only R2 credentials from all
  candidate-controlled execution, keep the original media/receipt handoff in a different job, and use
  a third candidate-free finalizer to remeasure and watermark-scan original and packaged bytes,
  require pack-local runtime references, reject remote media URLs, bind product/base-pack version, and
  retain the receipt-bound build/visual artifact;
- [tag publication](../../.github/workflows/publish-tag.yml) consumes that exact qualified artifact,
  validates the actual squash subject/body/tree, waits for every exact-SHA trusted `main` check,
  validates inspection and separate tag approval against both digests, uploads a tag specification,
  and only then lets a second owner-reviewed job obtain the dedicated deploy key.

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
Store the HTTPS S3 origin, bucket, access-key ID, and secret access key only as `R2_ENDPOINT`,
`R2_BUCKET`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` secrets of the `media-qualification`
environment. They are never repository secrets. The trusted materializer signs direct S3 GETs for
region `auto`, rejects redirects, and never emits credentials or signed URLs.

None of these protected secret names may also exist as a repository secret or as an organization
secret exposed to this repository. Environment scoping is the authorization boundary, not merely a
name-precedence convention. Reconciliation paginates and rejects repository-level duplicates. Because
the repository endpoint cannot enumerate inherited organization-secret exposure, the owner must also
verify the organization Actions-secret access list in GitHub whenever governance is bootstrapped or
credentials are rotated, and retain that provider-side review with the governance evidence.

The command patches repository merge settings, creates or updates the branch and both tag rulesets,
configures all three protected environments to require `karoly-pfaff` approval and protected branches,
and reads the result back. It paginates the complete deploy-key and repository-secret collections
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
workflow run. Tag-triggered history resolves the retained qualification from the recorded inspection,
downloads it by exact run/name, and independently verifies it instead of comparing a source-only
fallback build to a media-complete digest.

The authorization App posts `pending` before validation. It keeps that status non-successful while it
uses its narrow ruleset bypass to perform the already validated squash, and posts `success` only after
the provider reports the merge complete. Candidate workflows cannot forge the App-pinned context, and
there is no cached pre-merge success for an edited comment to reuse. Its contents-write token exists
only in the fresh protected-environment job, after candidate validation, and that job checks out and
runs policy from protected `main`, never candidate code. The initial adoption of this
contract is a one-time bootstrap: before the trusted workflow exists on `main`, the complete diff and
gates are presented for explicit user approval and merged under the preceding protection; only then is
the App/ruleset reconciliation applied. This bootstrap is not reusable for later work items.

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

The owner records approval as an exact comment on the canonical pull request. The merge approval body
is:

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
the required template but must not create or edit the owner's approval comment.

Merge workflow dispatch supplies the PR, optional inspection-comment, qualification-run, and
merge-approval-comment IDs.
The inspection ID is required exactly when backlog metadata says `Requires live inspection: yes`;
documentation-only work instead uses `Inspection-Comment: none` in its exact approval body. Tag
workflow dispatch supplies the same PR/inspection/qualification identity and the separate
tag-approval-comment ID.
Direct provider merge, local tag push, auto-merge, and hand-edited release tags are forbidden even for
an administrator. The publication workflow's SSH push is the sole allowed tag write and requires a
separate protected-environment approval before its private deploy key becomes available. That key can
create a new approved tag but cannot update or delete an existing `v*` tag.

## Watermark evidence boundary

`npm run scan:watermarks` covers authored text, JSON metadata, known binary strings, built output,
commit/PR/tag text, OCR transcripts, visual fixture descriptions, and audio transcript fixtures.
Required legal notices and internal provenance fields remain allowed. This deterministic scan cannot
prove the absence of an unknown logo, subtle signature, spoken tag, or steganographic payload;
full-size human visual inspection and listening QA remain required for production media.
