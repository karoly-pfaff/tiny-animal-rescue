# EPIC-007: v1 content production

- Status: Planned
- Milestone: M7
- Target version: `0.8.0`
- Inspection journeys: `all-missions,all-residents`
- Dependencies: EPIC-003, EPIC-004, EPIC-005, EPIC-006
- ADRs: ADR-0002 through ADR-0005, ADR-0008

## Outcome

Produce and integrate the normative base-game catalog: four locations, twelve residents, sixteen missions, three shelter areas, and complete HU/EN media.

## Production rule

Individual mission work may add content, art, audio, composition data, and tests. It must not add mission-ID branches or a sixth interaction primitive. A real contract defect is fixed centrally and regression-tested before content work resumes.

## Stories

### E007-S01 — Asset bible and production templates

- [ ] Art direction defines palette, line/shape language, character proportions, animation states, lighting, and no-text rules.
- [ ] Templates specify 1024×768 scene composition, safe UI zones, hit regions, export sizes, transparency, and filenames.
- [ ] Audio brief defines narrator delivery, loudness targets, effect style, music loops, and language inventory.
- [ ] Asset provenance and license records are mandatory.
- [ ] The root asset prompt pack, repo-local visual-production skill, and `prompts/images/` templates
      implement the approved visual style lock, production/presentation split, negative constraints, and
      asset routing.
- [ ] The same asset prompt pack, its music/effects style locks, catalog, and integration guide define
      semantic audio IDs, generation constraints, edit/loop/export workflow, and mix intent.
- [ ] Every approved asset records its final prompt, tool/date when known, references, dimensions,
      transparency, production-safe classification, full-size QA, known defects, and provenance/license.
- [ ] Every approved music/effect asset records its runtime ID, final source prompt, tool/date when
      known, edit/mastering history, duration/format, repeat/overlap QA, exported path, and
      provenance/license.
- [ ] Concepts in `screens/` remain presentation-only and cannot resolve as production assets.

### E007-S02 — Garden content set

- [ ] `garden-kitten-tree`, `garden-puppy-tangled-leash`, `garden-frog-too-dry`, and `garden-mimi-find-ball` are complete.
- [ ] Mimi, Morzsi/Biscuit, and Breki/Hoppy resident assets are complete.
- [ ] Garden location/map/shelter-compatible art and HU/EN audio pass validation.
- [ ] Mission 1 remains the polished tutorial baseline.

### E007-S03 — Forest content set

- [ ] `forest-hedgehog-branches`, `forest-bird-nest`, `forest-squirrel-lost-acorns`, `forest-fawn-stuck-twig`, and `forest-suni-picnic` are complete.
- [ ] Süni/Prickle, Csipi/Peep, Makk/Acorn, and Rozi/Rosie resident assets are complete.
- [ ] Layered vegetation never hides active targets or drag corridors.

### E007-S04 — Farm content set

- [ ] `farm-chick-find-mother`, `farm-lamb-fence`, and `farm-piglet-mud-wash` are complete.
- [ ] Pipi and Pamacs/Floss resident assets are complete.
- [ ] The visiting piglet is clearly a mission subject, not an omitted shelter resident.

### E007-S05 — Pond content set

- [ ] `pond-turtle-find-water`, `pond-duckling-reeds`, `pond-fish-small-puddle`, and `pond-clear-litter` are complete.
- [ ] Totó/Toto, Kiki, and Habi/Bubbles resident assets are complete.
- [ ] Water boundaries, safe paths, and trace corridors are visually unambiguous.

### E007-S06 — Shelter final art and resident placement

- [ ] Indoor Room, Garden, and Pondside final backgrounds are integrated.
- [ ] Twelve residents fit at supported viewports with distinct idle silhouettes.
- [ ] Resident animations and reaction anchors do not overlap navigation controls.

### E007-S07 — Localized content completion

- [ ] Every mission and resident key exists in HU and EN.
- [ ] Every required narration file is final, correctly mapped, and within agreed loudness/duration bounds.
- [ ] No machine placeholder or temporary voice remains in release mode.

### E007-S08 — Catalog and full-playthrough gate

- [ ] Release validator requires exact normative IDs and counts.
- [ ] All missions can be completed in a clean progression playthrough.
- [ ] All missions can be replayed from an all-complete save.
- [ ] No individual mission required an engine-ID branch.
- [ ] Content defect log is empty or explicitly accepted for post-release.

## Exit criteria

- The complete v1 catalog passes schemas, semantics, ownership, localization, audio, and asset gates.
- Full HU and EN playthroughs have no content blocker.
- Content count is frozen after this epic.

## Verification

```text
npm run test:content:release
npm run test:integration
npm run test:e2e
npm run test:visual
npm run validate:release
```

Inspect clean HU and EN full playthroughs, all-complete replay, exact catalog, prompt/provenance/visual
QA inventory, asset ownership, and proof that no mission required an engine-ID branch.

## Primary risks

- asset and narration throughput, not code;
- inconsistent visual composition across separately produced missions;
- content-specific workarounds leaking into the engine.
