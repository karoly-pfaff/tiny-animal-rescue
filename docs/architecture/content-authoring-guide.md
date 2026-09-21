# Content authoring guide

## When this guide applies

Use this process and the repo-local `tiny-rescue-mission-authoring` skill for a mission, animal,
location, shelter area, or bundled future content pack that uses existing contracts. If the idea needs
a new interaction primitive or executable behavior, stop and request an engine decision instead.

## Add a Rescue mission

1. Choose a stable kebab-case mission ID and animal ID.
2. Confirm shelter capacity before producing assets.
3. Write a 2–4 step scene using only accepted primitives.
4. Give each step one visually dominant action and a semantic prompt key.
5. Declare the mission prerequisite and exactly one resident unlock reward.
6. Add the animal record with exactly one shelter area.
7. Add text-free visual assets and their metadata.
8. Add HU and EN strings and narration inventory entries.
9. Run schema, semantic, localization, ownership, capacity, and asset validation.
10. Add an integration fixture and update the normative catalog only when the user has approved a scope change.

## Add a Help mission

A Help mission reuses an unlocked resident and never unlocks a new one. It must depend on the resident's Rescue mission. The mission remains hidden until that dependency is satisfied.

## Add a World mission

A World mission improves a place or assists a non-resident subject. It may set an idempotent world flag but does not add shelter residents.

## Step selection guide

| Story action                                          | Primitive      |
| ----------------------------------------------------- | -------------- |
| move obstacles, press knots, free a covered subject   | tap/remove     |
| carry ladder, nest material, water, animal, or object | drag-to-target |
| clean mud, dust, or leaves over a broad area          | wipe/clean     |
| pair an animal/item with an obvious destination       | match          |
| guide an animal or water along a safe route           | trace          |

If the story cannot fit this table without becoming confusing, change the story rather than adding one-off logic.

## Scene checklist

- The animal's problem is understandable before narration finishes.
- Source and target are fully visible and comfortably separated.
- Required drag/trace paths do not pass under navigation controls.
- Decorative layers do not cover hit regions.
- Color is reinforced by shape, position, icon, or animation.
- The success state is visually different and emotionally clear.
- The scene contains no letters, labels, or pseudo-writing.

## Visual asset workflow

Use the repo-local `tiny-rescue-visual-production` skill and
the [asset prompt pack](../../prompts/README.md#visual-prompts) for generated or edited visuals.

1. Classify the output as production asset, presentation mockup, or localization edit.
2. Choose one matching template, compose it with the shared style lock and relevant negative
   constraints, and state dimensions, transparency, safe zones, intended consumer, and interaction
   role.
3. Generate distinct assets separately; a scene background, resident cutout, and interactive prop are
   not variants of one deliverable.
4. Inspect the full-size result for text/pseudo-writing, anatomy, duplicates, clipping, transparency,
   safe zones, interaction clarity, and style drift.
5. Store the approved prompt, generation/edit date, tool/model when known, input/reference filenames,
   dimensions/transparency expectation, production-safe or presentation-only classification, visual
   QA result, known defects, and provenance/license status.

Presentation mockups may contain exact runtime-copy examples but never become shippable backgrounds.
The concept PNGs under `screens/` are classified in [`screens/README.md`](../../screens/README.md) and
remain non-normative when they conflict with product rules or the content catalog.

## Music and effects workflow

Use the [asset prompt pack](../../prompts/README.md#music-and-effects-prompts) for generated music and effects.
Choose a semantic runtime ID from the [audio catalog](../../prompts/catalog.md), compose the selected
prompt with its style lock and negative constraints, and follow the
[integration rules](../../prompts/integration.md) for names, formats, duration, loops, variants, and
mix hierarchy.

Generate multiple candidates, then edit, trim, loop, normalize, and test repeated/overlapping playback;
generator output is not a final runtime asset. Each accepted asset records runtime ID, final source
prompt, generator/tool and date when known, source/reference files, edit/mastering history, duration
and format, QA result, provenance/license, and the exported pack-owned path. Music, effects, and voice
remain separate runtime categories and channels.

## Localization checklist

- Names and prompts use keys, not inline text.
- HU and EN keys are added together.
- Spoken lines are short, warm, direct, and avoid multi-step instructions.
- The prompt describes only the active action.
- The success line names the animal where appropriate.
- Audio filenames/metadata map to semantic keys rather than translated sentence text.

## Pack checklist

- Manifest contract version is supported.
- Dependencies are explicit and acyclic.
- IDs are unique in the assembled registry.
- Assets are pack-owned or come from declared dependencies.
- Added residents have declared shelter capacity.
- No scripts, expressions, dynamic imports, or pack-specific components are present.
- Every approved visual asset has its prompt/provenance/QA record and correct production-safe or
  presentation-only classification.

## Review request template

```text
Review <content ID> against the Tiny Rescue contracts.
Verify step count and interaction types, age-appropriate discoverability,
prerequisites and idempotent rewards, shelter capacity, HU/EN parity,
asset ownership, text-free art, and required automated tests.
Report contract violations separately from optional polish suggestions.
```
