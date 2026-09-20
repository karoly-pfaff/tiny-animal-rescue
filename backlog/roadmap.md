# Delivery roadmap

The roadmap uses evidence-based milestones rather than calendar promises. Each milestone produces a playable or operational result.

## M0 — Repository ready (`v0.1.0`)

Epic: EPIC-000

Outcome: a clean frozen install can pass the complete quality baseline, build, and preview. Required CI
checks, architecture boundaries, report retention, and review governance exist without speculative
product infrastructure.

## M1 — First real rescue (`v0.2.0`)

Epic: EPIC-001

Outcome: a child can launch the app, enter the Garden, rescue Mimi using drag and tap, celebrate,
reload, and find Mimi in a minimal shelter.

This is the first product checkpoint. Art may be temporary but must be intentional, identifiable,
text-free, and covered by the continuous browser/visual gates.

## M2 — Declarative content platform (`v0.3.0`)

Epic: EPIC-002

Outcome: the first rescue loads through a versioned, schema- and semantics-validated base pack, and a
test-only pack proves the build-time expansion seam without executable content.

## M3 — Interaction and guidance engine (`v0.4.0`)

Epic: EPIC-003

Outcome: all five interaction primitives and the common guidance ladder work from normalized content,
with deterministic lifecycle, cancellation, touch/mouse, visual, and browser evidence.

Gate: demonstrate at least one contract-only sample scene for each primitive.

## M4 — Complete map and progression (`v0.5.0`)

Epic: EPIC-004

Outcome: the four-location map, authored unlock order, rescue-call presentation, deterministic
progression, and replay model work across supported layouts.

## M5 — Shelter and robust persistence (`v0.6.0`)

Epic: EPIC-005

Outcome: the three shelter areas, twelve-resident capacity, atomic/idempotent rewards, resumable
progress, sequential migrations, and parent-gated reset work together.

## M6 — Localization, audio, and parent settings (`v0.7.0`)

Epic: EPIC-006

Outcome: HU and EN are feature-equivalent, audio-first guidance is deterministic and mute-safe,
typography is complete, and parent settings persist behind the child-safe boundary.

## M7 — Content complete (`v0.8.0`)

Epic: EPIC-007

Outcome: all sixteen missions, twelve residents, four locations, and localized media are integrated
and pass content gates.

Gate: full content playthrough with zero engine edits required solely for an individual mission.

## M8 — Child-ready candidate (`v0.9.0`)

Epic: EPIC-008

Outcome: a responsive, performant, accessible, visually coherent candidate is validated through
automated checks, full viewport evidence, and privacy-preserving observed child-flow feedback.

## M9 — Release-ready candidate (`v0.10.0`)

Epic: EPIC-009

Outcome: reproducible production artifact, completed release checklist, release notes, license and
provenance inventory, expansion-seam evidence, and no unresolved release blocker.

After M9 passes without behavioral change, the candidate is promoted to `v1.0.0` by the release-only
procedure in [GA promotion](../docs/delivery/ga-promotion.md).

## Scope checkpoints

At M1, confirm the core rescue fantasy. At M3, freeze engine behavior. At M7, freeze content count.
Any post-freeze change to those dimensions needs explicit scope approval.

Implementation may overlap where dependency rules permit, notably EPIC-006 work after the first rescue
and content contracts stabilize. Milestone closure, version bumps, and tags remain serial and may not
skip an earlier epic claim.
