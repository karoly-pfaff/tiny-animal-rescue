---
name: tiny-rescue-visual-production
description: Plan, prompt, generate, edit, and review Tiny Rescue visual assets and presentation mockups while preserving the project's art direction, text-free production policy, interaction clarity, and asset ownership. Use for game art and image-localization work, not for code-native diagrams or ordinary UI implementation.
---

# Tiny Rescue Visual Production

Create consistent visuals from reusable art direction rather than inventing a new style in every prompt.

## Load the relevant source material

Locate the Tiny Rescue project root. Read:

1. `AGENTS.md`
2. `prompts/README.md`
3. `docs/product/screen-specifications.md`
4. `docs/product/localization-accessibility.md`
5. ADR-0005
6. `prompts/images/style-lock.md`
7. `prompts/images/negative-constraints.md`

Then read only the prompt template matching the requested asset. Use [references/asset-routing.md](references/asset-routing.md) to choose it.

## Separate production art from presentation mockups

**Production assets** contain no UI text, labels, letters, numbers, logos, watermarks, or pseudo-writing. Runtime UI provides all player-facing text and controls.

**Presentation mockups** may show exact HU or EN runtime UI copy to demonstrate the intended
application. Never treat a mockup with baked text as a shippable scene background, localization
source, or production candidate.

**Localization edits** change only text. State every invariant explicitly and preserve composition, characters, controls, palette, materials, lighting, and dimensions.

## Workflow

1. Classify the asset: screen concept, mission scene, shelter area, resident, interactive prop, or localization edit.
2. Record the asset's intended consumer, aspect ratio, design dimensions, transparency, safe zones, and interaction role.
3. Compose the chosen template with the shared style lock and only the relevant negative constraints.
4. For an edit, identify each input as edit target, style reference, or supporting insert; list the exact permitted change.
5. Generate one distinct call per distinct asset. Do not use variants as a substitute for different prompts.
6. Inspect the result at full size for text, anatomy, duplicated objects, edge clipping, perspective, safe zones, interaction clarity, and style drift.
7. Iterate with one targeted correction at a time.
8. Save approved project assets with stable descriptive filenames and record their prompt and provenance.

Before approval, use [references/visual-qa.md](references/visual-qa.md).

## Invariants

- Preserve a 4:3, 1024×768 design surface for game screens unless the request explicitly targets another deliverable.
- Keep required sources, targets, and paths visually unobstructed.
- Use large readable silhouettes and preschool-safe expressions.
- Do not add characters, props, labels, branding, or narrative events not requested.
- Do not generate UI into production backgrounds.
- Character and prop cutouts require genuine transparency and generous padding.
- Reusable props have no ground, stand, pedestal, scene, or cast shadow unless the consuming scene specifically requires one.
- Exact copy in presentation images must be quoted verbatim in the prompt and inspected afterward.

## Deliverable

Report the asset type, output path, final prompt or prompt file, whether the result is production-safe or presentation-only, and any unresolved visual defect.
