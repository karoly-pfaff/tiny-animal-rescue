# v1.0 scope

## Release statement

v1.0 is a finished base game, not an early-access shell. It ships with a beginning, a complete resident collection, four distinct locations, sixteen authored missions, and a three-area shelter.

## In scope

### Player-facing

- start screen
- first-run language selection, with later change in parent settings
- rescue map
- mission scene runtime
- five interaction primitives
- rescue celebration
- three shelter areas
- resident tap interactions
- replay completed missions
- audio replay and mute controls
- persistent local progress
- Hungarian and English content parity
- child-safe parent settings and progress reset

### Content

- 4 locations
- 12 resident animals
- 16 missions
- all required backgrounds, sprites, animations, narration, effects, and music
- text-free visual assets with runtime localization layers

### Engineering

- schema-validated declarative content packs
- base content pack
- stable content IDs
- asset ownership and reference validation
- save schema versioning and migration framework
- unit, integration, content, E2E, and visual regression checks
- responsive support for the agreed tablet viewport matrix
- production build and static preview

## Out of scope

- downloadable content marketplace
- remote pack delivery
- account sync or cloud saves
- editor/workbench UI
- mod execution or arbitrary content scripts
- multiplayer or sharing
- notifications
- analytics or telemetry
- procedural generation
- more than five interaction types
- more than 12 residents or 16 missions
- native-store release work unless separately authorized
- additional languages beyond HU and EN

## Supported viewport baseline

The reference design viewport is 1024×768 landscape. v1 must also remain usable at:

- 1280×800 landscape
- 1366×1024 landscape
- 768×1024 portrait, with a supported rearranged layout rather than simple cropping

Small-phone optimization is not a v1 goal. Desktop mouse input is supported for development and caregiver use, but touch is primary.

## Content capacity

The base shelter has exactly three areas with up to four residents each:

- Indoor Room
- Garden
- Pondside

Future packs may add a new shelter area. They must not overcrowd existing base areas or increase base capacity invisibly.

## Release gates

v1.0 may ship only when:

- all 16 missions are completable in HU and EN;
- all 12 Rescue missions unlock their correct resident exactly once;
- all residents render in the correct shelter area;
- no missing, cross-pack, placeholder, or baked-text production asset remains;
- save/reload and supported migrations pass;
- critical E2E flows pass at every supported viewport;
- all static quality, coverage, content, dependency/license, build/preview, E2E, and visual gates pass
  from a clean frozen install with no unapproved waiver;
- audio, mute, and visual hints work together;
- a manual playthrough finds no blocking navigation or input issue;
- the child-safety and privacy checklist is complete;
- the release version, base-pack version, notes, build metadata, and immutable tag are consistent
  under the versioning policy.

## Change budget

After the first vertical slice is accepted, changes that add a new system or interaction type require explicit scope approval and an ADR. Content refinements and accessibility improvements are allowed when they do not expand the fundamental system set.
