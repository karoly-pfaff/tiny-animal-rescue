# Bilingual voice writing rules

## Shared rules

- One active action per line.
- Exact spoken text contains no brand, service name, generator tag, promotional credit, sonic
  signature, or audible watermark; those details belong only in non-player-facing provenance records.
- Use concrete verbs: tap, drag, wipe, find, follow, put.
- Name the animal when it improves emotional connection.
- Keep the object before the destination when possible.
- Prefer positive direction over describing what not to do.
- Do not explain controls, gestures, or system concepts abstractly.
- Do not require reading or mention button labels.
- Avoid urgency, danger, guilt, pity, performance, and failure language.
- Success recognizes that the animal or place is safe, clean, found, or ready.

## Hungarian

- Use direct singular second person naturally, without formal address.
- Prefer short imperative forms that remain friendly: `Húzd`, `Koppints`, `Töröld le`, `Kövesd`.
- Avoid stiff literal translations from English.
- Keep articles where natural; clarity matters more than minimum word count.
- Use `Segítsünk neki!` for shared invitation, not `Mentsd meg gyorsan!`.
- Avoid repeated diminutives in every sentence.

## English

- Use globally understandable vocabulary and neutral natural phrasing.
- Prefer `tap` over `click` and `drag` over `move with the mouse`.
- Keep phrasal verbs simple.
- Use contractions sparingly; narration should remain easy to parse.
- Do not imitate baby speech.

## Hint escalation

First hint repeats the action gently. Stronger hint identifies source and destination more explicitly but never becomes louder, negative, or impatient.

Example:

```text
HU primary: Húzd a létrát a fához!
HU hint: Fogd meg a létrát!
HU stronger: Húzd a létrát a világító helyre!

EN primary: Drag the ladder to the tree!
EN hint: Pick up the ladder!
EN stronger: Drag the ladder to the glowing place!
```
