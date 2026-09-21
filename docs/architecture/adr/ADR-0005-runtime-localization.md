# ADR-0005: Runtime localization with text-free art

- Status: Accepted
- Date: 2026-09-20

## Context

Generated concept art may invent attractive lettering, but baked text prevents reliable translation and often renders Hungarian characters incorrectly. The target audience also needs audio guidance more than written instructions.

## Decision

All player-facing text is rendered at runtime from semantic localization keys. All spoken content is locale-specific and referenced by the same semantic content structure. Production and production-candidate images contain no labels, letters, or pseudo-writing. Use self-hosted Baloo 2 for large playful labels and Nunito for supporting/adult-facing text.

Presentation-only UI references may depict exact HU or EN runtime copy solely to communicate layout,
hierarchy, and visual direction. They are never production candidates, localization authorities, or
content-resolvable assets. Their classification must be explicit and mechanically excluded from the
production asset inventory.

## Rationale

This keeps HU and EN equivalent, allows layout testing, supports later locales, and prevents art regeneration for wording changes.

## Consequences

- Blank sign/button surfaces are separate assets or layout elements.
- Asset review includes detection of accidental glyph-like marks.
- Font licensing files and glyph coverage are part of the build.
- Localized audio parity is a release gate.
- Presentation references with baked copy require presentation-only classification and may not be
  promoted or copied into production backgrounds.

## Rejected alternatives

- **Separate localized background images:** multiplies assets and creates drift.
- **English text baked into art with translated subtitles:** breaks child-facing coherence and accessibility.
- **System fonts only:** reduces asset weight but does not achieve the intended warm visual identity consistently.

## Clarification history

- **2026-09-21:** clarified that the text-free image rule governs production and production-candidate
  assets. Explicitly presentation-only UI references may depict exact runtime copy but remain outside
  content resolution and localization authority.
