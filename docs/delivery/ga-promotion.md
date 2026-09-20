# GA promotion procedure

This procedure promotes the already qualified M9 release candidate to the v1 general-availability
release. It is deliberately outside EPIC-009: M9 closes at `0.10.0`, and its own exit cannot depend on
evidence created only after that closure.

## Preconditions

- EPIC-009 and M9 are closed with a reproducible `0.10.0` artifact.
- The [release-candidate checklist](release-checklist.md) is complete.
- `v0.10.0` is immutable and its product version, base-pack version, release notes, build metadata,
  SBOM/provenance inventory, and artifact digest agree.
- The final independent audit has no unresolved High finding. Every Medium is fixed or explicitly
  declined with a recorded rationale.
- No non-waivable item is outstanding. Any eligible mechanical exception is an active exact entry in
  `quality-waivers.json` and passes `validate:waivers`.

If any source, behavior, dependency, content, configuration, asset, or build-pipeline correction is
needed, stop promotion. Make a `0.10.x` candidate patch, rerun the M9 release checklist and independent
audit, and begin this procedure again with the requalified artifact.

## Allowed promotion diff

Only these authored changes are permitted:

- root product version `0.10.x` to `1.0.0`;
- bundled base-pack version to `1.0.0`;
- GA release notes and build/release metadata that identify the same qualified candidate;
- generated integrity records that necessarily encode the new version metadata.

The diff must not change production or test logic, dependencies or lockfile resolution, content
records other than the base-pack version, schemas, assets, tool configuration, CI behavior, or quality
thresholds. A reviewer compares the promotion commit to the qualified candidate and fails on any
other change.

## Required verification

From a clean checkout of the promotion commit:

```text
npm ci
npm run validate:release
```

The run must prove that all constituent gates collected work, scanned non-empty eligible inputs, and
produced the required reports. Recompute the production artifact, SBOM/provenance inventory, and
digest. Verify the player-visible artifact is identical to the qualified candidate except for
authorized version/release metadata.

Dispatch a fresh-context independent audit limited to the candidate-to-promotion diff and the
identity evidence. The two-round rule in `AGENTS.md` applies.

## Publication and record

Before creating the tag, verify all of the following agree on `1.0.0` and the same artifact identity:

- root product and bundled base-pack versions;
- GA release notes and build metadata;
- SBOM and asset provenance/license inventory;
- artifact digest and retained validation evidence.

Create the annotated immutable `v1.0.0` tag only after those checks pass. Published tags and artifacts
are never replaced. If publication reveals a defect, supersede it with the appropriate SemVer patch;
do not move `v1.0.0` or rewrite its evidence.
