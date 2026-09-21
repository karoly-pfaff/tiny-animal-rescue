# ADR-0010: External delivery for production media

- Status: Accepted
- Date: 2026-09-21

## Context

Production illustrations, animation frames, music, narration, and effects are large binary outputs.
Keeping them in normal Git history would make every clone and historical checkout permanently carry
superseded media. Tiny Rescue still needs reviewable ownership, prompt provenance, dimensions,
localization coverage, and deterministic references before those binaries are uploaded to R2.

Presentation references and visual-regression screenshots serve a different purpose: they are small,
reviewable test evidence and are not runtime production media.

## Decision

Production media binaries are never committed to Git. Each content pack owns a versioned asset
inventory that records a stable semantic ID, pack-relative R2 object key, role, dimensions, ownership,
license/provenance status, QA status, prompt record, and delivery state. Prompt records and inventory
metadata remain in Git. Local working copies use the same pack-relative layout but are ignored.

Content records continue to contain logical pack-relative references, never absolute remote URLs. The
content resolver is the only boundary allowed to combine an inventory object key with the trusted
deployment base configured by `VITE_ASSET_BASE_URL`. This delivers binary payloads remotely without
turning content packs into remotely executable or remotely defined content.

An `r2-pending` asset may use a deterministic code-native fallback during development. It cannot pass
a release gate as delivered. Before a release marks an asset delivered, automation must verify the R2
object, expected media metadata, and an immutable digest recorded in the inventory. Runtime failures
degrade safely for optional decoration; required instructional media remains a release-blocking error.

Visual-regression baselines and presentation-only references may remain in Git because they are test
and design evidence, not production payloads. They may never be resolved by the runtime asset loader.

## Rationale

This keeps repository history small while preserving reviewable contracts and ownership. Logical
object keys prevent deployment hosts from leaking into content, and one resolver keeps CDN/R2 changes
out of components. A pending state supports work before upload without falsely claiming that a release
asset exists.

## Consequences

- `.gitignore` must cover every production media extension under pack asset directories.
- Asset validation fails on unsafe keys, missing inventory/provenance, unapproved QA/license status,
  wrong local dimensions, or unowned local working media.
- Deployment and release work must upload media and replace `r2-pending` with verified delivery and
  digest metadata before release.
- Local visual work can use ignored files, but CI must build and run meaningful tests without them.
- R2 object lifecycle, credentials, CORS, and cache policy remain deployment concerns; no secret enters
  the client bundle or content records.

## Rejected alternatives

- **Commit binaries directly:** permanently inflates every clone and preserves superseded output.
- **Use Git LFS:** still couples ordinary source history and checkout availability to binary delivery.
- **Store absolute CDN URLs in content:** leaks deployment topology into authored packs and bypasses the
  resolver boundary.
- **Embed data URIs or generated base64:** bloats source and bundles while evading media validation.
- **Allow missing required assets at release:** turns a known delivery defect into a child-facing
  runtime failure.
