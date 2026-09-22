# Content contracts

## Purpose

Content should be addable as data and assets without editing engine behavior. JSON Schema catches structural mistakes; semantic validation catches cross-record and product-rule violations.

Executable scripts inside content packs are forbidden.

## Pack structure

```text
content/<pack-id>/
  pack.json
  animals/*.json
  locations/*.json
  shelter-areas/*.json
  missions/*.json
  locales/hu.json
  locales/en.json
  assets/
    images/
    audio/
      shared/
      hu/
      en/
```

## Pack manifest

Required fields:

- stable `id`
- semantic `version`
- supported contract version
- localized pack title keys
- declared locale list
- content directory declarations
- optional dependency list

`version` is a full Semantic Versioning value, including optional prerelease/build metadata. The
bundled `base` pack follows the product version at release. `contractVersion` is a positive integer
for breaking schema/normalization compatibility; compatible optional additions inside one contract
version require deterministic normalization defaults.

The base pack ID is `base`. Cross-pack references require an explicit dependency and use qualified IDs. Base content is not allowed to depend on expansion content.
In v1 the dependency list contains pack IDs only: every pack is bundled and validated in one build,
so there is no remote version-range resolver. Adding dependency ranges or remote resolution is a new
content-platform decision.

Content directory declarations are non-empty pack-relative logical directories made from lower-case
kebab-case path segments separated by `/`. Absolute POSIX/Windows paths, URLs, `.`/`..`, empty
segments, and backslashes fail schema validation before discovery.

## Stable identifiers

- IDs use lower-case kebab-case.
- An ID is globally stable after a public release.
- Display names are localized and may change.
- Mission IDs begin with the location ID for base-game readability.
- References are by ID, never array position or filename.

## Animal record

An animal declares:

- `id`, `species`, and localization keys
- one `shelterAreaId`
- portrait and scene/shelter animation assets
- allowed shelter reactions from a fixed enum
- language-neutral effect cues
- optional tags used only for selection and validation

An animal does not define mission logic or arbitrary animation callbacks.

## Mission record

```ts
type Mission = {
  id: string;
  type: 'rescue' | 'help' | 'world';
  locationId: string;
  subjectAnimalId?: string;
  prerequisites: MissionPrerequisite[];
  scene: SceneDefinition;
  steps: MissionStep[];
  reward: MissionReward;
  localization: MissionLocalizationKeys;
  assets: MissionAssets;
};
```

The accepted step union is:

```ts
type MissionStep = TapStep | DragStep | WipeStep | MatchStep | TraceStep;
```

Every step has a stable step ID, prompt key, visual targets, success cue, and hint strategy. Per-type settings are constrained and defaulted during normalization.

## Reward rules

```ts
type MissionReward = {
  completeMission: true;
  unlockResidentId?: string;
  worldFlags?: string[];
};
```

- Rescue must unlock exactly the subject resident.
- Help and World must not unlock a resident.
- Rewards are idempotent.
- Unknown reward actions fail validation.

## Scene definition

Scenes are layered declarations:

- background
- decorative elements
- interactive elements
- character layers
- effect anchors
- safe UI zones

Positions use normalized coordinates relative to a 1024×768 design surface. The layout adapter handles aspect-ratio fit and safe-area margins. Hit areas are explicit and may exceed visible bounds.

## Asset references

Asset references are pack-relative logical object keys governed by
[ADR-0011](adr/ADR-0011-local-content-asset-materialization.md). Production media binaries live
outside Git and are distributed from R2; pack inventories, prompt provenance, QA, ownership, and
delivery metadata remain versioned. A repository-owned sync step verifies and materializes them into
the ignored local pack tree before build. The runtime resolver maps logical keys to packaged local
URLs and rejects:

- absolute URLs
- parent-directory traversal
- undeclared cross-pack paths
- missing materialized objects, digest mismatches, or unverified pending release assets
- wrong media types
- locale audio stored in a shared directory

Required image metadata includes intended role, dimensions, and whether transparency is expected. Required audio metadata includes role, locale where applicable, and duration bounds where narration timing matters.

Ignored local working media may satisfy dimension and visual QA during development. A code-native
fallback may cover an `r2-pending` decorative asset, but it does not make that asset epic- or
release-ready when the backlog item claims the corresponding production media.
Visual-regression baselines and presentation-only references are evidence, not runtime assets.

A media-complete candidate also provides one tracked
`content/<pack-id>/assets/materialization-lock.json` per affected pack. Schema version 1 records the
pack ID/version, source `r2`, and a non-empty object list. Each object records a safe pack-relative
object key, `sha256:<hex>` digest, exact byte count, media type, pack ownership, approved QA/license/
provenance states, and either positive image dimensions or positive audio duration in milliseconds.
The trusted materializer rejects missing/duplicate/traversing keys, metadata drift, redirecting or
non-HTTPS origins, response media-type drift, and any byte/digest mismatch before atomic placement.
The materializer detects the binary media type, measures image dimensions or audio duration from the
downloaded bytes, and requires those measurements to equal the lock. The resulting ignored receipt
binds the candidate head, complete tracked asset-inventory digest, source identity, sync time,
pack/version, complete lock metadata, and measured properties of every materialized object without
including a credential or signed URL. Qualification reconstructs the object set from the tracked
locks, then the trusted finalizer re-detects and remeasures each original handoff object. It copies
those exact bytes into the production artifact at
`build/app/content/<pack-id>/assets/<object-key>`, verifies every packaged copy against the receipt,
scans both original and packaged binary metadata for forbidden watermark/attribution markers, and
requires the bundle to reference the local pack prefix and every locked object key. Remote production
media URLs are forbidden. Root product and base-pack versions must match the trusted backlog target;
only then is the application artifact digest calculated. A self-consistent replacement file and
replacement receipt, a candidate-supplied substitute in the product, an unused injected object,
remote runtime media, version drift, or forged dimensions/duration therefore fail.

## Localization keys

Every key used by a record must exist in each locale declared by the pack. Base release validation requires both `hu` and `en`. Extra keys are warnings initially; missing keys are errors.

## Semantic validation

In addition to schema validation, CI verifies:

- unique IDs across the assembled registry
- all references resolve
- prerequisite graph is acyclic
- every base Rescue unlocks exactly one unique resident
- Help missions depend on their resident's Rescue mission
- resident count does not exceed shelter capacity
- every base mission has 2–4 steps, except an approved trace-only case
- only accepted interaction and reaction enums are used
- base scope matches the normative catalog
- every required asset is owned by the declaring pack or dependency
- all runtime localization and audio keys exist for HU and EN

## Examples and schemas

Machine-readable examples are in `content/examples/`. Initial JSON Schemas are in `schemas/`. The TypeScript model remains the runtime authority, while schema/type compatibility is tested in CI.
