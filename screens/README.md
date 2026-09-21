# Presentation screen references

The PNG files in this directory are presentation-only concept references. They communicate warmth,
material, color, character appeal, broad hierarchy, and 4:3 composition. They are not production
backgrounds, UI specifications, localization sources, or pixel-accurate implementation targets.

## Binding sources

When a concept conflicts with the repository, follow the accepted ADRs, product specifications,
content catalog, and runtime localization rules. Produce new assets through the
[asset prompt pack](../prompts/README.md#visual-prompts) and the repo-local Tiny Rescue visual-production
skill, then run its full-size visual QA.

## Known non-normative elements

These concepts intentionally contain pitch-style baked UI and therefore must never ship as scene
assets:

- titles, button labels, signs, slogans, counters, numbers, and other English text;
- a numeric rescue counter and numbered mission progress, both forbidden as the child's progress
  language;
- a mission title/instruction panel and a three-step depiction that do not define the normative
  `garden-kitten-tree` contract;
- shelter counts/occupancy and resident combinations that do not match the 12-resident, three-area
  catalog;
- `Feed`, `Wash`, and similar concepts that must not imply hunger, dirt, decay, maintenance, or
  obligation; only finite, optional, content-approved reactions may exist;
- decorative signs and props whose text or placement would violate production safe zones.

Use the concepts for visual direction only. Runtime UI must be semantic DOM/SVG with localized HU/EN
text and audio, production scene art must be text-free, and interaction targets/paths must be authored
and tested independently of these images.

## Files

| File                       | Intended reference                                                 |
| -------------------------- | ------------------------------------------------------------------ |
| `01-start-screen-en.png`   | welcome mood, hero hierarchy, tactile controls                     |
| `02-map-screen-en.png`     | distinct location silhouettes and central shelter composition      |
| `03-shelter-screen-en.png` | cozy material language and readable resident zones                 |
| `04-mission-screen-en.png` | clear source/target staging and preschool-friendly visual guidance |
