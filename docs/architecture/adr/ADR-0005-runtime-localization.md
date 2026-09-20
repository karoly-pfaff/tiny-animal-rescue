# ADR-0005: Runtime localization with text-free art

- Status: Accepted
- Date: 2026-09-20

## Context

Generated concept art may invent attractive lettering, but baked text prevents reliable translation and often renders Hungarian characters incorrectly. The target audience also needs audio guidance more than written instructions.

## Decision

All player-facing text is rendered at runtime from semantic localization keys. All spoken content is locale-specific and referenced by the same semantic content structure. Authored/generated images contain no labels, letters, or pseudo-writing. Use self-hosted Baloo 2 for large playful labels and Nunito for supporting/adult-facing text.

## Rationale

This keeps HU and EN equivalent, allows layout testing, supports later locales, and prevents art regeneration for wording changes.

## Consequences

- Blank sign/button surfaces are separate assets or layout elements.
- Asset review includes detection of accidental glyph-like marks.
- Font licensing files and glyph coverage are part of the build.
- Localized audio parity is a release gate.

## Rejected alternatives

- **Separate localized background images:** multiplies assets and creates drift.
- **English text baked into art with translated subtitles:** breaks child-facing coherence and accessibility.
- **System fonts only:** reduces asset weight but does not achieve the intended warm visual identity consistently.

