# Naming and integration

## Runtime categories

Use exactly:

```text
music
effects
voice
```

Suggested authored asset layout:

```text
content/<pack-id>/assets/audio/
  shared/
    music/
      global/
      locations/
      shelter/
    effects/
      ui/
      interactions/
      progress/
      ambience/
      animals/
  voice/
    hu/
    en/
```

Music and effects are language-neutral and belong under `assets/audio/shared/`. Localized narration
belongs under the matching `assets/audio/voice/hu/` or `assets/audio/voice/en/` tree and must never be
stored in `shared/`. An authored candidate's pack-relative source path begins with `assets/audio/`.
The R2 object key stored in a runtime manifest is the path relative to `content/<pack-id>/assets/`, so
it begins with `audio/`; neither form includes a repository-relative `content/<pack-id>/` prefix.
Repository tooling downloads that key from R2, verifies it against the versioned inventory, and
materializes it under the corresponding ignored local asset tree before build. The browser consumes
the packaged local result and never fetches the R2 object directly.

## IDs

Use semantic dot-separated runtime IDs and lower-kebab filenames.

```text
music.location.garden.ambient
music.location.garden.mission
effects.ui.confirm
effects.interaction.drag-snap
effects.ambience.pond
effects.animal.mimi-kitten.greet
```

Examples:

```text
assets/audio/shared/music/locations/garden-ambient.ogg
assets/audio/shared/music/locations/garden-mission.ogg
assets/audio/shared/effects/ui/confirm-01.ogg
assets/audio/shared/effects/interactions/wipe-stroke-02.ogg
assets/audio/shared/effects/animals/mimi-kitten-greet-01.ogg
assets/audio/voice/hu/missions/garden-kitten-tree/intro.ogg
assets/audio/voice/en/missions/garden-kitten-tree/intro.ogg
audio/voice/hu/missions/garden-kitten-tree/intro.ogg  # R2 object key
```

## Master and runtime formats

- Keep edited masters as lossless WAV, 48 kHz, 24-bit where the toolchain permits.
- Encode runtime music and long ambience in the project's chosen compressed format.
- Encode short effects consistently and verify low-latency playback on target browsers.
- Keep UI/object effects mono unless stereo movement materially communicates direction.
- Keep environmental ambience and music stereo.
- Trim accidental leading silence from one-shot effects.
- Avoid normalizing every sound to identical loudness; preserve a deliberate mix hierarchy.

## Duration targets

| Asset                       |      Target |
| --------------------------- | ----------: |
| button/tap confirmation     | 0.10–0.45 s |
| object movement/placement   | 0.20–0.90 s |
| interaction completion      | 0.50–1.50 s |
| rescue/unlock cue           | 1.50–4.00 s |
| environmental ambience loop |     20–60 s |
| final music loop            |    45–120 s |

## Variants

Create two or three subtle variants for frequently repeated effects such as taps, wipe strokes, footsteps, chirps, and soft placement sounds. Variation changes micro-timing, pitch, or texture slightly without changing perceived meaning.

## Mixing intent

- Voice has priority and ducks music.
- Effects remain audible beneath voice but do not mask consonants.
- Environmental ambience sits below music and may be thinned during narration.
- Gentle rejection cues are quieter and less bright than success cues.
- Repeated effects use a short concurrency limit to prevent stacking into noise.
