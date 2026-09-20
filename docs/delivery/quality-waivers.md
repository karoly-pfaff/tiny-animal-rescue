# Quality waiver registry

[`quality-waivers.json`](../../quality-waivers.json) is the machine-authoritative registry for
temporary exceptions to an eligible mechanical quality gate. This document defines its policy. The
default and current state is **no active waiver**.

A waiver is not permission to ignore a finding. It records why a specific tool result is less true
than the narrow exception, who owns the risk, and when the normal gate will be restored.

## Rules

- Product scope, accepted ADRs, child safety/privacy, content counts, localization/audio parity,
  persistence compatibility, and release blockers cannot be waived here.
- High/Critical vulnerability, secret exposure, data-loss risk, failing migration, or inaccessible
  primary flow cannot be waived for release.
- Scope is the exact rule and smallest file/symbol/fixture. Repository-, directory-, or tool-wide
  waivers are forbidden.
- Every waiver names an exact tool/rule/scope and unsuppressed finding fingerprint, owner, backlog
  item, approving user/maintainer, creation/expiry dates, removal milestone, risk, compensating
  evidence, and removal condition.
- Expiry is no later than the next epic milestone. A release-specific waiver may use an earlier
  expiry. Any duration beyond the next milestone requires explicit user approval and an ADR
  amendment. An expired waiver is a failing gate.
- Tools run without inline/file suppressions and emit machine-readable findings. `validate:waivers`
  schema-validates the registry, checks dates/milestones/approval, matches exact fingerprints, filters
  only matched entries, and fails on stale, broadened, missing, or unmatched findings. A tool whose
  unsuppressed report cannot be fingerprinted is not waivable.
- A waiver must not make test collection empty or hide unrelated findings. Tests, type errors,
  content/release contracts, secrets, and static-security findings are not eligible tool classes.
- Waiver creation, extension, or broadening receives independent audit and is called out in the pull
  request and release notes. Repeated waivers require fixing the design or amending the gate contract.

## Active waivers

See `quality-waivers.json`; its `waivers` array is currently empty.

Entry shape is defined only by
[`schemas/quality-waiver.schema.json`](../../schemas/quality-waiver.schema.json). Closed entries leave
the active registry and are recorded in the closing change/release notes with evidence that the
ordinary unsuppressed gate passes again. Git/release history is never rewritten after a waiver affected
a published milestone.
