# Tiny Rescue asset prompt pack

Version: 0.1.0

This pack is the single entry point for generating or editing Tiny Rescue visual, music, and effect
assets. It combines reusable style locks, negative constraints, asset-specific templates, runtime-ID
routing, and provenance requirements so separately produced assets still belong to one product.

Generated output is source material, not automatically a production asset. A candidate becomes
shippable only after the required editing, full-size or repeated-playback QA, ownership and runtime
registration, and provenance/license review.

## Contents

```text
images/
  style-lock.md
  negative-constraints.md
  screen-concept.template.md
  mission-scene.template.md
  shelter-area.template.md
  resident-character.template.md
  interactive-prop.template.md
  localization-edit.template.md
  examples/
music/
  README.md
  style-lock.md
  negative-constraints.md
  suno-template.md
  global/
  locations/
  shelter/
effects/
  README.md
  style-lock.md
  prompt-template.md
  ui-navigation.md
  interaction-primitives.md
  rescue-rewards.md
  environmental-loops.md
  animal-vocalizations.md
  manifest.example.json
integration.md
catalog.md
```

## Visual prompts

Use the `images/` branch with the repo-local `tiny-rescue-visual-production` skill. A complete visual
prompt is assembled from:

1. one asset template;
2. `images/style-lock.md`;
3. the applicable clauses from `images/negative-constraints.md`;
4. concrete scene, character, or content details;
5. exact dimensions, transparency, safe zones, intended consumer, and file role.

Choose the template that matches the deliverable:

| Asset | Template |
|---|---|
| Pitch/UI concept | `images/screen-concept.template.md` |
| Mission scene | `images/mission-scene.template.md` |
| Shelter area | `images/shelter-area.template.md` |
| Resident character/pose | `images/resident-character.template.md` |
| Interactive prop | `images/interactive-prop.template.md` |
| Translate an existing mockup | `images/localization-edit.template.md` |

Production art contains no baked UI, words, letters, numbers, or pseudo-writing. Presentation
mockups may contain exact runtime-copy examples but are never used as production backgrounds.
Localization edits preserve a presentation mockup and change only the enumerated copy. Every saved
prompt states which role applies.

An approved visual record includes asset ID and role, final prompt, generation/edit date and
tool/model when available, input/reference filenames, dimensions and transparency expectation,
production-safe or presentation-only classification, full-size human QA and known defects, and
provenance/license status.

## Music and effects prompts

The audio goal is one coherent sound world: warm, gentle, organic, repeatable, and supportive of a
3–4-year-old player's attention without urgency or sensory overload.

## Music coverage

- Start screen
- Rescue map
- Garden
- Forest
- Farm
- Pond
- Indoor shelter room
- Shelter garden
- Shelter pondside
- Rescue-complete celebration cue

Each gameplay location contains a calm base ambience and a slightly more focused mission variation. Both remain non-urgent and instrumental.

## Effects coverage

- UI and navigation
- Tap, drag, wipe, match, and trace interactions
- Step completion, rescue, unlock, and shelter arrival
- Environmental ambience loops
- Vocal and movement reactions for all 12 base residents

## Music and effects workflow

1. Read the branch-specific [music generation and loop QA](music/README.md) or
   [effect generation and overlap QA](effects/README.md).
2. Start with the relevant shared style lock.
3. Use the exact location or effect prompt as the generation input.
4. Generate several candidates rather than trying to repair one unsuitable result indefinitely.
5. Select by emotional fit and repeatability, not by isolated spectacle.
6. Edit, trim, loop, normalize, and export outside the generator.
7. Save language-neutral music and effects under the declaring pack's
   `assets/audio/shared/music/` or `assets/audio/shared/effects/` tree, following the
   [naming and integration guide](integration.md).
8. Record the approval evidence below.

See [the catalog](catalog.md) for the full music and effect runtime-ID index.

An approved music/effect record includes:

- semantic runtime ID and category/channel;
- final source prompt and source/reference inputs;
- generator/tool and generation date when known;
- edit, trim, loop, normalization, and mastering history;
- runtime duration and format;
- music loop/repetition QA or effect repetition/overlap/concurrency QA as applicable;
- exported pack-relative `assets/audio/shared/...` path;
- QA disposition, known defects, and provenance/license.

## Important production distinction

Music, effects, and voice are separate runtime categories and mix channels. Do not merge narration, animal vocalizations, or interaction confirmation into a music master.

## Shared approval rule

Every approved generated or edited asset records the evidence required by its section above. The
repository validators treat a missing record, unresolved license, placeholder, wrong pack-relative
path, or presentation-only visual referenced by production content as a release failure.
