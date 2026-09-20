# Versioning and milestone policy

Tiny Rescue follows [Semantic Versioning 2.0.0](https://semver.org/) for the product and content-pack
versions. Product versions are evidence-based delivery claims: a version advances because a milestone
exit criterion passed, never because a date arrived or a branch was merged.

## Independent version lines

| Version line | Format | Authority |
|---|---|---|
| Product | SemVer `MAJOR.MINOR.PATCH` in the root `package.json` | Player-visible application and bundled base game |
| Content pack | SemVer in `pack.json` | Pack declarations and assets; the bundled `base` pack matches the product release |
| Content contract | Sequential positive integer in `contractVersion` | Breaking schema/normalization compatibility accepted by the engine |
| Save schema | Sequential positive integer | Forward-only pure migrations under ADR-0006 |
| Specification baseline | SemVer-like document revision in the root README | Planning document set; not a shipped product claim |

Do not couple independent lines accidentally. A product patch need not bump the save schema; a save
migration always requires a product release; a content-contract change bumps the base pack only when
the pack representation changes.

In v1, a pack dependency names a pack ID but no version range because every pack is bundled and
validated as one build. Pack SemVer records release/provenance identity; `contractVersion` decides
engine compatibility. Remote resolution or dependency ranges would require a later contract decision.

## Epic-to-release map

Before EPIC-000 exits, the unimplemented product line is `0.0.0`. Every epic is exactly one backlog
milestone and earns exactly one `0.x.0` minor when all of its acceptance and exit criteria pass.

| Milestone | Epic | Product version | Evidence claim |
|---|---|---:|---|
| M0 | EPIC-000 | `0.1.0` | Reproducible repository and enforced quality baseline |
| M1 | EPIC-001 | `0.2.0` | First complete persisted rescue |
| M2 | EPIC-002 | `0.3.0` | Validated declarative content platform |
| M3 | EPIC-003 | `0.4.0` | Five production interaction primitives and guidance |
| M4 | EPIC-004 | `0.5.0` | Complete map, progression, and replay |
| M5 | EPIC-005 | `0.6.0` | Three-area shelter and robust persistence |
| M6 | EPIC-006 | `0.7.0` | Feature-equivalent HU/EN audio-first experience and settings |
| M7 | EPIC-007 | `0.8.0` | Complete normative v1 content catalog |
| M8 | EPIC-008 | `0.9.0` | Child-ready, accessible, responsive release candidate |
| M9 | EPIC-009 | `0.10.0` | Reproducible, audited v1 release candidate |

Work on later epics may proceed in parallel when dependencies allow, but versions and milestone claims
are recorded in order. A partially complete epic does not publish its target minor.

After M9 is signed off, the same candidate may be promoted to `1.0.0` only through the separate
[GA promotion procedure](ga-promotion.md). That procedure permits version and release-metadata edits
only, reruns `validate:release`, and checks artifact identity. Any behavioral, dependency, content,
configuration, or build-pipeline fix discovered during promotion produces `0.10.1` (or another
candidate patch) first; the fixed artifact must be requalified before `1.0.0`.

## Increment rules

During `0.x` development:

- **Minor** — reserved for the next epic exit according to the table. It may contain all accepted
  stories and fixes in that epic.
- **Patch** — a compatible correction to an already recorded epic release that does not claim the
  next epic's outcome. Patch releases include a regression test.
- **Prerelease** — `-alpha.N`, `-beta.N`, or `-rc.N` for distributable review builds that have not met
  the target exit criteria. Prerelease tags never replace the final milestone tag.
- **Build metadata** — `+<commit>` may identify CI artifacts but does not create a new release or alter
  precedence.

From `1.0.0` onward:

- **Patch** fixes incorrect behavior without changing a public contract.
- **Minor** adds backwards-compatible product capability or deprecates a supported contract.
- **Major** changes a public player, content, persistence, or integration contract incompatibly.

The public contract includes documented player behavior, content schemas and enum semantics, pack
resolution, save compatibility, and supported runtime entry points. A guarantee withdrawn can be
breaking even when a field becomes "more optional."

## Compatibility rules

- Stable content IDs never change after `1.0.0`. A display name may change through localization.
- Within one content-contract integer, an optional field may be added only with a deterministic
  normalization default. Removing/renaming a field, changing meaning/default, or making an optional
  field required increments `contractVersion`.
- The engine rejects unsupported contract versions with a parent-readable diagnostic; it never
  guesses.
- Save schema migrations are sequential, forward-only, pure, and tested from every supported prior
  version. Unknown future save versions are preserved, never overwritten.
- A deprecation names its replacement and removal release and remains tested until that release.

## Release mechanics

- The root `package.json` is the product-version source of truth once EPIC-000 creates it. Parent
  Settings reads that value through build metadata rather than duplicating a literal.
- The bundled base pack version and release notes change in the same release pull request.
- A milestone tag is annotated and named `v<MAJOR>.<MINOR>.<PATCH>`, for example `v0.4.0`.
- Tags are immutable. A bad release is superseded by a new patch; tags and published artifacts are
  never replaced in place.
- The release change includes the epic exit evidence, successful applicable aggregate gate
  (`validate:full`, or `validate:release` from M7), relevant screenshots/playthrough record,
  migration notes, dependency/license changes, and known limitations.
- Version numbers are not bumped speculatively at epic start. Development builds derive the upcoming
  target from the backlog. After every story is behaviorally qualified, the metadata-only closure
  commit may stage the target as a candidate for final-head validation; this does not advance the
  milestone. Protected `main` remains authoritative, and only the validated squash merge plus
  immutable tag earn and publish the new version.
