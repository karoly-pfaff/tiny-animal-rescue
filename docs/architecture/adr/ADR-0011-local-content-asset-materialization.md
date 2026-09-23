# ADR-0011: Materialize production media into local content assets

- Status: Accepted
- Date: 2026-09-22
- Supersedes: ADR-0010

## Context

Production media must remain outside ordinary Git history, but R2 is a distribution origin rather
than a player-runtime content service. Direct browser resolution against R2 would make play depend on
network availability, CORS, remote cache state, and deployment topology. It would also allow a source
checkout or release candidate to look complete while its required local media is absent.

Tiny Rescue needs one reviewable inventory and one deterministic way to obtain the exact media set
required by a product version. The resulting application must build and run from pack-owned local
assets without R2 credentials or player-time network access.

## Decision

R2 is the external source of truth and download origin for production media binaries. A repository
owned synchronization command reads the versioned pack inventories and materializes each required
object at:

```text
content/<pack-id>/assets/<object-key>
```

The materialized files are local build inputs and remain excluded from Git. The synchronization
boundary owns R2 endpoint configuration and credentials; neither is exposed to the browser bundle.
Runtime content records continue to use pack-relative logical keys. The content resolver maps those
keys to packaged local URLs produced from the materialized tree and never constructs a public R2 URL.

Synchronization is deterministic, idempotent, and fail-closed:

- inventories record an immutable digest plus required media metadata for every delivered object;
- object keys reject absolute paths, traversal, backslashes, empty segments, and pack escape;
- downloads use a temporary file and become visible at the final path only after digest, media type,
  dimensions or duration, ownership, and license/provenance checks pass;
- an existing matching file is reused; an existing mismatched file is rejected and never silently
  trusted;
- missing credentials, missing required objects, unexpected redirects, or verification failures
  produce a non-zero result without deleting the last verified local copy;
- a machine-readable local receipt records pack version, inventory digest, object digests, sync time,
  and source identity without credentials or signed URLs.

Development may use a deterministic code-native fallback only while an inventory item is explicitly
`r2-pending`. An epic or patch that claims the corresponding player-visible asset is complete must
materialize and inspect the real object. A required pending, absent, placeholder, or unverified object
cannot satisfy epic closure, product inspection, or release qualification.

Ordinary source-only CI may exercise code-native fallbacks when a backlog item does not claim final
media. Candidate qualification for an epic that owns or changes production media must run asset sync
in an authorized environment, build from the materialized tree, and retain the receipt and artifact
digest as evidence. The built application must not fetch production media from R2 at runtime.

Hosted qualification is split across three fresh runners. A protected `media-qualification` environment exposes
bucket-scoped, read-only R2 S3 credentials only to a trusted materializer checked out from protected
`main`; that job treats candidate locks and inventories as data and never executes candidate code.
It retains verified media and a secret-free receipt as an immutable one-day handoff. A secretless
second job consumes a copy, installs candidate dependencies, builds, runs the visual suite, and emits
only candidate product output. A fresh trusted finalizer never executes candidate code: it downloads
the original handoff and candidate product separately, reconstructs the complete expected receipt
from the tracked locks, remeasures every binary, injects those exact verified bytes into the candidate
product at `build/app/content/<pack-id>/assets/<object-key>`, verifies the packaged copies, and emits
the immutable provider artifact. The application artifact digest is calculated only after that trusted
injection, so it binds the production product to the R2 bytes rather than to candidate-supplied media.
The artifact name binds the candidate SHA, application artifact digest, and asset-inventory digest;
its retained contents include the original receipt, exact materialized objects, production build, and visual
evidence. Merge and tag validation independently recompute those bindings before use.

## Rationale

This preserves small source history and controlled R2 distribution while making the local content
tree the concrete build input that developers and reviewers inspect. Digest verification connects an
external object to versioned metadata, and local packaging removes network behavior from a preschool
child's play session.

## Consequences

- The content platform must provide a repository-owned sync command before remote media can be marked
  delivered.
- The superseded `VITE_ASSET_BASE_URL` runtime host is removed. Qualification sets only the exact
  `VITE_MATERIALIZED_ASSETS=true` availability marker; resolvers construct pack-local relative paths
  and reject any other configured marker value.
- Asset inventories and release gates must distinguish pending metadata from verified, materialized
  media.
- Local media and sync receipts are ignored, but release evidence records their inventory and artifact
  digests.
- A clean source checkout is sufficient for source-only tests but not for a media-complete epic or
  release qualification.
- R2 credentials remain tooling/deployment secrets and never enter source, manifests, logs, receipts,
  or client output.

## Rejected alternatives

- **Load R2 objects directly in the browser:** adds runtime network, CORS, cache, and availability
  dependencies and can expose deployment configuration.
- **Treat manifest entries as proof that media exists:** validates declarations rather than the
  product a reviewer will see.
- **Commit synchronized binaries or receipts:** grows source history and couples clones to generated
  local state.
- **Download without immutable digests:** cannot prove that the inspected or packaged object is the
  reviewed object.
- **Silently retain or regenerate a fallback at epic closure:** turns missing production work into a
  misleading completion claim.
