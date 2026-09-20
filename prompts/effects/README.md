# Audio effects prompts

These prompts are generator-agnostic and can be adapted to any tool that creates short audio effects from text. They deliberately describe one isolated sound per prompt.

## Generation strategy

- Generate one semantic effect per call.
- Request two or three variants for frequently repeated sounds.
- Prefer clean, dry source material; add spatial reverb at runtime or during editing only when a scene needs it.
- Reject any candidate containing speech, music, a recognizable melody, background noise, or unrelated events.
- Trim, fade, normalize, and export after generation.
- Test repeated playback and overlapping playback, not only a single isolated click.

## Semantic hierarchy

The player should learn meaning from timbre:

- soft wood/felt = touch and navigation;
- light organic sparkle = correct placement or completion;
- muted soft wobble = gentle rejection;
- warm layered chime = rescue/unlock;
- natural ambience = place identity;
- species-appropriate vocalization = animal identity.

## Runtime category

Every file in this section belongs to the `effects` category and effects mix channel. Environmental loops remain effects rather than music.

