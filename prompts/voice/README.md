# Tiny Rescue voice prompt pack

Version: 0.1.0

This voice branch of the Tiny Rescue asset prompt pack defines the complete bilingual narration
baseline. It separates spoken narration from music and audio effects, keeps Hungarian and English
feature-equivalent, and provides machine-readable scripts for all 16 base missions.

## Recommended voice model

Use one native narrator per locale:

- Hungarian narrator: warm native Hungarian adult woman
- English narrator: warm native English adult woman with a neutral international accent

The two voices should match in emotional character rather than imitate one another exactly. Animals do not speak human language; their non-verbal reactions belong to the `effects` category.

## Contents

```text
localization/
  writing-rules.md
  terminology.md
catalog.md
canonical-ids.json
line-generation-template.md
manifest.example.json
narrator-brief.md
pronunciation-guide.md
recording-and-generation.md
release-checklist.md
scripts/
  voice-lines.hu.json
  voice-lines.en.json
schemas/
  voice-lines.schema.json
```

## Inventory

`canonical-ids.json` is the machine-authoritative voice ID and ordering contract derived from the
normative v1 content catalog. The two localized JSON inventories must match it exactly and use
identical semantic IDs, groups, ordering, and delivery energy. They cover:

- global navigation and progress;
- four map locations and three shelter areas;
- reusable guidance for all five interaction primitives;
- names of all 12 shelter residents;
- intro, step prompts, and success lines for all 16 missions;
- minimal parent-facing confirmations.

Every canonical ID must derive one collision-free R2 object key per locale. Changing this contract is
a product/content change, not a way to make a failing inventory pass.

## Production flow

1. Approve the narrator voice using the shared brief and locale prompt.
2. Generate or record a small audition set before producing the whole inventory.
3. Lock pronunciation, pacing, and filename rules.
4. Produce each semantic ID in both locales.
5. Trim and master voice independently from music and effects.
6. Validate key parity, duration, pronunciation, clipping, silence, and runtime mapping.

Generated recordings are production media: keep them outside Git and upload approved runtime files to
R2 under the canonical keys in `manifest.example.json`. The repository keeps only prompts,
inventories, manifests, QA status, and provenance records.

## Runtime principle

Only one voice line plays at a time. New narration replaces previous narration cleanly, music ducks under voice, and effects remain below intelligibility-critical speech.

## Clean-output rule

No recording or derivative may contain an audible watermark, generator tag, spoken brand or service
name, promotional tag, sonic signature, or automated-authorship credit. Required legal and provenance
details belong only in non-player-facing records.
