# Game design

## Player fantasy

“I am a kind animal rescuer. I know what to do, I can help, and my animal friends remember me.”

## Session shape

A typical session is 5–15 minutes:

1. start screen with one dominant Play action;
2. map showing available rescue cards;
3. one or more missions, each lasting roughly 1–3 minutes;
4. optional shelter visit;
5. safe exit at any time without losing completed progress.

## Screens

### Start

- logo and friendly rescue center scene
- primary Play button
- small, parent-oriented settings entry separated from the child flow
- no generated text baked into the art

### Map

- central shelter and four clearly differentiated locations
- available mission represented by an animal portrait and pulsing call marker
- completed missions remain replayable through each location
- locked future content is hidden, not shown as a frustrating padlock wall

### Mission

- one illustrated scene
- no permanent toolbar
- one active step at a time
- repeat-prompt button in a consistent corner
- home/back action protected against accidental taps
- progress communicated through scene changes, not a numeric meter

### Rescue celebration

- rescued animal becomes safe and happy
- 2–4 second celebration with name narration
- optional skip after the first complete viewing
- progress saved before navigation is offered

### Shelter

- three horizontally navigable areas with at most four residents each
- tap a resident to trigger name, sound, and a short happy animation
- optional contextual interactions such as pet or feed are finite, playful moments; they create no ongoing need

## Mission categories

| Category | Purpose | Unlocks a resident? | v1 count |
|---|---|---:|---:|
| Rescue | Introduce and save a named animal | Yes, exactly one | 12 |
| Help | Revisit an existing resident in a new small problem | No | 2 |
| World | Improve or repair the environment | No | 2 |

## Interaction primitives

### Tap/remove

The child taps one or more obvious obstacles. Targets should be at least 96 CSS px in their interactive dimension at the reference viewport unless the asset shape makes a larger invisible hit area necessary.

### Drag-to-target

The child drags a source object to a large compatible target. The object follows the finger with a small positional offset so it remains visible. Incorrect drops animate back.

### Wipe/clean

The child rubs over a mask. Progress is based on broad coverage, not precision. Completing roughly 65–75% should finish the step automatically.

### Match

The child pairs a visible source with one of a small number of targets. v1 uses at most three choices and avoids relying only on color.

### Trace

The child guides an animal or object along a broad corridor. The corridor tolerates deviation and never resets completely.

## Guidance ladder

1. Narrate the instruction and animate the relevant character.
2. After a short idle period, pulse the source or target.
3. Show a slow ghost-hand demonstration.
4. Increase target tolerance if appropriate.
5. Repeat until success; never auto-complete without an explicit product decision.

Exact timings belong in configuration and are verified with child playtesting. Initial defaults may be 4 seconds to pulse and 8 seconds to demonstrate.

## Input handling

- single-pointer interactions only in v1.0
- ignore incidental second touches during an active drag/wipe
- scrolling and browser gestures must not compete with the play surface
- large corner controls require a brief hold or confirmation where accidental navigation would lose an in-progress scene
- pause safely on backgrounding and restore the current mission step when possible

## Progression

- the first mission is always the kitten rescue in the Garden;
- after the first rescue, Forest and Farm become available;
- Pond unlocks after any three Rescue missions;
- missions within an unlocked location are revealed in a simple authored order;
- no star ratings or perfect scores;
- all 16 missions remain replayable after completion;
- completion state is local to the device in v1.0.

## Audio

- voice carries instructions and emotional response;
- effects confirm touch, movement, placement, and completion;
- music is calm, loopable, and automatically ducked under narration;
- replaying a prompt stops or replaces the prior prompt cleanly;
- audio may be muted, but visual guidance must still make the game playable.

## Failure and recovery

There is no failure state. If the child performs an irrelevant action:

- acknowledge the touch softly when useful;
- do not play harsh error sounds;
- return draggable objects to their origin;
- preserve partial wipe and trace progress;
- escalate guidance after hesitation or repeated incorrect attempts.

## Parent boundary

Settings, reset progress, credits, and external links are parent-facing. Entry uses a simple adult gate that does not collect personal information. External links do not appear in the child flow.

