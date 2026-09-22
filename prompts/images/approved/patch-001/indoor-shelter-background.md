# Indoor shelter background — approved source prompt

- Asset ID: `indoor-shelter-background`
- Consumer: Indoor Room shelter area
- R2 object key: `images/shelter/indoor-room.png`
- Local working copy: `content/base/assets/images/shelter/indoor-room.png` (Git-ignored)
- Generation date: 2026-09-23
- Dimensions: 1448×1086 PNG, opaque 4:3 background
- References: approved Start background and `screens/03-shelter-screen-en.png`; style and broad
  environment only
- Classification: production-safe shelter background
- Provenance/license: generated for this project; project-owned output approved for Tiny Rescue
- Full-size visual QA: approved for PATCH-001; four unobstructed resident zones and quiet UI regions;
  no baked text, pseudo-writing, logo, signature, or watermark
- Known defects: none observed

## Final prompt

```text
Use case: illustration-story
Asset type: Tiny Rescue shelter-area background, production candidate
Shelter area ID: indoor-room
Input images: supplied start background and shelter concept are visual-style and broad environment
references only. Do not copy any UI, text, animals, labels, signs, icons, counters, or branding.
Primary request: create a cozy welcoming indoor rescue shelter background where four small rescued
residents can be displayed and tapped comfortably.
Environment: warm rounded timber beams, cream plaster walls, a large open window toward a sunny
flower garden, soft woven rugs, four distinct child-friendly rest zones: round green bed at left,
soft blue bed center-left, pink cushion center-right, and pale-blue bed beside a small rounded wooden
animal house at right; clean tactile baskets, scratching post, simple unmarked balls, houseplants.
Composition: exact 4:3 landscape, intended 1024x768 design surface. Background only. Four distinct
non-overlapping resident zones. Keep top-center, upper-left, upper-right, and lower-right runtime UI
regions visually quiet. Empty zones must look natural, never locked.
Style/medium: apply the Tiny Rescue visual style lock.
Constraints: no animals, residents, people, UI, text, letters, numbers, words, pseudo-writing, title,
labels, counters, buttons, locked silhouettes, signs containing marks, logo, signature, brand mark,
or watermark. No duplicated furniture, obstructed resident zones, sharp hazards, mess, food
obligation cues, illness cues, visual clutter, excessive blur, or cropped focal beds.
```
