# Shelter area template

```text
Use case: illustration-story
Asset type: Tiny Rescue shelter-area background
Classification: production candidate
Shelter area ID: <AREA-ID>

Primary request:
Create a welcoming <INDOOR ROOM | GARDEN | PONDSIDE> environment where four
rescued residents can be displayed and tapped comfortably.

Environment:
<MATERIALS, FURNITURE/NATURAL FEATURES, TIME OF DAY, AREA IDENTITY>

Resident zones:
- zone 1: <POSITION AND SURFACE>
- zone 2: <POSITION AND SURFACE>
- zone 3: <POSITION AND SURFACE>
- zone 4: <POSITION AND SURFACE>

Style:
Apply the Tiny Rescue visual style lock.

Composition:
Landscape 4:3, 1024×768 design surface. Four distinct non-overlapping resident
zones with readable silhouettes and enough open space for idle animations.
Keep left/right navigation and the top area-name region quiet. Empty zones must
look like natural environment, never locked slots.

Technical requirements:
Background only; residents and runtime UI will be composited separately.

Constraints:
No residents, UI, text, labels, numbers, locked silhouettes, watermark, or visual
obstacle over a resident zone. Apply global and production-scene constraints.
```
