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
    manifest.json
    images/
    audio/
      shared/
      voice/
        hu/
        en/
```

## Pack manifest

Required fields:

- stable `id`
- semantic `version`
- supported contract version
- localized pack title keys
- optional `initialMissionId` for the one pack that owns the application entry mission
- declared locale list
- content directory declarations
- optional dependency list

`version` is a full Semantic Versioning value, including optional prerelease/build metadata. The
bundled `base` pack follows the product version at release. `contractVersion` is a positive integer
for breaking schema/normalization compatibility; compatible optional additions inside one contract
version require deterministic normalization defaults.

### Contract-version behavior

The runtime supports exactly the contract versions it names; contract version 1 is the only supported
version for M2. Structural validation runs before normalization. The normalizer rejects an unknown
version with a parent-readable diagnostic and never guesses, coerces, or silently falls back.

Within one contract version, a newly optional field is compatible only when the runtime applies one
documented deterministic default and tests the omitted form. Removing or renaming a field, changing
its meaning or default, making an optional field required, or changing an enum member's semantics
requires the next integer contract version and a deliberate migration/compatibility decision. Pack
SemVer records content releases; it does not replace the integer format contract.

In contract version 1, an omitted pack `dependencies` field normalizes to an immutable empty list. An
omitted `initialMissionId` means that the pack does not own the application entry mission. The bundled
application requires exactly one declaration across its assembled packs; ambiguity is an error, never
a pack- or filename-order choice. The declared mission must belong to that pack and be a
prerequisite-free two-step Rescue whose ordered steps are authored drag then tap.

Every locale named by the manifest must have exactly one `locales/<locale>.json` document. Discovery
fails when a declared document is absent, and semantic validation requires the pack title plus every
animal, location, shelter-area, mission, and step key referenced by that pack in every declared
locale. The assembled registry exposes immutable localization documents; runtime content selects text
from those documents rather than duplicating content copy in application code.

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
- portrait and scene/shelter animation assets; `assets.mission` optionally selects a dedicated mission
  cutout and otherwise falls back to the portrait
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
A drag step may declare a `sourceAsset` logical key when its movable source is authored media. The
reference follows the same ownership rules as every other content asset and must exist in the owning
inventory; omitting it means the reusable interaction supplies code-native presentation.
`snapTolerance` scales the authored target hit region from `0.1` through `1` relative to the contract
version 1 baseline of `0.55`; larger values are more forgiving. The runtime consumes each step's
ordered prompt, hint delay, source/target identifiers, and success cue. Production sound playback for
those semantic cues is integrated only when its asset set has passed the audio workflow.

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

Asset references are logical object keys governed by
[ADR-0011](adr/ADR-0011-local-content-asset-materialization.md). An unqualified reference such as
`images/residents/mimi/canonical.png` resolves only inside the declaring pack. A reference owned by a
declared dependency uses `<pack-id>:<object-key>`, for example
`base:images/residents/mimi/canonical.png`. Inventory `objectKey` values are always unqualified,
lower-case, pack-relative paths; a pack prefix belongs only in a content-record reference. A
qualified reference does not grant access by itself: the consumer must declare that pack in
`dependencies`, and the referenced inventory record must be owned by that dependency.

Production media binaries live outside Git and are distributed from R2; pack inventories, prompt
provenance, QA, ownership, and delivery metadata remain versioned. A repository-owned sync step
verifies and materializes them into the ignored local pack tree before build. The runtime resolver
maps logical keys to packaged local URLs and rejects:

- absolute URLs
- parent-directory traversal
- undeclared cross-pack paths
- missing materialized objects, digest mismatches, or unverified pending release assets
- wrong media types
- locale audio stored in a shared directory

Run `npm run assets:sync` from a clean checkout after setting the trusted `R2_ENDPOINT`, `R2_BUCKET`,
`R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` environment variables. The command reads only tracked
materialization locks, downloads each exact object, and writes verified media plus the secret-free
receipt under the ignored candidate tree. `npm run test:assets:materialized` then checks lock,
inventory, byte, digest, media-type, dimension/transparency, ownership, provenance, license, and QA
parity before a media-complete build. Neither the downloaded binaries nor the receipt may be added to
Git.

Required image metadata includes category, intended role, media type, positive dimensions, and
whether transparency is expected. Required audio metadata includes category, role, media type,
positive duration bounds, and a locale for voice only. Voice objects live under
`audio/voice/<locale>/`; shared music and effects live under `audio/shared/` and may not claim a
locale. Every referenced key must have exactly one inventory record. A media-complete check also
requires the file itself and verifies its detected media type, byte count, digest, dimensions or
duration, and transparency against the inventory and materialization lock.

Release validation rejects a referenced record unless QA, license, and provenance are approved; its
classification is `production-safe`; delivery is `r2-locked`; positive byte count and a valid SHA-256
digest are present; and its ID, role, and object key do not identify a draft, fallback, placeholder,
or temporary asset. Source-only CI may omit external bytes, but `test:assets:materialized` is
mandatory for any epic or patch that claims the affected production media complete.

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
