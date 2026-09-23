# Voice release checklist

## Inventory

- [ ] HU and EN semantic ID sets are identical.
- [ ] Both locales match `canonical-ids.json` exactly and in order.
- [ ] Every required ID resolves to exactly one file per locale.
- [ ] Derived R2 object keys are collision-free within each locale.
- [ ] No animal-language dialogue was introduced outside the approved narrator model.
- [ ] No temporary or machine-placeholder line remains.
- [ ] Manifest paths exist and use the `voice` category.
- [ ] Ownership, narrator role, duration bounds, and honest license/provenance/audio QA statuses are
      recorded.

## Language

- [ ] Native Hungarian review completed.
- [ ] Native English review completed.
- [ ] Resident names match the approved locale.
- [ ] Terminology matches `localization/terminology.md`.
- [ ] Instructions contain one active action.
- [ ] No urgency, failure, guilt, pity, or reading requirement appears.

## Performance

- [ ] Narrator identity is consistent across all batches.
- [ ] Pronunciation matches the approved audition reference.
- [ ] Step prompts are clear and generally under 2.5 seconds.
- [ ] Success is warm but not loud or theatrical.
- [ ] Parent confirmations are neutral and precise.
- [ ] No line contains unrequested additions or paraphrasing.
- [ ] Exact spoken text contains no generator/service preamble, promotional tag, or audible watermark.

## Audio

- [ ] Clean mono master retained.
- [ ] No music, effects, ambience, room reverb, clipping, click, or excessive noise.
- [ ] Leading/trailing silence and fades are consistent.
- [ ] Loudness is perceptually consistent.
- [ ] Plosives, sibilance, breaths, and Hungarian consonants remain natural.
- [ ] Runtime encoding was checked for artifacts.
- [ ] No audible watermark, generator tag, spoken brand or service name, promotional tag, sonic
      signature, or automated-authorship credit is present.
- [ ] No voice media binary is tracked in Git; approved runtime files are stored in R2, digest-verified,
      and materialized into the ignored local pack asset tree before the release build.
- [ ] The browser resolves the packaged local voice file and performs no direct R2 fetch.

## Runtime

- [ ] Starting a new line cleanly replaces the previous line.
- [ ] Music ducks before speech and recovers after it.
- [ ] Hint timers pause during narration.
- [ ] Repeat replays the same semantic ID.
- [ ] Locale change resolves subsequent voice from the new locale.
- [ ] Missing voice fails validation rather than silently using the wrong language.
