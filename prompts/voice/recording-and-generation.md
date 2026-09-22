# Recording and generation guide

## Audition before batch production

Generate or record these representative lines first:

1. welcome line;
2. one location name;
3. a mission intro;
4. a drag prompt;
5. a stronger hint;
6. a success line;
7. a parent reset confirmation.

Approve voice identity, pronunciation, pace, warmth, consonant clarity, and emotional range before producing the remaining inventory.

## Source capture

- Record or generate clean mono voice without music, effects, ambience, or reverb.
- Keep the narrator at consistent distance and tone across sessions.
- Preserve a lossless master, preferably WAV at 48 kHz and 24-bit where supported.
- Avoid aggressive noise reduction, compression, de-essing, or pitch processing.
- Retain a short natural pre-roll and tail during editing, then trim consistently.
- Reject any take containing an audible watermark, generator tag, spoken brand or service name,
  promotional tag, sonic signature, or automated-authorship credit; do not try to mask or edit it out.

## File preparation

- Remove clicks, breaths that distract, accidental mouth noise, and excessive silence.
- Keep natural breaths when removing them makes a phrase sound artificial.
- Add short fades to prevent boundary clicks.
- Keep voice loudness consistent by perceived level, not only peak normalization.
- Avoid limiting that makes plosives or Hungarian consonants harsh.
- Export runtime files only after final QA.

## Filename mapping

Convert semantic dots to directories or stable kebab filenames. Example:

```text
voice.mission.garden-kitten-tree.step.place-ladder

audio/voice/hu/missions/garden-kitten-tree/step-place-ladder.ogg
audio/voice/en/missions/garden-kitten-tree/step-place-ladder.ogg
```

## Runtime behavior

- Stop or replace prior narration before starting a new line.
- Duck music before the first word and recover after the tail.
- Pause hint timers while a line is playing.
- The Repeat action replays the same semantic ID.
- Do not layer two narrators or narration variants.
- Cache the active locale but resolve every line through locale-aware assets.

## Storage boundary

Do not commit WAV, OGG, MP3, or other voice media to Git. Keep lossless masters in the approved
production store and upload approved runtime OGG files to R2. Before build, repository tooling
downloads the declared object, verifies its immutable digest and media metadata, and materializes it
under the ignored `content/<pack-id>/assets/` tree. Repository manifests store object keys relative to
that tree, for example `audio/voice/hu/missions/garden-kitten-tree/step-place-ladder.ogg`. The browser
resolves the packaged local file and never fetches R2 directly.
