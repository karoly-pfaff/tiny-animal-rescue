# Resident character template

```text
Use case: stylized-concept
Asset type: Tiny Rescue resident character <CANONICAL | IDLE | HAPPY | SLEEPING | REACTION> pose
Classification: production candidate
Animal ID: <ANIMAL-ID>

Subject:
<NAME>, a <SPECIES>, with <STABLE COLOR/PATTERN/FEATURES>.

Pose and expression:
<FULL-BODY POSE, VIEW ANGLE, GAZE, EMOTION, REQUIRED ACTION>

Identity invariants:
<MARKINGS, EYE COLOR, EAR/TAIL SHAPE, PROPORTIONS, ACCESSORIES IF CANONICAL>

Style:
Apply the Tiny Rescue visual style lock. Match the approved identity reference
without importing its background, text, lighting artifacts, or pose unless requested.

Composition:
Square high-resolution image. Entire character visible with generous transparent
padding and a consistent approximate scale across resident assets.

Technical requirements:
Genuinely transparent background and clean alpha edges suitable for compositing.

Constraints:
Apply the global and character-cutout negative constraints. Preserve identity;
do not add accessories or alter markings.
```
