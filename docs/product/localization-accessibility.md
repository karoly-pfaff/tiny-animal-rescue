# Localization, accessibility, and child safety

## Localization model

Hungarian and English are first-class locales from the first vertical slice. Content references semantic keys; no player-facing string is embedded in TypeScript, JSON descriptions, or image assets.

```text
ui.play
ui.map
ui.shelter
location.forest.name
animal.mimi-kitten.name
mission.garden-kitten-tree.intro
mission.garden-kitten-tree.step.place-ladder
mission.garden-kitten-tree.success
```

Narration files use the same semantic key and locale-specific asset resolution.

## Typography

- Baloo 2 ExtraBold for titles and large child-facing labels
- Nunito SemiBold/Bold for settings, supporting labels, and longer adult-facing text
- both fonts must be self-hosted and subset only after Hungarian `ő` and `ű` coverage is verified
- no important label relies on an all-caps treatment
- buttons size to content; translations are never forced into fixed-width art

## Asset policy

- backgrounds, signs, buttons, and props contain no words or pseudo-writing;
- labels and titles are separate runtime layers;
- image-generation prompts must explicitly request blank signs and no lettering;
- visual QA rejects incidental generated glyphs that look like text;
- voice is stored per locale, while language-neutral effects and music are shared.

## Audio-first, not audio-only

Every instruction combines at least two signals:

- spoken prompt
- target motion or pulse
- ghost-hand demonstration
- spatial composition
- shape/icon cue

Muted play remains possible. Color alone never identifies the correct answer.

## Motor accessibility

- target areas are larger than their visual bounds where helpful;
- drag targets accept generous overlap, not pixel-perfect placement;
- wipe completion requires broad coverage rather than full cleaning;
- trace corridors are wide and preserve partial progress;
- active elements do not move away from the pointer;
- interaction time is unlimited.

## Sensory safety

- no rapid flashing;
- celebrations avoid full-screen high-frequency motion;
- music and effect levels can be controlled separately in parent settings;
- narration ducks background audio;
- transitions use restrained motion and respect reduced-motion preferences where available;
- surprise sounds have bounded volume relative to narration.

## Privacy and child safety

v1.0 collects no personal data, creates no account, includes no chat, advertising, analytics, location use, camera, microphone, or user-generated content. Progress remains on the device.

External navigation, reset progress, legal information, and credits live behind a parent gate. The child flow contains no purchase prompt or external link.

## Localization release checks

- key parity between HU and EN
- no fallback key visible in production
- all mission voice prompts present in both locales
- text overflow checks at every supported viewport
- font glyph coverage for Hungarian accented characters
- audio duration does not block input and can be replayed cleanly
- screenshots reviewed in both languages
